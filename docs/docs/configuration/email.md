---
sidebar_position: 1
---

# Email Configuration

This page covers email configuration in detail for the Lektr application.

For a complete guide including setup steps, provider-specific instructions, and troubleshooting, see the [Email Setup Guide](/admin/email-setup).

## Quick Reference

### Required Environment Variables

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
MAIL_FROM_EMAIL=noreply@yourdomain.com
```

### Optional Variables

```bash
SMTP_SECURE=false            # Use SSL/TLS (port 465)
MAIL_FROM_NAME=Lektr         # Display name in emails
APP_URL=https://example.com  # Base URL for email links
DIGEST_CRON=0 8 * * *       # Daily digest schedule
```

## Configuration Priority

1. **Database settings** (configured via Admin UI) take highest priority
2. **Environment variables** are used as fallback
3. **Defaults** are used if nothing is configured

This allows you to:
- Set initial config via environment variables
- Override via Admin UI without redeploying
- Keep sensitive credentials in environment for security
