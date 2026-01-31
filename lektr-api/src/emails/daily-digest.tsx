/**
 * Daily Digest Email Template
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
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
}

export const DailyDigestEmail = ({ highlights, appUrl, unsubscribeUrl }: DailyDigestEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your daily reading highlights from Lektr</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📚 Your Daily Highlights</Heading>
          <Text style={intro}>
            Here are today's highlights to revisit. Take a moment to reflect on these 
            passages from your reading:
          </Text>
          
          {highlights.map((highlight, index) => (
            <React.Fragment key={highlight.id}>
              {index > 0 && <Hr style={divider} />}
              <Text style={quote}>"{highlight.content}"</Text>
              <Text style={attribution}>
                — {highlight.bookTitle}
                {highlight.bookAuthor && ` by ${highlight.bookAuthor}`}
              </Text>
            </React.Fragment>
          ))}
          
          <Hr style={divider} />
          
          <Text style={text}>
            <Link href={appUrl} style={link}>
              View all your highlights →
            </Link>
          </Text>
          
          <Text style={footer}>
            You're receiving this because you have Daily Digest enabled.
            <br />
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Unsubscribe from digest emails
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
  fontWeight: "600",
  lineHeight: "1.3",
  margin: "0 0 20px",
};

const intro = {
  color: "#4a4a4a",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const text = {
  color: "#4a4a4a",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "16px 0",
};

const quote = {
  color: "#1a1a1a",
  fontSize: "17px",
  fontStyle: "italic",
  lineHeight: "1.7",
  margin: "16px 0 8px",
  padding: "0 16px",
  borderLeft: "3px solid #6366f1",
};

const attribution = {
  color: "#666666",
  fontSize: "14px",
  margin: "0 0 16px",
  paddingLeft: "16px",
};

const divider = {
  borderColor: "#e6e6e6",
  margin: "24px 0",
};

const link = {
  color: "#6366f1",
  textDecoration: "none",
  fontWeight: "500",
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
