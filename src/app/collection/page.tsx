"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import CsvImporter from "@/components/CsvImporter";

const ADMIN_EMAILS = ['rampy1745@gmail.com'];

export default function CollectionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '');

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/play-box');
    }
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) return null;

  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Collection Importer</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Upload and enrich your collection data via CSV.</p>
        </div>
        <CsvImporter />
      </div>
    </main>
  );
}
