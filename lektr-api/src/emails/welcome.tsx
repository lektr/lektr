/**
 * Welcome Email Template
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  userEmail: string;
  appUrl: string;
}

export const WelcomeEmail = ({ userEmail, appUrl }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Lektr - Your reading highlights, organized</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Lektr! 📚</Heading>
          <Text style={text}>
            Hi there,
          </Text>
          <Text style={text}>
            Thanks for joining Lektr! We're excited to help you organize and rediscover 
            your reading highlights.
          </Text>
          <Text style={text}>
            With Lektr, you can:
          </Text>
          <Text style={listItem}>📖 Import highlights from Kindle, KOReader, and more</Text>
          <Text style={listItem}>🔍 Search your highlights using semantic AI search</Text>
          <Text style={listItem}>🏷️ Organize with tags and collections</Text>
          <Text style={listItem}>📬 Get daily digest emails with spaced repetition</Text>
          <Text style={text}>
            <Link href={appUrl} style={link}>
              Go to your library →
            </Link>
          </Text>
          <Text style={footer}>
            Happy reading!
            <br />
            The Lektr Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.3",
  margin: "0 0 20px",
};

const text = {
  color: "#4a4a4a",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const listItem = {
  color: "#4a4a4a",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 8px",
  paddingLeft: "8px",
};

const link = {
  color: "#6366f1",
  textDecoration: "none",
  fontWeight: "500",
};

const footer = {
  color: "#888888",
  fontSize: "14px",
  lineHeight: "1.6",
  marginTop: "32px",
};
