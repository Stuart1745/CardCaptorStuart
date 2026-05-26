"use client"

import { useState, useMemo } from "react";
import { Mail, CheckCircle, XCircle, RefreshCw, AlertCircle, CheckSquare, Trash2, ChevronDown, ChevronRight, PackageOpen } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, collection, writeBatch } from "firebase/firestore";

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

interface QueueGroup {
  id: string;
  vendor: string;
  date: string;
  items: QueueItem[];
}

export default function InboxClient({
  initialQueue,
  uid,
  onReload,
}: {
  initialQueue: QueueItem[];
  uid: string;
  onReload: () => Promise<void>;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo<QueueGroup[]>(() => {
    const grouped = initialQueue.reduce<Record<string, QueueGroup>>((acc, item) => {
      const key = `${item.vendor}_${item.date_received}`;
      if (!acc[key]) {
        acc[key] = { id: key, vendor: item.vendor, date: item.date_received, items: [] };
      }
      acc[key].items.push(item);
      return acc;
    }, {});
    return Object.values(grouped);
  }, [initialQueue]);

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/gmail/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync');
      alert(`Found and parsed ${data.processed} new MTG items from your Gmail receipts!`);
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApprove = async (itemsToApprove: QueueItem[]) => {
    if (!db || !uid) return;
    try {
      const batch = writeBatch(db);
      for (const item of itemsToApprove) {
        const cardRef = doc(collection(db, 'users', uid, 'cards'));
        batch.set(cardRef, {
          card_name: item.card_name,
          set_code: item.set_code,
          condition: item.condition,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          date_added: new Date().toISOString(),
        });
        batch.update(doc(db, 'users', uid, 'receiptQueue', item.id), { status: 'Approved' });
      }
      await batch.commit();
      setSelectedIds(new Set());
      await onReload();
    } catch (err) {
      console.error(err);
      alert("Failed to approve items.");
    }
  };

  const handleReject = async (idsToReject: string[]) => {
    if (!db || !uid) return;
    try {
      const batch = writeBatch(db);
      for (const id of idsToReject) {
        batch.update(doc(db, 'users', uid, 'receiptQueue', id), { status: 'Rejected' });
      }
      await batch.commit();
      setSelectedIds(new Set());
      await onReload();
    } catch (err) {
      console.error(err);
      alert("Failed to reject items.");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === initialQueue.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(initialQueue.map(i => i.id)));
    }
  };

  const getSelectedItems = () => initialQueue.filter(i => selectedIds.has(i.id));

  return (
    <div>
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">Receipt Inbox</h2>
          <p className="text-neutral-400">Review and approve cards extracted by AI from your Gmail order confirmations.</p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all text-sm font-medium shadow-lg shadow-blue-500/20"
        >
          <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Scanning Gmail..." : "Sync Gmail Receipts"}
        </button>
      </header>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {initialQueue.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm overflow-hidden min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-700 text-neutral-500">
              <Mail size={24} />
            </div>
            <p className="text-neutral-400 font-medium">Your queue is empty.</p>
            <p className="text-sm text-neutral-500 mt-1">Click Sync Gmail to scan for new orders.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Bulk Actions Bar */}
          <div className="mb-4 flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl sticky top-20 z-40 shadow-xl shadow-black/50">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                aria-label="Select all items"
                className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-900 cursor-pointer"
                checked={selectedIds.size === initialQueue.length && initialQueue.length > 0}
                onChange={toggleAll}
              />
              <span className="text-sm text-neutral-400 font-medium">
                {selectedIds.size} items selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleReject(initialQueue.map(i => i.id))}
                className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors border border-red-500/20"
              >
                Reject All
              </button>
              <button
                type="button"
                onClick={() => handleApprove(initialQueue)}
                className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-lg transition-colors border border-emerald-500/20"
              >
                Approve All
              </button>

              {selectedIds.size > 0 && (
                <>
                  <div className="w-px h-6 bg-neutral-700 mx-1 self-center"></div>
                  <button
                    type="button"
                    onClick={() => handleReject(Array.from(selectedIds))}
                    className="px-3 py-1.5 flex items-center gap-1 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} /> Reject Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(getSelectedItems())}
                    className="px-3 py-1.5 flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm shadow-blue-500/20"
                  >
                    <CheckSquare size={14} /> Approve Selected
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-6">
            {groups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              const groupTotal = group.items.reduce((sum, i) => sum + (Number(i.purchase_price) * Number(i.quantity)), 0);

              return (
                <div key={group.id} className="border border-neutral-800 rounded-xl bg-neutral-900/50 overflow-hidden">
                  {/* Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroupExpansion(group.id)}
                    className="w-full flex items-center justify-between p-4 bg-neutral-900 hover:bg-neutral-800/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-neutral-500">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                        <PackageOpen size={20} />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{group.vendor} Order</h3>
                        <p className="text-xs text-neutral-500">{new Date(group.date).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium text-white">{group.items.length} items</span>
                      <span className="text-xs text-emerald-400 font-mono">${groupTotal.toFixed(2)} total</span>
                    </div>
                  </button>

                  {/* Group Items (Expanded) */}
                  {isExpanded && (
                    <div className="divide-y divide-neutral-800/50 border-t border-neutral-800 bg-neutral-950/30">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 pl-14 flex items-center gap-4 transition-colors ${
                            selectedIds.has(item.id) ? 'bg-blue-500/5' : 'hover:bg-neutral-900/50'
                          }`}
                        >
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              aria-label={`Select ${item.card_name}`}
                              className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-900 cursor-pointer"
                              checked={selectedIds.has(item.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelection(item.id);
                              }}
                            />
                          </div>
                          <div className="flex-grow flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-medium text-neutral-200">{item.card_name}</h4>
                              <div className="flex gap-3 text-xs text-neutral-500 mt-0.5 font-mono">
                                <span>{item.set_code}</span>
                                <span>•</span>
                                <span>{item.condition}</span>
                                <span>•</span>
                                <span>{item.quantity}x</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-sm text-emerald-400 font-mono">${Number(item.purchase_price).toFixed(2)}</span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleReject([item.id]); }}
                                  className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                  aria-label="Reject item"
                                >
                                  <XCircle size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleApprove([item]); }}
                                  className="p-1.5 text-neutral-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors"
                                  aria-label="Approve item"
                                >
                                  <CheckCircle size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
