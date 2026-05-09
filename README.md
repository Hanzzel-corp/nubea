# Nubea

**Nubea** is a minimal no-history browser prototype focused on clean navigation, live inspection, and cognitive pollution awareness.

It is not designed to compete with Chrome, Firefox, Brave, or Edge as a full browser engine. Nubea uses Electron/Chromium underneath, but defines its own browsing frame, interface, modes, and philosophy.

> Nubea does not store your browsing history.  
> It shows what the current page tries to load, request, track, or connect to in real time.

---

## Core idea

Modern websites often load far more than the content the user originally intended to see. Around a single page there may be analytics, advertising scripts, cookies, external domains, embeds, recommendation systems, video trackers, notification prompts, and identity-sync mechanisms.

Nubea exposes that layer.

The goal is not to hide the user or promise absolute privacy. The goal is simpler and clearer:

> **Navigate without local history by design, and see the live activity surrounding the page you visit.**

---

## Current status

**Version:** `v0.1.0`  
**State:** Functional prototype  
**Platform tested:** Linux / Ubuntu environment  
**Stack:** Electron + Node.js + Chromium WebView

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
  - active domain
  - requests
  - external domains
  - attempted cookies
  - permission requests
  - blocked requests
  - last blocked domain
- Three browsing modes:
  - **Normal**
  - **Limpio**
  - **Espejo**

---

## Browsing modes

### Normal

Loads the page normally and displays live activity.

Useful to see how much external activity a page triggers without blocking it.

### Limpio

Blocks known advertising, analytics, and tracking-related requests.

This mode keeps the page more usable while reducing commercial and tracking noise.

### Espejo

Aggressively blocks third-party requests.

This mode may break parts of websites, but it reveals how dependent a page is on external systems.

---

## Philosophy

Nubea follows a few strict principles:

```text
No history by design.
No user profile.
No account requirement.
No hidden telemetry.
No three-dot menu.
No unnecessary interface layers.
Live inspection only.
The user decides where to navigate.

Nubea does not try to decide for the user. It only exposes what is happening around the current page.

Cognitive pollution

Nubea introduces the idea of cognitive pollution as the extra layer of noise between the user’s original intention and the content they wanted to access.

A user may enter a page to read an article, but the page may also trigger:

external scripts
advertising networks
cookie attempts
analytics calls
autoplay systems
recommendation systems
tracking pixels
notification prompts
embedded third-party systems

Nubea makes that activity visible.

Project structure
nubea-browser/
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
└── src/
    ├── main.js
    ├── preload.js
    ├── index.html
    ├── styles.css
    └── renderer.js
Install
npm install
Run
npm start
Technical notes

Nubea currently uses Electron with a temporary session partition. The browser does not implement a custom web rendering engine. Rendering is handled by Chromium through Electron.

The value of Nubea is not the rendering engine. The value is the browsing frame:

Nubea = browser frame + live inspection + no-history principle
Chromium = rendering engine
Search engines = external tools selected by the user
Responsibility notice

Nubea gives the user freedom to navigate. The websites visited and the way the browser is used remain the responsibility of the user.

Nubea gives you access to the web, not direction.
Where you go and how you use it is your responsibility.

Roadmap

Planned improvements:

Multiple real tabs
Stronger session cleanup
Better blocker rules
Per-site permission panel
Exportable live inspection report
Local-only settings file
AppImage / .deb packaging
Better visual identity
Security hardening
Automated tests
Clearer cognitive pollution score
License

MIT

Author

Developed under the Hanzzel Corp ecosystem.
