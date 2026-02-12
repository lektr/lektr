/**
 * Daily Digest Email Template
 *
 * Renders a beautiful daily digest email with reading highlights,
 * review stats, and a clear call-to-action.
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface Highlight {
  id: string;
  content: string;
  bookTitle: string;
  bookAuthor?: string;
}

interface DailyDigestEmailProps {
  highlights: Highlight[];
  appUrl: string;
  unsubscribeUrl: string;
  totalHighlights?: number;
  totalDue?: number;
}

export const DailyDigestEmail = ({
  highlights,
  appUrl,
  unsubscribeUrl,
  totalHighlights = 0,
  totalDue = 0,
}: DailyDigestEmailProps) => {
  const preheaderText = `${highlights.length} highlight${highlights.length !== 1 ? 's' : ''} to review today — from ${new Set(highlights.map(h => h.bookTitle)).size} book${new Set(highlights.map(h => h.bookTitle)).size !== 1 ? 's' : ''}`;

  return (
    <Html>
      <Head />
      <Preview>{preheaderText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Heading style={h1}>📚 Today's Highlights</Heading>

          {/* Stats bar */}
          <Section style={statsBar}>
            <Text style={statsText}>
              <span style={statValue}>{highlights.length}</span> to review today
              {totalDue > highlights.length && (
                <span style={statMuted}> · {totalDue} total due</span>
              )}
              {totalHighlights > 0 && (
                <span style={statMuted}> · {totalHighlights} in your library</span>
              )}
            </Text>
          </Section>

          {/* Highlights */}
          {highlights.map((highlight, index) => (
            <React.Fragment key={highlight.id}>
              {index > 0 && <Hr style={divider} />}
              <Section style={highlightSection}>
                <Text style={quote}>"{highlight.content}"</Text>
                <Text style={attribution}>
                  — {highlight.bookTitle}
                  {highlight.bookAuthor && ` by ${highlight.bookAuthor}`}
                </Text>
              </Section>
            </React.Fragment>
          ))}

          <Hr style={divider} />

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={ctaButton} href={appUrl}>
              Start Today's Review →
            </Button>
          </Section>

          {/* Footer */}
          <Text style={footer}>
            You're receiving this because you have Daily Digest enabled.
            <br />
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Manage digest preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DailyDigestEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
  borderRadius: "8px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600" as const,
  lineHeight: "1.3",
  margin: "0 0 16px",
};

const statsBar = {
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const statsText = {
  color: "#4a4a4a",
  fontSize: "14px",
  lineHeight: "1.4",
  margin: "0",
};

const statValue = {
  color: "#6366f1",
  fontWeight: "700" as const,
  fontSize: "16px",
};

const statMuted = {
  color: "#999999",
};

const highlightSection = {
  margin: "16px 0",
};

const quote = {
  color: "#1a1a1a",
  fontSize: "17px",
  fontStyle: "italic" as const,
  lineHeight: "1.7",
  margin: "0 0 8px",
  padding: "0 16px",
  borderLeft: "3px solid #6366f1",
};

const attribution = {
  color: "#666666",
  fontSize: "14px",
  margin: "0",
  paddingLeft: "16px",
};

const divider = {
  borderColor: "#e6e6e6",
  margin: "24px 0",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "32px 0 24px",
};

const ctaButton = {
  backgroundColor: "#6366f1",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "14px 32px",
  display: "inline-block",
};

const footer = {
  color: "#888888",
  fontSize: "13px",
  lineHeight: "1.6",
  marginTop: "32px",
  textAlign: "center" as const,
};

const unsubscribeLink = {
  color: "#888888",
  textDecoration: "underline",
};
