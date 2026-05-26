"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LoginButton } from "./LoginButton";
import { useAuth } from "./AuthProvider";
import { Layers, Box, Package } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    { href: "/", label: "Collection", icon: Box, requiresAuth: true },
    { href: "/decks", label: "Decks", icon: Layers, requiresAuth: false },
    { href: "/play-box", label: "Play Box", icon: Package, requiresAuth: false },
  ].filter(link => !link.requiresAuth || user);

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between h-auto sm:h-16 py-4 sm:py-0 gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-indigo-600 dark:text-indigo-400">
              <img src="/icon.png" alt="Wand Icon" className="w-8 h-8 object-contain" />
              Cardcaptor Stuart
            </Link>
            <div className="flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LoginButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
