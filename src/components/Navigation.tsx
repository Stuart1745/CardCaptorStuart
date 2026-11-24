"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LoginButton } from "./LoginButton";
import { useAuth } from "./AuthProvider";
import { Layers, Box, Package } from "lucide-react";
import { isAdminUser } from "@/lib/admin";

export function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);

  const links = [
    { href: "/play-box", label: "Play Box", icon: Package, requiresAdmin: false },
    { href: "/decks", label: "Decks", icon: Layers, requiresAdmin: false },
    { href: "/collection", label: "Collection", icon: Box, requiresAdmin: true },
  ].filter(link => !link.requiresAdmin || isAdmin);

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          <div className="flex items-center gap-2 sm:gap-6 min-w-0">
            <Link href="/" aria-label="Cardcaptor Stuart home" className="flex items-center gap-2 shrink-0 font-bold text-xl tracking-tight text-indigo-600 dark:text-indigo-400">
              <img src="/logo.png" alt="" width={32} height={32} className="w-8 h-8 object-contain" />
              <span className="hidden md:inline">Cardcaptor Stuart</span>
            </Link>
            <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
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
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <LoginButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
