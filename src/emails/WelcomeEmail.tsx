import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Img,
  Preview,
  Font,
} from "@react-email/components";

interface WelcomeEmailProps {
  email: string;
  name?: string;
}

export function WelcomeEmail({ email, name }: WelcomeEmailProps) {
  const siteUrl = "https://icodemybusiness.com";
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
      <Preview>Welcome to iCodeMyBusiness — your AI-powered business toolkit</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>iCodeMyBusiness</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={heading}>{greeting}</Text>
            <Text style={paragraph}>
              You&apos;re in. Your email ({email}) has been confirmed and you now
              have access to our free AI tools and resources.
            </Text>
            <Text style={paragraph}>
              We build AI-powered consulting tools and automation systems that
              help business owners save time and make money. Here&apos;s what you
              can start using right now:
            </Text>

            {/* Free Resources */}
            <Section style={resourcesSection}>
              <Text style={resourcesHeading}>Your Free Resources</Text>
              <Text style={resourceItem}>
                <span style={goldBullet}>&#9670;</span> EOS System Spreadsheet Skill
              </Text>
              <Text style={resourceItem}>
                <span style={goldBullet}>&#9670;</span> Habits Tracker Management Skill
              </Text>
              <Text style={resourceItem}>
                <span style={goldBullet}>&#9670;</span> Client Delivery / Work Tracking Skill
              </Text>
            </Section>

            <Button style={ctaButton} href={`${siteUrl}/free-resources`}>
              Access Free Tools
            </Button>

            <Hr style={divider} />

            {/* Spam Warning */}
            <Section style={spamWarningSection}>
              <Text style={spamWarningHeading}>
                Important: Check Your Spam Folder
              </Text>
              <Text style={spamWarningText}>
                To make sure you receive future emails from us (including any
                custom roadmaps or resources), please check your spam/junk folder
                and mark this email as &quot;Not Spam&quot; or add{" "}
                <strong>hello@icodemybusiness.com</strong> to your contacts.
              </Text>
            </Section>

            <Hr style={divider} />

            <Text style={footerText}>
              Have questions? Just reply to this email — a real human reads every
              message.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerLink}>
              <a href={siteUrl} style={link}>
                icodemybusiness.com
              </a>
            </Text>
            <Text style={footerMuted}>
              You received this because you signed up at iCodeMyBusiness.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// --- Styles ---

const body = {
  backgroundColor: "#000000",
  fontFamily: "Inter, Helvetica, Arial, sans-serif",
  margin: "0",
  padding: "0",
};

const container = {
  maxWidth: "580px",
  margin: "0 auto",
  padding: "40px 20px",
};

const header = {
  textAlign: "center" as const,
  paddingBottom: "24px",
};

const logo = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#D4AF37",
  letterSpacing: "-0.5px",
  margin: "0",
};

const content = {
  backgroundColor: "#0A0A0A",
  borderRadius: "12px",
  border: "1px solid rgba(212,175,55,0.3)",
  padding: "40px 32px",
};

const heading = {
  fontSize: "22px",
  fontWeight: "600",
  color: "#E6ECF1",
  marginBottom: "16px",
  marginTop: "0",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#9AA7B2",
  marginBottom: "16px",
};

const resourcesSection = {
  backgroundColor: "#141414",
  borderRadius: "8px",
  padding: "20px 24px",
  marginBottom: "24px",
};

const resourcesHeading = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#D4AF37",
  marginTop: "0",
  marginBottom: "12px",
};

const resourceItem = {
  fontSize: "14px",
  color: "#E6ECF1",
  marginBottom: "8px",
  lineHeight: "1.5",
};

const goldBullet = {
  color: "#D4AF37",
  marginRight: "8px",
};

const ctaButton = {
  backgroundColor: "#D4AF37",
  color: "#000000",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  borderRadius: "8px",
  padding: "14px 28px",
  display: "block" as const,
  textAlign: "center" as const,
  marginBottom: "24px",
};

const divider = {
  borderColor: "rgba(212,175,55,0.2)",
  borderWidth: "1px",
  marginTop: "24px",
  marginBottom: "24px",
};

const spamWarningSection = {
  backgroundColor: "rgba(212,175,55,0.08)",
  borderRadius: "8px",
  border: "1px solid rgba(212,175,55,0.2)",
  padding: "20px 24px",
};

const spamWarningHeading = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#E8C84A",
  marginTop: "0",
  marginBottom: "8px",
};

const spamWarningText = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#9AA7B2",
  margin: "0",
};

const footerText = {
  fontSize: "14px",
  color: "#6B7885",
  lineHeight: "1.5",
};

const footer = {
  textAlign: "center" as const,
  paddingTop: "24px",
};

const footerLink = {
  marginBottom: "8px",
};

const link = {
  color: "#D4AF37",
  textDecoration: "none",
  fontSize: "14px",
};

const footerMuted = {
  fontSize: "12px",
  color: "#6B7885",
  margin: "0",
};
