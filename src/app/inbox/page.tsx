import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InboxClient from "./InboxClient";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch the current queue
  const { data: queueItems } = await supabase
    .from('receipt_queue')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'Draft')
    .order('date_received', { ascending: false });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-blue-500/30">
      <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                    M
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-white">Cardcaptor Stuart</h1>
            </div>
            <div className="flex gap-4">
                <a href="/" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Dashboard</a>
                <a href="/inbox" className="text-sm font-medium text-white transition-colors">Receipt Inbox</a>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <InboxClient initialQueue={queueItems || []} />
      </main>
    </div>
  );
}
