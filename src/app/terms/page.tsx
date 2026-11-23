import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, CONTACT_URL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service · Cardcaptor Stuart" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 23, 2026">
      <p>
        These terms apply to Cardcaptor Stuart (&ldquo;the site&rdquo;, at ccs.stuartrampy.me), a personal,
        non-commercial hobby site for Magic: The Gathering draft preparation, sealed product tracking and decklists. By
        using the site you agree to them.
      </p>

      <h2>Using the site</h2>
      <ul>
        <li>The site is free to use for personal purposes.</li>
        <li>Don&apos;t attempt to disrupt it, access data that isn&apos;t yours, or overload it with automated requests.</li>
        <li>Only the site owner can add or change play boxes and decks. Shared deck links and QR codes are public.</li>
      </ul>

      <h2>Accounts</h2>
      <p>
        Signing in uses your Google account. You&apos;re responsible for activity under your account. How your
        information is handled is described in the <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Card data, statistics and estimates</h2>
      <p>
        Card data and images come from Scryfall; draft statistics from 17Lands public datasets (CC BY 4.0); pack contents
        from MTGJSON; archetype summaries from Wizards of the Coast prerelease guides. Statistics, tiers, pack odds and
        prices are estimates provided for fun and may be incomplete, out of date or wrong. Don&apos;t rely on them for
        purchasing or other decisions.
      </p>

      <h2>Fan content</h2>
      <p>
        Cardcaptor Stuart is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by
        Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC. Magic:
        The Gathering and card names and images are property of their respective owners.
      </p>

      <h2>No warranty</h2>
      <p>
        The site is provided &ldquo;as is&rdquo;, without warranties of any kind, and may change, break or be taken down
        at any time. To the extent the law allows, the site owner isn&apos;t liable for any loss arising from its use.
      </p>

      <h2>Changes</h2>
      <p>These terms may be updated; the date at the top will change when they are.</p>

      <h2>Contact</h2>
      <p>
        Questions: open an issue at <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">github.com/Stuart1745/CardCaptorStuart</a>.
      </p>
    </LegalPage>
  );
}
