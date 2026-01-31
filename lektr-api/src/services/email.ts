/**
 * Email Service
 * 
 * Sends emails using Nodemailer with SMTP configuration loaded from DB or environment.
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { db } from "../db";
import { settings } from "../db/schema";
import { eq } from "drizzle-orm";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;
  private configLoadedAt: Date | null = null;
  private readonly CONFIG_TTL_MS = 60000; // Reload config every 60 seconds

  /**
   * Load email configuration from database, falling back to environment variables.
   */
  private async loadConfig(): Promise<EmailConfig | null> {
    // Check if we have recent config
    if (this.config && this.configLoadedAt) {
      const age = Date.now() - this.configLoadedAt.getTime();
      if (age < this.CONFIG_TTL_MS) {
        return this.config;
      }
    }

    try {
      // Try to load from database first
      const dbSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.key, "smtp_host"))
        .then(async (rows) => {
          if (rows.length === 0) return null;
          
          const allSettings = await db.select().from(settings);
          const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));
          
          return {
            host: settingsMap.get("smtp_host") || "",
            port: parseInt(settingsMap.get("smtp_port") || "587"),
            secure: settingsMap.get("smtp_secure") === "true",
            user: settingsMap.get("smtp_user") || "",
            pass: settingsMap.get("smtp_pass") || "",
            fromName: settingsMap.get("mail_from_name") || "Lektr",
            fromEmail: settingsMap.get("mail_from_email") || "",
          };
        });

      if (dbSettings && dbSettings.host) {
        this.config = dbSettings;
        this.configLoadedAt = new Date();
        this.transporter = null; // Reset transporter to use new config
        return this.config;
      }

      // Fall back to environment variables
      const envHost = process.env.SMTP_HOST;
      if (envHost) {
        this.config = {
          host: envHost,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
          fromName: process.env.MAIL_FROM_NAME || "Lektr",
          fromEmail: process.env.MAIL_FROM_EMAIL || "",
        };
        this.configLoadedAt = new Date();
        this.transporter = null;
        return this.config;
      }

      return null;
    } catch (error) {
      console.error("Failed to load email config:", error);
      return null;
    }
  }

  /**
   * Get or create the Nodemailer transporter.
   */
  private async getTransporter(): Promise<Transporter | null> {
    const config = await this.loadConfig();
    if (!config) {
      console.warn("Email service not configured");
      return null;
    }

    if (this.transporter) {
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? {
        user: config.user,
        pass: config.pass,
      } : undefined,
    });

    return this.transporter;
  }

  /**
   * Send an email.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      console.error("Cannot send email: transporter not configured");
      return false;
    }

    const config = this.config!;

    try {
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject,
        html,
      });
      console.log(`📧 Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Test the SMTP connection.
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      return { success: false, error: "Email not configured" };
    }

    try {
      await transporter.verify();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Check if email is configured.
   */
  async isConfigured(): Promise<boolean> {
    const config = await this.loadConfig();
    return config !== null && config.host.length > 0;
  }
}

export const emailService = new EmailService();
