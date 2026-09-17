import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | iCodeMyBusiness",
  description:
    "What data iCodeMyBusiness collects on this site and in its applications, how it is used, and how to ask for a copy or its deletion.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="17 September 2026">
      <p>
        iCodeMyBusiness is a consulting and automation practice operated by Matthew Kerns
        in the United States. This policy covers this website and the applications linked
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
            <strong>Basic usage analytics.</strong> Aggregate page and referral counts, so
            we know which pages earn their place.
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
          Clerk for authentication, Clockify for time tracking when you connect it,
          Anthropic for AI features, and our hosting providers. Each handles data under its
          own policy.
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
          iCodeMyBusiness (Matthew Kerns) —{" "}
          <a href="mailto:matthew@icodemybusiness.com" className="text-blue hover:underline">
            matthew@icodemybusiness.com
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
