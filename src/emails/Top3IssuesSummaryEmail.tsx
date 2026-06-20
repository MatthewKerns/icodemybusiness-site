import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
  Font,
} from "@react-email/components";

export interface Top3IssuesSummaryEmailProps {
  email: string;
  name?: string;
  issues: Array<{ title: string; severity: string; evidence: string }>;
  sessionSummary?: string;
}

const siteUrl = "https://icodemybusiness.com";

export function Top3IssuesSummaryEmail({
  email,
  name,
  issues,
  sessionSummary,
}: Top3IssuesSummaryEmailProps) {
  const greeting = name ? `Hey ${name},` : "Hey there,";
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
            format: "woff2",
          }}
        />
      </Head>
      <Preview>Your Top 3 Business Issues — draft summary</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>iCodeMyBusiness</Text>
          </Section>
          <Section style={content}>
            <Text style={heading}>{greeting}</Text>
            <Text style={paragraph}>
              Here&apos;s the top-3-issues draft we put together in your chat
              session ({email}). Use this as a starting point — we recommend
              sharing it with your leadership team before acting on it.
            </Text>

            <Section style={issuesSection}>
              {issues.map((issue, i) => (
                <Section key={i} style={issueBlock}>
                  <Text style={issueTitle}>
                    {i + 1}. {issue.title}
                  </Text>
                  <Text style={severityBadge(issue.severity)}>
                    severity: {issue.severity}
                  </Text>
                  <Text style={evidence}>{issue.evidence}</Text>
                </Section>
              ))}
            </Section>

            {sessionSummary && (
              <>
                <Hr style={divider} />
                <Text style={paragraph}>{sessionSummary}</Text>
              </>
            )}

            <Button style={ctaButton} href={`${siteUrl}/consulting`}>
              Book a 30-min working session
            </Button>

            <Hr style={divider} />
            <Text style={footerText}>
              Reply to this email if you want me to look at one of these issues
              in more depth. No obligation — these draft reviews are free.
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={footerLink}>
              <a href={siteUrl} style={link}>
                icodemybusiness.com
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#0b0b0c",
  color: "#f3f3f3",
  fontFamily: "Inter, Helvetica, Arial, sans-serif",
} as const;
const container = {
  margin: "0 auto",
  padding: "20px",
  maxWidth: "600px",
} as const;
const header = { padding: "16px 0", textAlign: "center" as const };
const logo = { color: "#e8b340", fontSize: "22px", fontWeight: 700 };
const content = {
  backgroundColor: "#141416",
  padding: "24px",
  borderRadius: "8px",
  border: "1px solid #232327",
};
const heading = { fontSize: "20px", fontWeight: 700, marginBottom: "12px" };
const paragraph = { fontSize: "14px", lineHeight: "22px", color: "#d8d8d8" };
const issuesSection = { marginTop: "16px" };
const issueBlock = {
  padding: "12px 16px",
  borderLeft: "3px solid #e8b340",
  marginBottom: "12px",
  backgroundColor: "#1b1b1e",
};
const issueTitle = { fontSize: "16px", fontWeight: 600, marginBottom: "4px" };
const evidence = { fontSize: "13px", color: "#b0b0b0", marginTop: "6px" };
const severityBadge = (sev: string) => ({
  display: "inline-block",
  fontSize: "11px",
  textTransform: "uppercase" as const,
  color: sev === "high" ? "#ffa2a2" : sev === "medium" ? "#ffd27d" : "#9cdca3",
  padding: "2px 0",
});
const divider = { borderColor: "#232327", margin: "20px 0" };
const ctaButton = {
  display: "inline-block",
  padding: "12px 20px",
  borderRadius: "6px",
  backgroundColor: "#e8b340",
  color: "#0b0b0c",
  textDecoration: "none",
  fontWeight: 600,
  marginTop: "12px",
};
const footer = { textAlign: "center" as const, padding: "20px 0", color: "#888" };
const footerText = { fontSize: "12px", color: "#999" };
const footerLink = { fontSize: "12px" };
const link = { color: "#e8b340" };
