---
sidebar_position: 1
---

# Admin Settings

The Admin Settings page provides configuration options for system-wide settings. Access it via the navigation menu when logged in as an admin user.

## Email Configuration

Configure SMTP settings for sending transactional and digest emails.

See the detailed [Email Setup Guide](/admin/email-setup) for complete instructions.

## Highlight Limits

Control the maximum sizes for content storage:

| Setting | Default | Description |
|---------|---------|-------------|
| **Maximum Highlight Length** | 5000 | Characters before truncation on import |
| **Maximum Note Length** | 1000 | Max characters for user notes |
| **Display Collapse Length** | 500 | Show "Read more" toggle for longer highlights |

:::info
Changing these limits does not retroactively modify existing data. Existing highlights that exceed new limits will remain intact.
:::

## Appearance

| Setting | Options | Description |
|---------|---------|-------------|
| **Default Theme** | Auto, Light, Dark | Set the default theme for new users |

Users can override this with their personal preference in their user settings.

## Library Maintenance

### Refresh Missing Covers

Fetches book metadata and cover images from Hardcover.app for books that don't have covers.

**How it works:**
1. Identifies books without cover images
2. Searches Hardcover.app by title and author
3. Updates book metadata and downloads covers

:::tip
Set up your `HARDCOVER_API_KEY` in environment variables for best results.
:::

## Saving Changes

Click **Save Settings** to apply changes. Changes take effect immediately.
