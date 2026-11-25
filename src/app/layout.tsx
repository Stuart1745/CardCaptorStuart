import type { Metadata, Viewport } from "next";
import { Cherry_Swash, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { Navigation } from "@/components/Navigation";
import { InstallPrompt, InstallLink } from "@/components/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Site name only: a playful storybook face next to the pink logo (DESIGN.md, Brand wordmark).
const brandFont = Cherry_Swash({
  variable: "--font-cherry-swash",
  weight: "700",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ccs.stuartrampy.me"),
  title: "Cardcaptor Stuart",
  description: "A play-night menu built from one Magic collection: sealed boxes ready to draft and Commander decks grouped into pods.",
  applicationName: "Cardcaptor Stuart",
  // iPhone/iPad "Add to Home Screen": open full screen with this name under the icon
  appleWebApp: { capable: true, title: "Cardcaptor", statusBarStyle: "default" },
};

// Browser and installed-app toolbar color: the paper background, plum paper at night
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF8FB" },
    { media: "(prefers-color-scheme: dark)", color: "#2D111F" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${brandFont.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-screen flex flex-col w-full bg-paper-50 dark:bg-paper-950 text-paper-900 dark:text-paper-50 transition-colors duration-300">
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light">
            <Navigation />
            {children}
            <InstallPrompt />
            <footer className="mt-auto border-t border-paper-200 dark:border-paper-800 px-4 md:px-8 py-6 text-xs text-paper-500 dark:text-paper-400">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <p>Cardcaptor Stuart is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.</p>
                <nav className="flex gap-4 shrink-0">
                  <Link href="/privacy" className="hover:text-sakura-700 underline-offset-2 hover:underline">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-sakura-700 underline-offset-2 hover:underline">Terms of Service</Link>
                  <InstallLink className="hover:text-sakura-700 underline-offset-2 hover:underline" />
                </nav>
              </div>
            </footer>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
