import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { PROCESSORS, FIRST_PARTY_COOKIES } from "@/lib/processors";
import { BUSINESS, LEGAL_ENTITY_LINE } from "@/lib/business";

export const metadata: Metadata = {
  title: "Privacy Policy | iCodeMyBusiness",
  description:
    "What data iCodeMyBusiness collects on this site and in its applications, how it is used, and how to ask for a copy or its deletion.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="22 September 2026">
      <p>
        iCodeMyBusiness is a consulting and automation practice operated by {LEGAL_ENTITY_LINE},
        run by {BUSINESS.founder}. This policy covers this website and the applications linked
        from it, including the Mango dashboard at mango.icodemybusiness.com.
      </p>

      <LegalSection title="What we collect">
        <ul>
          <li>
            <strong>What you send us.</strong> Your name, email address, and whatever you
            write when you book a call, request access, or email us.
          </li>
          <li>
            <strong>Account identity, if you sign in.</strong> Your email address and user
            ID, held by our authentication provider, Clerk. Sign-in exists for clients and
            authorized accounts only — this is not a consumer service, and you do not need
            an account to read this site.
          </li>
          <li>
            <strong>Data inside our applications.</strong> The records you enter, and data
            from services you choose to connect — for example time entries pulled with a
            Clockify API key that you supply and can revoke.
          </li>
          <li>
            <strong>Usage analytics.</strong> Which pages you view, where you came from, and
            your device and browser type, so we know which pages earn their place. If you
            are signed in, analytics are tied to your account ID — never to your email
            address or name.
          </li>
          <li>
            <strong>Error monitoring and session replay.</strong> When something breaks we
            record the technical details. On about 1 in 10 visits we also record a replay of
            how the page was used, to find problems we would otherwise miss. Replays mask
            all text and everything typed into forms.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How it is used and stored">
        <p>
          We use it to answer you and to run the services you asked for. It is stored on
          infrastructure controlled by iCodeMyBusiness. Anything you connect is held as a
          secret and is never displayed back to you or shown to anyone else.
        </p>
        <p>
          <strong>
            We do not sell or rent your data, and we never use it for advertising.
          </strong>{" "}
          It goes to the processors listed below, and nowhere else unless the law requires
          it.
        </p>
      </LegalSection>

      <LegalSection title="Processors we rely on">
        <p>
          These services receive data from this site or its applications, each under its
          own policy. There are no others apart from our hosting providers.
        </p>
        <ul>
          {PROCESSORS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong> — {p.purpose}. Receives {p.data}.
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>This site sets two cookies of its own, and only when you arrive from a tagged link:</p>
        <ul>
          {FIRST_PARTY_COOKIES.map((c) => (
            <li key={c.name}>
              <code>{c.name}</code> — {c.purpose}. Kept for {c.lifetime}.
            </li>
          ))}
        </ul>
        <p>
          Clerk sets cookies to keep you signed in, and PostHog stores an anonymous visitor
          identifier so repeat visits are counted once. None are used for advertising.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          Ask for a copy of your data, a correction, or its deletion and we will act on it.
          Write to{" "}
          <a href="mailto:matthew@icodemybusiness.com" className="text-blue hover:underline">
            matthew@icodemybusiness.com
          </a>
          . Every marketing email carries an unsubscribe link, and you can disconnect a
          connected service at any time.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          {BUSINESS.legalName} ({BUSINESS.founder}) —{" "}
          <a href={`mailto:${BUSINESS.email}`} className="text-blue hover:underline">
            {BUSINESS.email}
          </a>
          {BUSINESS.telephone && <> · {BUSINESS.telephone}</>}
          {BUSINESS.postalAddress && (
            <>
              {" "}· {BUSINESS.postalAddress.streetAddress}, {BUSINESS.postalAddress.addressLocality},{" "}
              {BUSINESS.postalAddress.addressRegion} {BUSINESS.postalAddress.postalCode}
            </>
          )}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
