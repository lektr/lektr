---
sidebar_position: 3
---

# 📊 Telemetry

Telemetry is how we understand what's working and what needs improvement in Lektr. Think of it as a friendly check-in that helps us make the platform better for everyone.

## 🤔 Why Telemetry Matters

Building open-source software is like cooking for a party—you never really know which dishes people love until you see what gets eaten. Telemetry helps us figure out:

- **What features people actually use**
  Are people using the Kindle extension more than manual imports? Should we invest more time in the web clipper?
  
- **Where to focus development**
  If most users have libraries with 10,000+ highlights, we know we need to optimize for scale. If most use semantic search heavily, we can prioritize better embedding models.

- **System Health**
  Are automatic imports failing? Is the background job queue getting stuck? Telemetry helps us spot these trends without needing you to file a bug report.

## 🔒 What We Collect (And Don't Collect)

We take privacy seriously. Lektr is a local-first application, and your data belongs to you.

### ✅ What We DO Collect

- **Anonymous ID**: A random UUID that identifies your Lektr instance (but not you!).
- **App Version**: Which version of Lektr you're running.
- **Usage Statistics**: 
  - Total number of books
  - Total number of highlights
  - Tags usage count
- **System Info**:
  - Theme preference (light/dark/auto)
  - Extension connection status (is the browser extension detected?)
  - Database type (e.g., SQLite)

### ❌ What We DON'T Collect

We intentionally exclude anything personal or sensitive:

- **Book Content**: We never track book titles, authors, cover images, or text content.
- **Highlight Text**: Your highlights and notes are strictly local.
- **Personal Information**: No email addresses, usernames, or passwords.
- **Network Data**: We configure our telemetry provider (PostHog) to discard IP addresses.

Everything is aggregated and anonymous. We legitimately cannot tie this data back to you as an individual.

## 🛠️ How It Works

Telemetry data is sent periodically and on specific events (like adding a book). 

### How to Disable Telemetry

We default telemetry to **On** because it helps the project grow, but we respect your choice to opt out.

1. Go to **Settings** (click the gear icon in the sidebar).
2. Scroll to the **Privacy & Telemetry** section.
3. Toggle the switch to **Off**.

That's it! No hard feelings. The system will immediately stop sending events.
