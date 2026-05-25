import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';

function extractBodyText(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" || payload.mimeType === "text/html") {
    if (payload.body && payload.body.data) {
      return Buffer.from(payload.body.data, 'base64url').toString('utf8');
    }
  }
  let text = "";
  if (payload.parts) {
    for (const part of payload.parts) {
      text += extractBodyText(part) + "\n";
    }
  }
  return text;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providerToken = session.provider_token;
  if (!providerToken) {
    return NextResponse.json({ 
      error: 'No Google access token found. You may need to log out and log back in to refresh it.' 
    }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ 
      error: 'GEMINI_API_KEY is not set in your .env.local file. Please add it to use AI receipt parsing.' 
    }, { status: 500 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: providerToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Search specifically for known MTG vendors to avoid junk receipts
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: '{from:sales@tcgplayer.com from:support@cardkingdom.com from:store+40485486757@t.shopifyemail.com from:will@boardwalk-games.com from:info@flipsidegaming.com} newer_than:30d',
      maxResults: 10
    });

    const messages = res.data.messages || [];
    let processedCount = 0;

    for (const msg of messages) {
      if (!msg.id) continue;
      
      const fullMsg = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      const headers = fullMsg.data.payload?.headers;
      const subject = headers?.find(h => h.name === 'Subject')?.value || 'Unknown Order';
      const from = headers?.find(h => h.name === 'From')?.value || 'Unknown Vendor';
      
      const vendor = from.toLowerCase().includes('tcgplayer') ? 'TCGPlayer' : 
                     from.toLowerCase().includes('cardkingdom') ? 'Card Kingdom' : 
                     from.toLowerCase().includes('boardwalk') ? 'Boardwalk Games' : 
                     from.toLowerCase().includes('flipside') ? 'Flipside Gaming' : 'Unknown Vendor';
      
      const dateReceived = new Date(Number(fullMsg.data.internalDate)).toISOString();
      const emailText = extractBodyText(fullMsg.data.payload);

      // Skip if body is empty
      if (!emailText.trim()) continue;

      const prompt = `
Extract all purchased Magic: The Gathering cards and sealed products from this receipt email.
Return the result as a raw JSON array of objects with the following keys exactly:
- card_name (string)
- set_code (string, use 'UNK' if unknown)
- condition (string, 'NM', 'LP', 'MP', 'HP' or 'NM' if unknown)
- quantity (integer)
- purchase_price (number, the cost per individual item, not the total)

If no cards are found, return an empty array [].
Do NOT wrap the response in markdown blocks like \`\`\`json. Return ONLY valid JSON.

Email Body:
${emailText.substring(0, 30000)}
`;

      let aiResponseText = "[]";
      
      const modelsToTry = [
        'gemini-1.5-flash', 
        'gemini-1.5-flash-latest', 
        'gemini-1.5-pro', 
        'gemini-2.0-flash', 
        'gemini-1.0-pro'
      ];
      
      let success = false;
      for (const modelName of modelsToTry) {
        if (success) break;
        
        let retries = 2;
        while (retries > 0) {
          try {
            const aiResponse = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
            });
            aiResponseText = aiResponse.text || "[]";
            success = true;
            break; // Success, exit retry loop
          } catch (apiError: any) {
            // If it's a 404 (Not Found) or 429 with limit 0, break to try the next model
            if (apiError?.status === 404 || (apiError?.status === 429 && apiError.message?.includes('limit: 0'))) {
              console.warn(`Model ${modelName} not available or quota limit 0. Trying next model...`);
              break; 
            }
            
            // If it's a 429 Rate Limit (but not limit 0) or 503 Overloaded, wait and retry
            if ((apiError?.status === 503 || apiError?.status === 429) && retries > 1) {
              console.warn(`Gemini API overloaded/rate-limited on ${modelName}, retrying in 4 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 4000));
              retries--;
            } else {
              // If we run out of retries for this model, break to try next model
              break;
            }
          }
        }
      }

      if (!success) {
        throw new Error("All Gemini models failed due to quota restrictions or overload. Please wait a minute and try again.");
      }

      let parsedItems = [];
      try {
        parsedItems = JSON.parse(aiResponseText);
      } catch (parseErr) {
        console.error("Failed to parse Gemini output as JSON", aiResponseText);
        continue;
      }

      if (parsedItems.length === 0) continue;

      // Insert all individual items
      const insertData = parsedItems.map((item: any) => ({
        user_id: session.user.id,
        vendor: vendor,
        date_received: dateReceived,
        card_name: item.card_name || 'Unknown Item',
        set_code: item.set_code || 'UNK',
        condition: item.condition || 'NM',
        quantity: item.quantity || 1,
        purchase_price: item.purchase_price || 0.00,
        status: 'Draft'
      }));

      const { error } = await supabase.from('receipt_queue').insert(insertData);
      if (!error) processedCount += parsedItems.length;

      // SLEEP 4 SECONDS BETWEEN EMAILS TO RESPECT THE 15 REQUESTS/MINUTE FREE TIER LIMIT
      console.log("Sleeping 4 seconds to respect Gemini API rate limits...");
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (err: any) {
    console.error("Gmail/Gemini API Error:", err);
    // Send a cleaner error message back to the UI
    const errorMsg = err.status === 503 
        ? "Google's AI servers are currently overloaded. Please wait a few seconds and try syncing again." 
        : err.message;
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
