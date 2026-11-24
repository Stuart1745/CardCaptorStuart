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
    <nav className="letterhead sticky top-0 z-50">
      <div className="max-w-[84rem] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          <div className="flex items-center gap-2 sm:gap-6 min-w-0">
            <Link href="/" aria-label="Cardcaptor Stuart home" className="flex items-center gap-2 shrink-0 font-brand font-bold text-xl text-pink-700 dark:text-pink-400">
              <img src="/logo.png" alt="" width={32} height={32} className="w-8 h-8 object-contain" />
              <span className="hidden md:inline">Cardcaptor Stuart</span>
            </Link>
            <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    aria-current={isActive ? "page" : undefined}
                    href={link.href}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? "gel-underline text-paper-900 dark:text-paper-50"
                        : "text-paper-600 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-paper-900 hover:text-paper-900 dark:hover:text-paper-50"
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
