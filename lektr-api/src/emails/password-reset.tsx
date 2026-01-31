/**
 * Password Reset Email Template
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

interface PasswordResetEmailProps {
  resetUrl: string;
  expiresInMinutes: number;
}

export const PasswordResetEmail = ({ resetUrl, expiresInMinutes }: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your Lektr password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reset Your Password</Heading>
          <Text style={text}>
            We received a request to reset your Lektr password. Click the button below 
            to create a new password:
          </Text>
          <Link href={resetUrl} style={button}>
            Reset Password
          </Link>
          <Text style={text}>
            This link will expire in {expiresInMinutes} minutes.
          </Text>
          <Text style={text}>
            If you didn't request this, you can safely ignore this email. Your password 
            won't be changed.
          </Text>
          <Text style={footer}>
            — The Lektr Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetEmail;

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
  margin: "16px 0",
};

const button = {
  backgroundColor: "#6366f1",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
  padding: "12px 24px",
  textDecoration: "none",
  textAlign: "center" as const,
  margin: "16px 0",
};

const footer = {
  color: "#888888",
  fontSize: "14px",
  lineHeight: "1.6",
  marginTop: "32px",
};
