import React from "react";

/** Shared prose layout for the Privacy Policy and Terms of Service pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <article className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-10
        text-slate-700 dark:text-slate-300 leading-relaxed
        [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:dark:text-slate-100 [&_h2]:mt-8 [&_h2]:mb-2
        [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_li]:mb-1 [&_a]:text-indigo-600 [&_a]:dark:text-indigo-400 [&_a]:underline">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight mb-1">{title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Last updated {updated}</p>
        {children}
      </article>
    </main>
  );
}

export const CONTACT_URL = "https://github.com/Stuart1745/CardCaptorStuart/issues";
