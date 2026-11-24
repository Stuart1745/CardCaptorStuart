"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import CsvImporter from "@/components/CsvImporter";
import { isAdminUser } from "@/lib/admin";

export default function CollectionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = isAdminUser(user);

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
          <h1 className="text-3xl font-brand font-bold text-paper-900 dark:text-paper-50"><span className="washi">Collection Importer</span></h1>
          <p className="text-paper-500 dark:text-paper-400 mt-1">Upload and enrich your collection data via CSV.</p>
        </div>
        <CsvImporter />
      </div>
    </main>
  );
}
