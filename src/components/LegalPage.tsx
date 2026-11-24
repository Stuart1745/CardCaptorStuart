import React from "react";

/** Shared prose layout for the Privacy Policy and Terms of Service pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <article className="max-w-3xl mx-auto bg-white dark:bg-paper-900 rounded-2xl border border-paper-200 dark:border-paper-800 shadow-sm p-6 md:p-10
        text-paper-700 dark:text-paper-300 leading-relaxed
        [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-paper-900 [&_h2]:dark:text-paper-100 [&_h2]:mt-8 [&_h2]:mb-2
        [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_li]:mb-1 [&_a]:text-sakura-600 [&_a]:dark:text-sakura-400 [&_a]:underline">
        <h1 className="text-3xl font-brand font-bold text-paper-900 dark:text-paper-50 mb-1"><span className="washi">{title}</span></h1>
        <p className="text-sm text-paper-500 dark:text-paper-400">Last updated {updated}</p>
        {children}
      </article>
    </main>
  );
}

export const CONTACT_URL = "https://github.com/Stuart1745/CardCaptorStuart/issues";
