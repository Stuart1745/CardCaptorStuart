"use client";

import Link from "next/link";
import Image from "next/image";
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
    // Phones: two rows (logo and account on top, page links below) that scroll away with the
    // page; from md: one sticky row.
    <nav className="letterhead relative md:sticky md:top-0 z-50">
      <div className="max-w-[84rem] mx-auto px-4 md:px-8">
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-x-2 md:gap-x-6 pt-2.5 md:pt-0 md:h-16">
          <Link href="/" aria-label="Cardcaptor Stuart home" className="order-1 shrink-0 rounded-md">
            <Image src="/brand/banner.png" alt="" width={1336} height={200} priority className="h-8 md:h-9 lg:h-10 w-auto sticker rounded-md" />
          </Link>
          <div className="order-3 md:order-2 w-full md:w-auto md:flex-1 flex items-center gap-0.5 sm:gap-1 -mx-2 md:mx-0 py-1.5 md:py-0 min-w-0 overflow-x-auto">
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
          <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-4 shrink-0">
            <LoginButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
