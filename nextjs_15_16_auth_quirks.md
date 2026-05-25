# Next.js 15 & 16: Authentication & SSR Migration Guide

This document captures specific insights, bugs, and breaking changes encountered while migrating and building Server-Side Rendering (SSR) applications with Next.js 15 and 16. These should be referenced when setting up Supabase SSR or debugging hydration/middleware issues.

## 1. Next.js 16 `middleware.ts` Breaking Change
In Next.js 16 (Turbopack), the standard `middleware.ts` convention has been deprecated in favor of a new `proxy` convention. 
- **The Error:** `The "middleware" file convention is deprecated. Please use "proxy" instead.`
- **The Fix:** Rename `middleware.ts` to `proxy.ts`. Inside the file, the exported function must be named `proxy` instead of `middleware`:
  ```typescript
  // Old (Next.js 14/15)
  export async function middleware(request: NextRequest) { ... }

  // New (Next.js 16)
  export async function proxy(request: NextRequest) { ... }
  ```

## 2. Next.js 15+ Asynchronous Cookies
In Next.js 15 and above, `cookies()` imported from `next/headers` is no longer synchronous. It returns a Promise.
- **The Error:** `cookieStore.get is not a function`
- **The Fix:** You must `await` the `cookies()` call before using it.
  ```typescript
  import { cookies } from 'next/headers'

  export async function createClient() {
    // Must be awaited in Next 15+
    const cookieStore = await cookies(); 
    return createServerClient(..., {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; }
      }
    });
  }
  ```
  *(Note: This means any function calling `createClient()` must also be `async` and use `await createClient()`.)*

## 3. Resolving Next.js Hydration Errors Caused by Browser Extensions
Browser extensions (like adblockers or password managers) often inject code into the `<body>` tag, causing Next.js to throw a server/client hydration mismatch error.
- **The Fix:** Add the `suppressHydrationWarning` attribute directly to the `<body>` tag in your root `layout.tsx`. This tells React to ignore mismatch warnings for attributes injected by extensions on the body.

## 4. Limitations on AI Automated Testing for Google OAuth
When utilizing AI Browser Subagents for visual validation, they cannot automate the testing of Google OAuth flows.
- **The Reason:** Automated, headless browser sessions are strictly blocked by Google's anti-bot detection and 2-Factor Authentication (2FA) systems.
- **The Workflow:** For features guarded by Google Auth, the AI should generate the testing framework and rely on human interaction to manually authenticate and provide the final screenshots.
