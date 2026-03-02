<div align="center">

# RewordIt

### Communicate without regret.

**RewordIt** is a Chrome Extension that acts as your AI-powered emotional safety net. It silently monitors your typing across every platform — Gmail, Slack, Twitter, WhatsApp, LinkedIn, and Instagram — and catches high-stress messages before you press send.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-rewordit.vercel.app-d4a853?style=for-the-badge)](https://rewordit.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-azhan--ali-white?style=for-the-badge&logo=github)](https://github.com/azhan-ali/Rewordit---Mindcode-Hackathon)
[![Track](https://img.shields.io/badge/Track-Interface%20Alchemists-a87ad4?style=for-the-badge)](https://rewordit.vercel.app)
[![Hackathon](https://img.shields.io/badge/MINDCODE-Hackathon%202026-e05540?style=for-the-badge)](https://rewordit.vercel.app)

</div>

---

## 📖 Interactive Feature Guide

> **Before reading further** — open this first. It shows every feature with live examples, real UI mockups, and interactive demos.

### 👉 [View Full Interactive Guide →](./rewordit-story-updated.html)

*Download the file → Open in browser → Scroll through all 7 features with live demos*

---

## The Problem

Every day, people send messages they immediately regret — a frustrated email to a boss, an angry reply to a colleague, a harsh text to someone they care about. These moments damage relationships, careers, and mental health. There is no safety net between your emotions and the send button.

**RewordIt is that safety net.**

---

## How It Works

```
You type a message
        ↓
RewordIt detects a 1-second pause (debounce)
        ↓
Gemini AI analyzes: stress score + emotions + rewrites
        ↓
Score > 50  →  Calm rewrite popup appears
Score > 85  →  15-second Psychological Pause enforced
        ↓
Your choice: Use the calm version, pick a tone, or send anyway
        ↓
Every result saved locally → Dashboard + Weekly Report
```

---

## 7 Features

### 01 — Real-time Tone Detection + AI Rewrite
`CORE` `ALL PLATFORMS` `ALWAYS ON`

RewordIt monitors every text box on every website. The moment you pause for 1 second after typing 10+ words, Gemini AI analyzes your message and returns a stress score (0–100), detected emotions, and a calmer rewritten version — all in a single API call.

If the stress score is above 50, a non-intrusive popup appears with:
- Your stress score and color-coded bar
- Detected emotions (e.g., frustrated, accusatory)
- A calm, professional rewrite suggestion
- Two buttons: **Use This** or **Keep Mine**

---

### 02 — Psychological Pause
`CIRCUIT BREAKER` `TRIGGERS AT 85+`

For your worst moments. If your stress score hits critical levels (85+) and you still choose to click "Send Anyway", RewordIt enforces a mandatory **15-second lockdown**. The message cannot be sent. This psychological pause forces you to breathe and reconsider before the damage is done.

- Timer counts down in real-time
- Option to edit the message during the pause
- Option to send when the timer completes
- All cooling periods are logged in your dashboard

---

### 03 — Tone Translator ✨ NEW
`ON-DEMAND TOGGLE` `MULTIPLE STYLES`

Not just for emergencies. Click the RewordIt icon on any text box to activate Tone Translator mode. Paste your draft — Gemini rewrites it into three different styles instantly.

| Tone | Use Case |
|------|----------|
| 🏢 Professional | Boss, client, formal email |
| ⚡ Direct | Clear and assertive, but respectful |
| 🌊 Chill | Friends, casual messages |

Zero extra API calls — all three tones come from the same single Gemini request as the core detection.

---

### 04 — Premium Analytics Dashboard
`SECURE LOCAL DASHBOARD` `PLATFORM BREAKDOWN`

An immersive analytics dashboard that shows your emotional state over the past 7 days. All data is read directly from your local browser storage — no server involved.

**Dashboard includes:**
- 4 stat cards: Total analyzed, High stress count, Rewrites accepted, Cooling periods triggered
- **7-Day Mood Timeline** — bar chart with color-coded stress levels (green / orange / red)
- **Platform Breakdown** — which apps stress you the most (Gmail vs Slack vs Twitter vs WhatsApp)
- Auto-generated insight text based on your patterns

---

### 05 — Tone Distribution / Persona Radar 🔥 HOT
`VISUAL PERSONA` `30-DAY TRACKER`

Discover your communication persona. Every analyzed message saves emotion metadata. Over 30 days, the dashboard aggregates all patterns and shows you what kind of communicator you actually are.

```
Professional  ████████░░  65%
Chill         ██████░░░░  48%
Aggressive    ███░░░░░░░  28%
Anxious       ██░░░░░░░░  15%
```

Most people have never seen their own communication fingerprint before.

---

### 06 — Calm Streak Heatmap ✨ NEW
`30-DAY TRACKER` `GITHUB-STYLE`

A beautifully designed, GitHub-style contribution graph for your mental health. Every day is a colored cell — green for calm, red for critical. Track your consistency, visualize your progress, and stay motivated to keep your streak alive.

- 30-day grid updated daily
- Hover any cell to see that day's average stress score
- Best streak counter and monthly calm day ratio
- Calculated entirely in the browser from local storage

---

### 07 — Weekly Mental Health Report + PDF Export
`AUTO EVERY SUNDAY` `PERSONALIZED AI TIPS` `PDF EXPORT`

Every Sunday, the dashboard automatically generates a comprehensive breakdown of your digital well-being for the past week.

**Report includes:**
- Total messages analyzed
- High stress message count and percentage
- Rewrite acceptance rate
- Number of cooling periods triggered
- Most stressed day and calmest day
- Most used platform
- AI-generated personalized tip based on your specific patterns

**Export as PDF** — download a premium-formatted report with one click to save, print, or share.

---

## Privacy — The Core Promise

> **All data stays on your device. Forever.**

| What happens | Details |
|---|---|
| Where data is stored | `chrome.storage.local` — your browser only |
| What leaves your device | Nothing. Zero. |
| Server involvement | None. No backend. |
| Your API key | Embedded locally via JSZip — never transmitted |
| Different users | Each user's data is completely isolated by Chrome |

RewordIt was built on the principle that your emotional patterns are deeply personal. We will never touch them.

---

## Installation

### Step 1 — Get a Free Gemini API Key

Go to [aistudio.google.com](https://aistudio.google.com/app/apikey) → Sign in with Google → **Get API Key** → **Create API Key** → Copy it.

It is completely free. No credit card required. Daily limit: 1,500 requests.

### Step 2 — Download Your Extension

Visit **[rewordit.vercel.app](https://rewordit.vercel.app)** → Scroll to the Install section → Paste your API key → Click **Download My RewordIt**.

The website uses JSZip to embed your key directly into the extension package in your browser. Your key is never sent to any server.

### Step 3 — Load in Chrome

1. Extract the downloaded ZIP file
2. Open Chrome and go to `chrome://extensions/`
3. Toggle **Developer mode** ON (top right corner)
4. Click **Load unpacked**
5. Select the extracted `rewordit-extension` folder
6. Done — RewordIt is now active on all websites

---

## Platforms Supported

| Platform | Status |
|----------|--------|
| Gmail | ✅ Full support |
| Slack | ✅ Full support |
| Twitter / X | ✅ Full support |
| WhatsApp Web | ✅ Full support |
| LinkedIn | ✅ Full support |
| Instagram | ✅ Full support |
| All other websites | ✅ Works on any `textarea` or `contenteditable` element |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Extension | Chrome Manifest V3 |
| AI | Google Gemini 2.0 Flash API |
| Content Scripts | Vanilla JavaScript — `content.js` |
| Background Service | Chrome Service Worker — `background.js` |
| Data Storage | `chrome.storage.local` |
| Website | HTML, CSS, Vanilla JavaScript |
| Charts | Chart.js |
| ZIP Packaging | JSZip |
| Hosting | Vercel |

---

## Project Structure

```
Rewordit---Mindcode-Hackathon/
│
├── RewordIt/
│   ├── extension/
│   │   ├── manifest.json          # Chrome extension config
│   │   ├── content.js             # Injects into every website
│   │   ├── background.js          # Gemini API calls + storage
│   │   ├── popup.html             # Extension popup UI
│   │   └── popup.css              # Popup styling
│   │
│   └── website/
│       ├── index.html             # Landing page
│       ├── dashboard.html         # Analytics dashboard
│       └── rewordit-extension.zip # Base extension (API key placeholder)
│
├── rewordit-story-updated.html    # 📖 Interactive feature guide
├── vercel.json                    # Vercel deployment config
└── README.md                      # This file
```

---

## Architecture — How Extension Talks to Dashboard

The dashboard reads data from the Chrome extension using Chrome's external messaging API.

```
Website (rewordit.vercel.app)
    │
    │  chrome.runtime.sendMessage(extensionId, {type: 'getData'})
    ↓
Chrome Extension (background.js)
    │  Listens via onMessageExternal
    │
    ↓
chrome.storage.local
    │  Returns messages array
    ↓
Dashboard renders charts + report
```

This connection is secured by `externally_connectable` in `manifest.json` — only the RewordIt website can communicate with the extension. No other website can access your data.

---

## Data Schema

Every analyzed message is saved in this format:

```json
{
  "timestamp": 1709123456000,
  "stress_score": 78,
  "emotions": ["frustrated", "accusatory"],
  "platform": "mail.google.com",
  "rewrite_accepted": true,
  "cooling_triggered": false
}
```

---

## Built For

**MINDCODE Hackathon 2026** — Track 3: Interface Alchemists

> *"Turn everyday interactions into health-positive moments."*

RewordIt is a direct answer to the track prompt: *"Keyboard suggesting rephrasing stressful messages"* — and then some.

---

## Author

**Azhan Ali** — Developer

- GitHub: [@azhan-ali](https://github.com/azhan-ali)
- Live Project: [rewordit.vercel.app](https://rewordit.vercel.app)

---

## License

MIT License — free to use, modify, and distribute.

---

<div align="center">

**RewordIt** · MINDCODE Hackathon 2026 · Built with ❤️ and Gemini AI

*Every rewrite is a better conversation.*

</div>
