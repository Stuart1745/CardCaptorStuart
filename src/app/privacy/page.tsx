import type { Metadata } from "next";
import { LegalPage, CONTACT_URL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · Cardcaptor Stuart" };

// Keep this accurate to what the app actually does. If Gmail receipt sync is ever revived,
// this page must describe the Gmail access before the scope is requested.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 23, 2026">
      <p>
        Cardcaptor Stuart (&ldquo;the site&rdquo;, at ccs.stuartrampy.me) is a personal, non-commercial site for tracking
        Magic: The Gathering sealed product, draft preparation and decklists. This policy explains what information the
        site handles and why.
      </p>

      <h2>What you can do without signing in</h2>
      <p>
        You can browse play boxes, draft archetypes, statistics and shared decks without an account. The site does not
        set advertising or analytics cookies and does not track you across other sites.
      </p>

      <h2>Signing in with Google</h2>
      <p>
        Signing in uses Google Sign-In through Firebase Authentication (a Google service). The site requests only your
        basic profile: your name, email address, profile picture and a Google account identifier. It does not request
        access to your Gmail, Google Drive, contacts or any other Google data.
      </p>
      <p>
        This information is used only to sign you in, to show you as signed in, and to decide what you are allowed to
        do (only the site owner can add or change boxes and decks). Firebase keeps you signed in using your
        browser&apos;s local storage.
      </p>

      <h2>Information the site stores</h2>
      <ul>
        <li><strong>Play boxes and decks</strong> created by the site owner. These are public on the site.</li>
        <li>
          <strong>Your own data, if you use per-user features</strong> (such as the collection inbox): stored under your
          account and readable only by you.
        </li>
      </ul>
      <p>
        Data is stored in Google Cloud Firestore and the site is hosted on Firebase App Hosting, both in the United
        States. The site does not sell, rent or share your information with anyone, and does not use it for advertising.
      </p>

      <h2>Third-party services</h2>
      <ul>
        <li><strong>Google Firebase</strong> (sign-in, hosting, database) processes the data described above. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.</li>
        <li><strong>Scryfall</strong> serves card images and card data; your browser loads these directly from Scryfall, which can see your IP address. See <a href="https://scryfall.com/docs/privacy" target="_blank" rel="noopener noreferrer">Scryfall&apos;s privacy policy</a>.</li>
        <li><strong>Draft statistics and pack odds</strong> come from 17Lands public datasets and MTGJSON. They are prepared ahead of time; no information about you is sent to them.</li>
      </ul>

      <h2>Keeping and deleting your information</h2>
      <p>
        Your sign-in record stays until you ask for it to be removed. To delete your account and anything stored under
        it, or to ask what the site holds about you, contact the site owner (below). You can also remove the
        site&apos;s access at any time from your <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">Google Account&apos;s third-party connections</a>.
      </p>

      <h2>Children</h2>
      <p>The site is not directed at children under 13 and does not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top will change. Significant changes will be noted on this page.</p>

      <h2>Contact</h2>
      <p>
        Questions or requests: open an issue at <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">github.com/Stuart1745/CardCaptorStuart</a>.
      </p>
    </LegalPage>
  );
}
