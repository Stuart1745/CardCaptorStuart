"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

// "Add to home screen" for phones. Chrome/Edge/Samsung Internet on Android fire
// beforeinstallprompt, so they get a one-tap Install button; iPhone/iPad have no install API,
// so Safari (and Chrome on iOS) get the Share > Add to Home Screen steps. Other phone browsers
// get the menu steps. Hidden once the site runs as an installed app, and after it's dismissed
// (until the footer's "Add to home screen" link asks for it again).

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "ccs-install-dismissed";
const SHOW_EVENT = "ccs:show-install";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isPhoneOrTablet = () => window.matchMedia("(pointer: coarse)").matches;

const readDismissed = () => { try { return localStorage.getItem(DISMISSED_KEY) === "1"; } catch { return false; } };
const writeDismissed = (v: boolean) => {
  try { if (v) localStorage.setItem(DISMISSED_KEY, "1"); else localStorage.removeItem(DISMISSED_KEY); } catch { /* private mode */ }
};

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [mode, setMode] = useState<"install" | "ios" | "menu" | null>(null);
  const [open, setOpen] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
      setMode("install");
      if (isPhoneOrTablet() && !readDismissed()) setOpen(true);
    };
    const onInstalled = () => { setOpen(false); setInstallEvent(null); setMode(null); };
    const onAsk = () => { writeDismissed(false); setMode(m => m ?? (isIOS() ? "ios" : "menu")); setShowSteps(true); setOpen(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(SHOW_EVENT, onAsk);

    // No install API: show the manual steps on phones and tablets, a moment after load.
    const timer = window.setTimeout(() => {
      setMode(m => m ?? (isIOS() ? "ios" : isPhoneOrTablet() ? "menu" : null));
      if (isPhoneOrTablet() && !readDismissed()) setOpen(true);
    }, 2500);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(SHOW_EVENT, onAsk);
    };
  }, []);

  if (!open || !mode) return null;

  const dismiss = () => { writeDismissed(true); setOpen(false); setShowSteps(false); };
  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setOpen(false);
    else setMode(isIOS() ? "ios" : "menu");
  };

  return (
    <div role="dialog" aria-label="Add Cardcaptor Stuart to your home screen"
      className="fixed inset-x-3 z-[60] mx-auto max-w-md rounded-2xl border border-paper-200 dark:border-paper-700 bg-white dark:bg-paper-900 shadow-xl p-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="w-11 h-11 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-paper-900 dark:text-paper-50">Add to your home screen</p>
          <p className="text-sm text-paper-600 dark:text-paper-300">Opens like an app, full screen, one tap from your phone.</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Not now"
          className="-mr-1 -mt-1 p-1.5 rounded-lg text-paper-500 hover:bg-paper-100 dark:hover:bg-paper-800">
          <X className="w-5 h-5" />
        </button>
      </div>

      {mode === "install" && (
        <button type="button" onClick={install}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-medium">
          <Download className="w-4 h-4" /> Install app
        </button>
      )}

      {mode !== "install" && !showSteps && (
        <button type="button" onClick={() => setShowSteps(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-medium">
          <SquarePlus className="w-4 h-4" /> Show me how
        </button>
      )}

      {mode === "ios" && showSteps && (
        <ol className="mt-3 space-y-2 text-sm text-paper-700 dark:text-paper-200 list-decimal pl-5">
          <li>Tap <Share className="inline w-4 h-4 -mt-0.5 text-sky-600" aria-label="Share" /> <strong>Share</strong> in the browser toolbar (on iPhone Safari it&apos;s at the bottom).</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong> <SquarePlus className="inline w-4 h-4 -mt-0.5" aria-hidden />, then <strong>Add</strong>.</li>
          <li className="text-paper-500 dark:text-paper-400 list-none -ml-5">Just want a bookmark? Choose <strong>Add Bookmark</strong> instead.</li>
        </ol>
      )}

      {mode === "menu" && showSteps && (
        <ol className="mt-3 space-y-2 text-sm text-paper-700 dark:text-paper-200 list-decimal pl-5">
          <li>Open your browser&apos;s menu (<strong>⋮</strong> or <strong>☰</strong>).</li>
          <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
          <li className="text-paper-500 dark:text-paper-400 list-none -ml-5">Just want a bookmark? Tap the <strong>☆</strong> star in the same menu.</li>
        </ol>
      )}
    </div>
  );
}

/** Footer link that brings the prompt back after it was dismissed. Hidden inside the installed app. */
export function InstallLink({ className }: { className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs window, so runs after hydration
    setShow(!isStandalone());
  }, []);
  if (!show) return null;
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(SHOW_EVENT))}>
      Add to home screen
    </button>
  );
}
