import { NextRequest, NextResponse } from "next/server";
import { NotFound, boxEv } from "@/lib/boxEv";

/**
 * GET /api/box-ev?set=FDN&type=Play%20Booster%20Box
 *
 * Expected market value of one pack of a sealed box (see lib/boxEv.ts). The page multiplies by
 * the box's pack count. Cached at the CDN for 12 hours, like the market price it sits next to.
 */
export async function GET(req: NextRequest) {
  const set = (req.nextUrl.searchParams.get("set") ?? "").split(",")[0].trim().toUpperCase();
  const type = (req.nextUrl.searchParams.get("type") ?? "Play Booster Box").slice(0, 40);
  if (!/^[A-Z0-9]{2,6}$/.test(set)) {
    return NextResponse.json({ error: "Give a set code, like ?set=FDN" }, { status: 400 });
  }
  try {
    const ev = await boxEv(set, type);
    return NextResponse.json(ev, { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } });
  } catch (e) {
    if (e instanceof NotFound) return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json({ error: `Expected value lookup failed: ${(e as Error).message}` }, { status: 502 });
  }
}
