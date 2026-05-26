"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import InboxClient from "./InboxClient";

// Keep force-dynamic so Next.js doesn't try to statically render this route
export const dynamic = 'force-dynamic';

interface QueueItem {
  id: string;
  vendor: string;
  date_received: string;
  card_name: string;
  set_code: string;
  condition: string;
  quantity: number;
  purchase_price: number | string;
  status: string;
}

export default function InboxPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [fetching, setFetching] = useState(true);

  const loadQueue = useCallback(async () => {
    if (!user || !db) { setFetching(false); return; }
    try {
      const q = query(
        collection(db, 'users', user.uid, 'receiptQueue'),
        where('status', '==', 'Draft'),
        orderBy('date_received', 'desc')
      );
      const snap = await getDocs(q);
      setQueue(snap.docs.map(d => ({ id: d.id, ...d.data() } as QueueItem)));
    } catch (e) {
      console.error('Failed to load receipt queue:', e);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    loadQueue();
  }, [authLoading, user, router, loadQueue]);

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
            <Link href="/" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/inbox" className="text-sm font-medium text-white transition-colors">Receipt Inbox</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {authLoading || fetching ? (
          <div className="flex items-center justify-center py-24 text-neutral-500">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading inbox...
            </div>
          </div>
        ) : (
          <InboxClient initialQueue={queue} uid={user?.uid ?? ''} onReload={loadQueue} />
        )}
      </main>
    </div>
  );
}
