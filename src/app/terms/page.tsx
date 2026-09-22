import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { BUSINESS, LEGAL_ENTITY_LINE } from "@/lib/business";

export const metadata: Metadata = {
  title: "Terms of Use | iCodeMyBusiness",
  description:
    "The terms that apply to the iCodeMyBusiness website, its free tools, and the applications linked from it.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="22 September 2026">
      <p>
        These terms cover this website, the free tools on it, and the applications linked
        from it. They are an agreement between you and {LEGAL_ENTITY_LINE} (&quot;iCodeMyBusiness&quot;,
        &quot;we&quot;). By using the site, you accept them.
      </p>

      <LegalSection title="What this site is">
        <p>
          The website of a consulting practice. It describes services, offers a way to book
          a call, and links to applications used by clients and authorized accounts. The
          public pages need no account; signing in is for those accounts.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <ul>
          <li>Use an account only if you are authorized to access it.</li>
          <li>
            Anything you connect from another service must be yours, and you may disconnect
            it whenever you want.
          </li>
          <li>
            Don&apos;t try to reach other people&apos;s data, disrupt the service, or
            collect from it in ways that degrade it for everyone else.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Content and ownership">
        <p>
          The words, designs and code on this site belong to iCodeMyBusiness. Work
          delivered under a signed engagement is governed by that agreement, which takes
          precedence over these terms wherever the two differ.
        </p>
      </LegalSection>

      <LegalSection title="No warranty, and limits">
        <p>
          Everything here is provided &quot;as is&quot;, without warranties of any kind.
          Articles and free tools are information, not professional advice for your
          situation. iCodeMyBusiness is not liable for losses arising from use of this site
          or its tools.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These terms are governed by the laws of the State of {BUSINESS.jurisdiction}, without
          regard to its conflict-of-law rules. Any dispute that cannot be settled between us
          will be brought in the state or federal courts located in {BUSINESS.jurisdiction}.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          We may update these terms; the date above always names the current version.
          Questions:{" "}
          <a href={`mailto:${BUSINESS.email}`} className="text-blue hover:underline">
            {BUSINESS.email}
          </a>
          {" "}— {BUSINESS.legalName}
          {BUSINESS.postalAddress && (
            <>
              , {BUSINESS.postalAddress.streetAddress}, {BUSINESS.postalAddress.addressLocality},{" "}
              {BUSINESS.postalAddress.addressRegion} {BUSINESS.postalAddress.postalCode}
            </>
          )}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
