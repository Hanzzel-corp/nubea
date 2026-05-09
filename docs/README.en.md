# Nubea

**Nubea** is a minimal no-history browser prototype focused on clean navigation, live inspection, and cognitive pollution awareness.

It is not designed to compete with Chrome, Firefox, Brave, or Edge as a full browser engine. Nubea uses Electron/Chromium underneath, but defines its own browsing frame, interface, modes, and philosophy.

> Nubea does not store your browsing history.  
> It shows what the current page tries to load, request, track, or connect to in real time.

---

## Core Idea

Modern websites often load far more than the content the user originally intended to see. Around a single page there may be analytics, advertising scripts, cookies, external domains, embeds, recommendation systems, video trackers, notification prompts, and identity-sync mechanisms.

Nubea exposes that layer.

The goal is not to hide the user or promise absolute privacy. The goal is simpler and clearer:

> **Navigate without local history by design, and see the live activity surrounding the page you visit.**

---

## Current Status

| Attribute | Value |
|-----------|-------|
| **Version** | `v0.1.0` |
| **State** | Functional prototype |
| **Platform tested** | Linux / Ubuntu environment |
| **Stack** | Electron + Node.js + Chromium WebView |

This is an early prototype. It already opens pages, switches modes, blocks selected requests, and shows live page activity. It is not yet a production browser.

---

## Features in v0.1

- Custom desktop window
- No classic browser frame
- Letter-based window controls:
  - `P` = minimize / pequeño
  - `G` = maximize / grande
  - `C` = close / cerrar
- No user profile
- No three-dot menu
- No visible back/forward buttons
- Refresh through button or `F5`
- Bottom tabs inspired by spreadsheet tabs
- Right sidebar as the main control panel
- Search through selectable search engines:
  - Google
  - Bing
  - DuckDuckGo
  - Brave Search
- Temporary browsing session
- No local browsing history by design
- Live page inspection:
  - Active domain
  - Requests
  - External domains
  - Attempted cookies
  - Permission requests
  - Blocked requests
  - Last blocked domain
- Three browsing modes:
  - **Normal**
  - **Limpio (Clean)**
  - **Espejo (Mirror)**

---

## Browsing Modes

### Normal

Loads the page normally and displays live activity.

Useful to see how much external activity a page triggers without blocking it.

### Limpio (Clean)

Blocks known advertising, analytics, and tracking-related requests.

This mode keeps the page more usable while reducing commercial and tracking noise.

### Espejo (Mirror)

Aggressively blocks third-party requests.

This mode may break parts of websites, but it reveals how dependent a page is on external systems.

---

## Philosophy

Nubea follows a few strict principles:

```
No history by design.
No user profile.
No account requirement.
No hidden telemetry.
No three-dot menu.
No unnecessary interface layers.
Live inspection only.
The user decides where to navigate.
```

Nubea does not try to decide for the user. It only exposes what is happening around the current page.

### Cognitive Pollution

Nubea introduces the idea of **cognitive pollution** as the extra layer of noise between the user's original intention and the content they wanted to access.

A user may enter a page to read an article, but the page may also trigger:

- External scripts
- Advertising networks
- Cookie attempts
- Analytics calls
- Autoplay systems
- Recommendation systems
- Tracking pixels
- Notification prompts
- Embedded third-party systems

Nubea makes that activity visible.

---

## Quick Start

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

```bash
npm install
```

### Run

```bash
npm start
```

### Build & Package

```bash
# Build for Linux (AppImage + .deb)
npm run build

# Build only AppImage
npm run build:appimage

# Build only .deb package
npm run build:deb
```

---

## GitHub Quick Start

New to Git/GitHub? See [GIT_GUIDE.md](../GIT_GUIDE.md) for step-by-step instructions.

Want to contribute? See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### First Push to GitHub

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit: Nubea v0.1.0"

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/nubea-browser.git
git branch -M main
git push -u origin main
```

### Creating a Release

```bash
# Tag a new version
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0
```

GitHub Actions will automatically build AppImage and .deb packages.

---

## Technical Notes

Nubea currently uses Electron with a temporary session partition. The browser does not implement a custom web rendering engine. Rendering is handled by Chromium through Electron.

The value of Nubea is not the rendering engine. The value is the browsing frame:

| Component | Role |
|-----------|------|
| **Nubea** | Browser frame + live inspection + no-history principle |
| **Chromium** | Rendering engine |
| **Search engines** | External tools selected by the user |

---

## Project Structure

```
nubea-browser/
├── docs/                  # Documentation
│   ├── README.en.md       # English documentation
│   ├── README.es.md       # Spanish documentation
│   └── ARCHITECTURE.md    # System architecture
├── src/                   # Source code
│   ├── main.js            # Electron main process
│   ├── preload.js         # Preload script (security)
│   ├── index.html         # Main UI
│   ├── styles.css         # Styling
│   └── renderer.js        # UI logic
├── .github/workflows/     # CI/CD automation
│   └── release.yml        # Auto-build releases
├── package.json           # Dependencies & scripts
├── package-lock.json      # Lock file
├── README.md              # Main entry
├── CONTRIBUTING.md        # Contribution guide
├── GIT_GUIDE.md         # Git tutorial
└── .gitignore             # Git exclusions
```

---

## Roadmap

Planned improvements:

- [ ] Multiple real tabs
- [ ] Stronger session cleanup
- [ ] Better blocker rules
- [ ] Per-site permission panel
- [ ] Exportable live inspection report
- [ ] Local-only settings file
- [ ] AppImage / .deb packaging
- [ ] Better visual identity
- [ ] Security hardening
- [ ] Automated tests
- [ ] Clearer cognitive pollution score

---

## License

MIT

---

## Author

Developed under the Hanzzel Corp ecosystem.
