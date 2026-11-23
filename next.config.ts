import type { NextConfig } from "next";

/**
 * Firebase web config for the browser bundle.
 *
 * On App Hosting the NEXT_PUBLIC_FIREBASE_* variables were saved with a trailing tab in
 * their names ("NEXT_PUBLIC_FIREBASE_API_KEY\t"), so Next never inlined them and Firebase
 * silently never initialized in the browser (no Firestore, no saving). Resolve each value
 * from a whitespace-trimmed name match, falling back to FIREBASE_WEBAPP_CONFIG, which App
 * Hosting injects at build time. Values come from the build environment only; nothing is
 * stored in the repo. (The Firebase web config is public by design: it ships to browsers.)
 */
function envTrimmed(name: string): string | undefined {
  const key = Object.keys(process.env).find(k => k.trim() === name);
  const value = key ? process.env[key]?.trim() : undefined;
  return value || undefined;
}

function appHostingWebappConfig(): Record<string, string> {
  try {
    return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG || "{}");
  } catch {
    return {};
  }
}

const webapp = appHostingWebappConfig();
const firebaseEnv: Record<string, string> = {};
for (const [name, key] of [
  ["NEXT_PUBLIC_FIREBASE_API_KEY", "apiKey"],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "authDomain"],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "projectId"],
  ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "storageBucket"],
  ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "messagingSenderId"],
  ["NEXT_PUBLIC_FIREBASE_APP_ID", "appId"],
  ["NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", "measurementId"],
] as const) {
  const value = envTrimmed(name) ?? webapp[key];
  if (value) firebaseEnv[name] = String(value);
}

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  env: firebaseEnv,
  // Serve Firebase Auth's sign-in helper from our own domain, so Google's account chooser
  // can say "continue to ccs.stuartrampy.me" instead of "<project>.firebaseapp.com".
  // (Firebase's documented custom-authDomain proxy setup.)
  async rewrites() {
    const authHost = "https://cardcaptorstuart.firebaseapp.com";
    return [
      { source: "/__/auth/:path*", destination: `${authHost}/__/auth/:path*` },
      { source: "/__/firebase/init.json", destination: `${authHost}/__/firebase/init.json` },
    ];
  },
  // The archetypes API reads precomputed 17Lands public-dataset stats and MTGJSON pack contents from disk at
  // request time; make sure they ship with the server bundle.
  outputFileTracingIncludes: {
    '/api/archetypes': ['./data/limited-stats/**/*.json', './data/pack-contents/**/*.json'],
  },
};

export default nextConfig;
