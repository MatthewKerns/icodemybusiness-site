import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "About | iCodeMyBusiness",
  description:
    "Who runs iCodeMyBusiness, what the practice does, and how to get in touch.",
};

export default function AboutPage() {
  return (
    <LegalPage title="About iCodeMyBusiness">
      <p>
        iCodeMyBusiness is a one-person consulting and automation practice run by Matthew
        Kerns. It helps business owners find the real constraint in how their work gets
        done, then removes it — sometimes by changing the process, sometimes by building
        software for the job.
      </p>

      <LegalSection title="What we do">
        <ul>
          <li>
            <strong>Consulting.</strong> Working sessions that map how a business actually
            operates and where its hours go.
          </li>
          <li>
            <strong>Custom tools.</strong> Software built around your workflow, instead of
            a workflow bent around someone else&apos;s software.
          </li>
          <li>
            <strong>Free tools and the Academy.</strong> Public tools and lessons for
            people who would rather do it themselves.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Our own applications">
        <p>
          We build what we use. Mango, at mango.icodemybusiness.com, is the dashboard this
          practice runs on: time, income, planning and client reporting in one place. It is
          in private beta, and sign-in is limited to authorized accounts.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Matthew Kerns, iCodeMyBusiness —{" "}
          <a href="mailto:matthew@icodemybusiness.com" className="text-blue hover:underline">
            matthew@icodemybusiness.com
          </a>
          . Prefer to talk? Book a free intro call from the{" "}
          <a href="/book" className="text-blue hover:underline">
            booking page
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
