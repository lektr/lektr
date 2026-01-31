---
sidebar_position: 2
---

# Email Setup

Lektr includes a comprehensive email system for sending transactional and digest emails. This guide covers configuring SMTP settings, testing the connection, and understanding the email types.

## Overview

Lektr supports three types of emails:

| Email Type | Purpose | Trigger |
|------------|---------|---------|
| **Welcome** | Greets new users | User registration |
| **Password Reset** | Account recovery link | Forgot password request |
| **Daily Digest** | Highlights due for review | Scheduled (8 AM daily) |

## Configuration Methods

You can configure email settings in two ways:

1. **Admin UI** (Recommended) - Configure via the web interface
2. **Environment Variables** - Set in `.env` or Docker Compose

The Admin UI settings take precedence over environment variables.

---

## Admin UI Configuration

1. Log in as an admin user
2. Navigate to **Admin → Settings**
3. Scroll to the **📧 Email Configuration** section

### SMTP Settings

| Field | Description | Example |
|-------|-------------|---------|
| **SMTP Host** | Mail server hostname | `smtp.gmail.com` |
| **SMTP Port** | Server port | `587` (TLS) or `465` (SSL) |
| **SMTP Username** | Authentication username | `your@email.com` |
| **SMTP Password** | Authentication password | `app-specific-password` |
| **Use TLS/SSL** | Enable secure connection | Checked for port 465 |

### Sender Information

| Field | Description | Example |
|-------|-------------|---------|
| **Sender Name** | Display name in emails | `Lektr` |
| **Sender Email** | From address | `noreply@yourdomain.com` |

### Testing Your Configuration

1. Enter a test email address in the "Test Connection" field
2. Click **Send Test**
3. Check your inbox for the test email

:::tip
If the test fails, check your SMTP credentials and ensure your email provider allows SMTP access.
:::

---

## Environment Variable Configuration

Add these to your `.env` file:

```bash
# SMTP Server Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_SECURE=false  # Set to 'true' for port 465

# Sender Information
MAIL_FROM_NAME=Lektr
MAIL_FROM_EMAIL=noreply@yourdomain.com

# Application URL (used in email links)
APP_URL=https://lektr.yourdomain.com

# Optional: Custom digest schedule (cron expression)
DIGEST_CRON=0 8 * * *  # 8 AM daily
```

### Docker Compose Example

```yaml
services:
  lektr-api:
    environment:
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_USER=${GMAIL_USER}
      - SMTP_PASS=${GMAIL_APP_PASSWORD}
      - SMTP_SECURE=false
      - MAIL_FROM_NAME=Lektr
      - MAIL_FROM_EMAIL=noreply@yourdomain.com
      - APP_URL=https://lektr.yourdomain.com
```

---

## Provider-Specific Guides

### Gmail

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password at [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use these settings:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_SECURE=false
```

:::caution
Never use your regular Gmail password. Always use an App Password.
:::

### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_SECURE=false
```

### Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_SECURE=false
```

### Amazon SES

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-access-key-id
SMTP_PASS=your-ses-secret-access-key
SMTP_SECURE=false
```

---

## Daily Digest

The daily digest email sends users their highlights that are due for spaced repetition review.

### How It Works

1. **Scheduling**: Runs daily at 8 AM (configurable via `DIGEST_CRON`)
2. **Selection Algorithm**: Uses FSRS (Free Spaced Repetition Scheduler)
   - First, selects highlights due for review
   - If not enough, adds new/unreviewed highlights
   - Falls back to random highlights for discovery
3. **Highlights per email**: 5 highlights
4. **User opt-out**: Users can disable digests in their settings

### Customizing the Schedule

Use standard cron syntax in `DIGEST_CRON`:

```bash
# Examples
DIGEST_CRON=0 8 * * *    # 8 AM daily
DIGEST_CRON=0 7 * * 1-5  # 7 AM weekdays only
DIGEST_CRON=0 9 * * 0    # 9 AM Sundays only
```

### Triggering a Test Digest

For testing, you can manually trigger a digest via the API:

```bash
curl -X POST http://localhost:3001/api/v1/admin/digest/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Test email not received

1. Check spam/junk folder
2. Verify SMTP credentials
3. Check API logs: `docker compose logs lektr-api | grep email`

### Connection timeouts

- Ensure your firewall allows outbound connections on the SMTP port
- Try port 587 (STARTTLS) instead of 465 (SSL)

### Authentication errors

- Gmail: Ensure you're using an App Password, not your account password
- Check that special characters in passwords are properly escaped in `.env`

### Emails landing in spam

- Use a verified sender domain
- Set up SPF, DKIM, and DMARC records
- Use a reputable email provider (SendGrid, Mailgun, SES)

---

## Architecture Details

For developers, here's how the email system works:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ Email       │─────▶│ Job Queue    │─────▶│ SMTP        │
│ Service     │      │ (PostgreSQL) │      │ Transport   │
└─────────────┘      └──────────────┘      └─────────────┘
      │
      ▼
┌─────────────┐
│ React Email │
│ Templates   │
└─────────────┘
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| EmailService | `src/services/email.ts` | SMTP transport, config loading |
| JobQueueService | `src/services/job-queue.ts` | Reliable delivery with retries |
| DigestService | `src/services/digest.ts` | Daily digest scheduling & FSRS |

### Email Templates

Located in `lektr-api/src/emails/`:

- `welcome.tsx` - New user welcome
- `password-reset.tsx` - Password recovery
- `daily-digest.tsx` - Daily highlights digest

Templates use [React Email](https://react.email/) for modern, responsive HTML emails.

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/admin/email-settings` | GET | Get current config |
| `/api/v1/admin/email-settings` | PUT | Update config |
| `/api/v1/admin/email-settings/test` | POST | Send test email |
| `/api/v1/admin/job-queue/status` | GET | Queue status |

### Example: Update Email Settings

```bash
curl -X PUT http://localhost:3001/api/v1/admin/email-settings \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "smtp_host": "smtp.gmail.com",
    "smtp_port": "587",
    "smtp_user": "your@email.com",
    "smtp_pass": "app-password",
    "smtp_secure": "false",
    "mail_from_name": "Lektr",
    "mail_from_email": "noreply@example.com"
  }'
```

### Example: Send Test Email

```bash
curl -X POST http://localhost:3001/api/v1/admin/email-settings/test \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{"email": "test@example.com"}'
```
