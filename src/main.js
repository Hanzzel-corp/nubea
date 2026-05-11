const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("node:path");

let mainWindow = null;

const NUBEA_PARTITION = "nubea-temp"; // sin "persist:" => sesión temporal/en memoria

let currentMode = "normal";
let activeHost = "";

const CATEGORY_KEYS = [
  "analytics",
  "ads",
  "social",
  "cdn",
  "fonts",
  "embed",
  "consent",
  "media",
  "other"
];

const BLOCKABLE_IN_LIMPIO = new Set([
  "analytics",
  "ads",
  "social",
  "consent"
]);

const CLASSIFIERS = [
  {
    category: "analytics",
    hosts: [
      "google-analytics.com",
      "analytics.google.com",
      "hotjar.com",
      "chartbeat.com",
      "quantserve.com",
      "scorecardresearch.com",
      "permutive.com",
      "newsroom.bi",
      "go-mpulse.net",
      "sensic.net",
      "datadoghq.com"
    ],
    urlPatterns: ["analytics", "tracker", "tracking", "pixel", "event"]
  },
  {
    category: "ads",
    hosts: [
      "doubleclick.net",
      "googlesyndication.com",
      "googleadservices.com",
      "googleads.g.doubleclick.net",
      "securepubads.g.doubleclick.net",
      "pubads.g.doubleclick.net",
      "pagead2.googlesyndication.com",
      "adnxs.com",
      "criteo.com",
      "taboola.com",
      "outbrain.com",
      "pubmatic.com",
      "rubiconproject.com",
      "openx.net",
      "amazon-adsystem.com",
      "smartadserver.com",
      "bidswitch.net",
      "adsrvr.org",
      "seedtag.com",
      "admanmedia.com",
      "iqzone.com"
    ],
    urlPatterns: ["adservice", "adserver", "adsystem", "prebid", "bidder", "adunit"]
  },
  {
    category: "social",
    hosts: [
      "facebook.com",
      "facebook.net",
      "connect.facebook.net",
      "twitter.com",
      "x.com",
      "platform.twitter.com",
      "tiktok.com",
      "linkedin.com"
    ],
    urlPatterns: ["/tr", "/pixel", "/i/adsct"]
  },
  {
    category: "cdn",
    hosts: [
      "cloudfront.net",
      "akamaihd.net",
      "fastly.net",
      "cloudflare.com",
      "jsdelivr.net",
      "unpkg.com",
      "ebxcdn.com",
      "uecdn.es",
      "arcpublishing.com",
      "estaticos-marca.com"
    ],
    urlPatterns: ["cdn"]
  },
  {
    category: "fonts",
    hosts: [
      "fonts.googleapis.com",
      "fonts.gstatic.com",
      "typekit.net",
      "use.typekit.net"
    ],
    urlPatterns: ["font"]
  },
  {
    category: "embed",
    hosts: [
      "youtube.com",
      "youtu.be",
      "vimeo.com",
      "player.vimeo.com",
      "jwplayer.com"
    ],
    urlPatterns: ["embed", "player"]
  },
  {
    category: "consent",
    hosts: [
      "fundingchoicesmessages.google.com",
      "cmp",
      "consentmanager.net",
      "onetrust.com",
      "cookiebot.com"
    ],
    urlPatterns: ["consent", "cookieconsent", "gdpr", "ccpa"]
  },
  {
    category: "media",
    hosts: [
      "jwplayer.com",
      "brightcove.net",
      "akamaized.net"
    ],
    urlPatterns: ["video", "media", "stream"]
  }
];

const COMMERCIAL_PARAMS = [
  "gclid",
  "gbraid",
  "gad_source",
  "gad_campaignid",
  "fbclid",
  "msclkid",
  "dclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "mc_cid",
  "mc_eid"
];

function freshCategories() {
  return Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 0]));
}

let liveState = {
  host: "—",
  mode: "normal",
  requests: 0,
  external: 0,
  cookies: 0,
  permissions: 0,
  failed: 0,
  blocked: 0,
  wouldBlockInLimpio: 0,
  wouldBlockInEspejo: 0,
  lastExternal: "—",
  lastError: "—",
  lastBlocked: "—",
  icc: 0,
  risk: "bajo",
  allowedNoise: 0,
  allowedRisk: "bajo",
  redirects: 0,
  lastRedirect: "—",
  thirdPartyRedirects: 0,
  lastThirdPartyRedirect: "—",
  identitySyncs: 0,
  lastIdentitySync: "—",
  commercialParams: 0,
  lastCommercialParam: "—",
  categories: freshCategories(),
  measured: 0,
  ads: 0,
  usefulThirdParty: 0,
  embeds: 0,
  otherThirdParty: 0
};

function getHost(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getProtocol(rawUrl) {
  try {
    return new URL(rawUrl).protocol;
  } catch {
    return "";
  }
}

function isSameSite(host, baseHost) {
  if (!host || !baseHost) return false;

  return (
    host === baseHost ||
    host.endsWith("." + baseHost) ||
    baseHost.endsWith("." + host)
  );
}

function hostMatches(host, pattern) {
  if (!host || !pattern) return false;

  const cleanHost = host.toLowerCase().replace(/^www\./, "");
  const cleanPattern = pattern.toLowerCase().replace(/^www\./, "");

  if (cleanPattern.includes(".")) {
    return cleanHost === cleanPattern || cleanHost.endsWith("." + cleanPattern);
  }

  const labels = cleanHost.split(".");
  return labels.includes(cleanPattern);
}

function patternMatches(host, rawUrl, pattern) {
  const lowerUrl = String(rawUrl || "").toLowerCase();
  const lowerPattern = String(pattern || "").toLowerCase();

  if (lowerPattern.includes("/") || lowerPattern.includes("=")) {
    return lowerUrl.includes(lowerPattern);
  }

  if (lowerPattern.includes(".")) {
    return hostMatches(host, lowerPattern);
  }

  return lowerUrl.includes(lowerPattern);
}

function categorize(host, details) {
  const rawUrl = details?.url || "";
  const resourceType = details?.resourceType || "";

  // Primero clasificamos por host. Es más confiable que buscar palabras sueltas en la URL.
  for (const classifier of CLASSIFIERS) {
    const hostHit = classifier.hosts?.some((pattern) => hostMatches(host, pattern));
    if (hostHit) return classifier.category;
  }

  // Después usamos patrones de URL, pero solo como segunda capa.
  for (const classifier of CLASSIFIERS) {
    const urlHit = classifier.urlPatterns?.some((pattern) => patternMatches(host, rawUrl, pattern));
    if (urlHit) return classifier.category;
  }

  // Fallback por tipo de recurso.
  if (resourceType === "font") return "fonts";
  if (resourceType === "media") return "media";

  return "other";
}

function wouldBlock(mode, details, host, category) {
  if (!host || !activeHost) return false;

  const protocol = getProtocol(details.url);
  if (!["http:", "https:"].includes(protocol)) return false;

  const type = details.resourceType || "unknown";
  if (type === "mainFrame") return false;

  const external = !isSameSite(host, activeHost);

  if (mode === "normal") return false;

  if (mode === "limpio") {
    return external && BLOCKABLE_IN_LIMPIO.has(category);
  }

  if (mode === "espejo") {
    return external;
  }

  return false;
}

function looksLikeIdentitySync(rawUrl, fromHost = "", toHost = "") {
  const text = `${rawUrl} ${fromHost} ${toHost}`.toLowerCase();

  return (
    text.includes("sync") ||
    text.includes("cookie") ||
    text.includes("cookiesync") ||
    text.includes("match") ||
    text.includes("cm.g.doubleclick.net") ||
    text.includes("idsync") ||
    text.includes("pixel") ||
    text.includes("uid") ||
    text.includes("adnxs") ||
    text.includes("pubmatic") ||
    text.includes("rubiconproject") ||
    text.includes("bidswitch") ||
    text.includes("casalemedia") ||
    text.includes("openx") ||
    text.includes("seedtag") ||
    text.includes("outbrain") ||
    text.includes("criteo")
  );
}

function isRouteRedirect(details, fromHost, toHost) {
  const type = details.resourceType || "unknown";

  if (type === "mainFrame") return true;

  if (!activeHost || !fromHost || !toHost) return false;

  // Redirección relacionada con el dominio principal.
  return isSameSite(fromHost, activeHost) || isSameSite(toHost, activeHost);
}

function shouldLogRedirect(count) {
  return count <= 10 || count % 25 === 0;
}

function inspectCommercialParams(rawUrl) {
  try {
    const u = new URL(rawUrl);
    let found = 0;
    let last = "—";

    for (const key of COMMERCIAL_PARAMS) {
      if (u.searchParams.has(key)) {
        found += 1;
        last = key;
      }
    }

    liveState.commercialParams = found;
    liveState.lastCommercialParam = last;
  } catch {
    liveState.commercialParams = 0;
    liveState.lastCommercialParam = "—";
  }
}

function riskLabel(score) {
  if (score >= 75) return "crítico";
  if (score >= 50) return "alto";
  if (score >= 25) return "medio";
  return "bajo";
}

function calculateDerivedMetrics() {
  const categories = liveState.categories || freshCategories();

  liveState.measured =
    (categories.analytics || 0) +
    (categories.social || 0);

  liveState.ads = categories.ads || 0;

  liveState.usefulThirdParty =
    (categories.cdn || 0) +
    (categories.fonts || 0);

  liveState.embeds =
    (categories.embed || 0) +
    (categories.media || 0);

  liveState.otherThirdParty = categories.other || 0;

  // ICC detectado:
  // mide contaminación intentada. Incluye bloqueados porque existieron como intento.
  const detectedScore =
    liveState.measured * 1.05 +
    liveState.ads * 1.2 +
    liveState.embeds * 0.55 +
    liveState.otherThirdParty * 0.25 +
    liveState.cookies * 0.55 +
    liveState.blocked * 0.35 +
    liveState.permissions * 8 +
    liveState.failed * 0.25 +
    liveState.redirects * 2 +
    liveState.thirdPartyRedirects * 0.6 +
    liveState.identitySyncs * 1.8 +
    liveState.commercialParams * 7;

  const icc = Math.min(100, Math.round(detectedScore));

  // Ruido permitido:
  // mide lo que queda pasando luego del modo elegido.
  const externalAllowed = Math.max(0, liveState.external - liveState.blocked);
  const measuredAllowed = Math.max(0, liveState.measured - liveState.blocked);
  const adsAllowed = Math.max(0, liveState.ads - liveState.blocked);

  const allowedScore =
    externalAllowed * 0.35 +
    measuredAllowed * 0.9 +
    adsAllowed * 0.9 +
    liveState.cookies * 0.45 +
    liveState.permissions * 8 +
    liveState.failed * 0.25 +
    liveState.redirects * 1 +
    liveState.thirdPartyRedirects * 0.25 +
    liveState.identitySyncs * 0.7 +
    liveState.commercialParams * 4;

  const allowedNoise = Math.min(100, Math.round(allowedScore));

  liveState.icc = icc;
  liveState.risk = riskLabel(icc);
  liveState.allowedNoise = allowedNoise;
  liveState.allowedRisk = riskLabel(allowedNoise);
}

let pendingUpdate = false;

function sendLiveState(immediate = false) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (immediate) {
    pendingUpdate = false;
    calculateDerivedMetrics();
    mainWindow.webContents.send("live:update", liveState);
    return;
  }

  if (pendingUpdate) return;

  pendingUpdate = true;
  setTimeout(() => {
    pendingUpdate = false;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    calculateDerivedMetrics();
    mainWindow.webContents.send("live:update", liveState);
  }, 100);
}

function resetHomeState() {
  activeHost = "";

  liveState = {
    host: "—",
    mode: currentMode,
    requests: 0,
    external: 0,
    cookies: 0,
    permissions: 0,
    failed: 0,
    blocked: 0,
    wouldBlockInLimpio: 0,
    wouldBlockInEspejo: 0,
    lastExternal: "—",
    lastError: "—",
    lastBlocked: "—",
    icc: 0,
    risk: "bajo",
    allowedNoise: 0,
    allowedRisk: "bajo",
    redirects: 0,
    lastRedirect: "—",
    commercialParams: 0,
    lastCommercialParam: "—",
    categories: freshCategories(),
    measured: 0,
    ads: 0,
    usefulThirdParty: 0,
    embeds: 0,
    otherThirdParty: 0
  };

  sendLiveState(true);
}

function resetLiveState(url) {
  activeHost = getHost(url);

  liveState = {
    host: activeHost || "—",
    mode: currentMode,
    requests: 0,
    external: 0,
    cookies: 0,
    permissions: 0,
    failed: 0,
    blocked: 0,
    wouldBlockInLimpio: 0,
    wouldBlockInEspejo: 0,
    lastExternal: "—",
    lastError: "—",
    lastBlocked: "—",
    icc: 0,
    risk: "bajo",
    allowedNoise: 0,
    allowedRisk: "bajo",
    redirects: 0,
    lastRedirect: "—",
    commercialParams: 0,
    lastCommercialParam: "—",
    categories: freshCategories(),
    measured: 0,
    ads: 0,
    usefulThirdParty: 0,
    embeds: 0,
    otherThirdParty: 0
  };

  console.log(`[Nubea] Nueva navegación: ${url}`);
  console.log(`[Nubea] Host activo: ${activeHost || "—"}`);
  console.log(`[Nubea] Modo durante navegación: ${currentMode}`);

  inspectCommercialParams(url);
  sendLiveState(true);
}

function observeRequest(details, host) {
  liveState.requests += 1;

  const external = !isSameSite(host, activeHost);
  const category = categorize(host, details);

  if (external) {
    liveState.external += 1;
    liveState.categories[category] = (liveState.categories[category] || 0) + 1;
    liveState.lastExternal = host;
  }

  if (wouldBlock("limpio", details, host, category)) {
    liveState.wouldBlockInLimpio += 1;
  }

  if (wouldBlock("espejo", details, host, category)) {
    liveState.wouldBlockInEspejo += 1;
  }

  return { external, category };
}

function decideBlock(details, host, category) {
  return wouldBlock(currentMode, details, host, category);
}

function setupTemporarySession() {
  const ses = session.fromPartition(NUBEA_PARTITION, { cache: false });

  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    liveState.permissions += 1;
    liveState.lastError = `Permiso pedido: ${permission}`;
    sendLiveState();

    // Nubea v0.1: permisos negados por defecto.
    callback(false);
  });

  ses.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*"] }, (details, callback) => {
    const host = getHost(details.url);

    if (!host || !activeHost) {
      callback({});
      return;
    }

    const { category } = observeRequest(details, host);
    const block = decideBlock(details, host, category);

    if (block) {
      liveState.blocked += 1;
      liveState.lastBlocked = `${host} · ${category} · ${details.resourceType || "unknown"}`;

      if (liveState.blocked <= 15 || liveState.blocked % 25 === 0) {
        console.log(
          `[Nubea][BLOCK] total=${liveState.blocked} mode=${currentMode} category=${category} type=${details.resourceType || "unknown"} host=${host}`
        );
      }

      sendLiveState();
      callback({ cancel: true });
      return;
    }

    sendLiveState();
    callback({});
  });

  ses.webRequest.onBeforeRedirect({ urls: ["http://*/*", "https://*/*"] }, (details) => {
    const fromHost = getHost(details.url);
    const toHost = getHost(details.redirectURL);

    if (!activeHost || !fromHost || !toHost) return;

    inspectCommercialParams(details.redirectURL);

    const routeRedirect = isRouteRedirect(details, fromHost, toHost);
    const identitySync = looksLikeIdentitySync(details.redirectURL, fromHost, toHost);

    if (routeRedirect) {
      liveState.redirects += 1;
      liveState.lastRedirect = `${fromHost} → ${toHost}`;

      if (shouldLogRedirect(liveState.redirects)) {
        console.log(`[Nubea][ROUTE] total=${liveState.redirects} ${fromHost} -> ${toHost}`);
      }
    } else {
      liveState.thirdPartyRedirects += 1;
      liveState.lastThirdPartyRedirect = `${fromHost} → ${toHost}`;

      if (identitySync) {
        liveState.identitySyncs += 1;
        liveState.lastIdentitySync = `${fromHost} → ${toHost}`;
      }

      if (shouldLogRedirect(liveState.thirdPartyRedirects)) {
        console.log(
          `[Nubea][THIRD_REDIRECT] total=${liveState.thirdPartyRedirects} sync=${identitySync ? "yes" : "no"} ${fromHost} -> ${toHost}`
        );
      }
    }

    sendLiveState();
  });


  ses.webRequest.onErrorOccurred({ urls: ["http://*/*", "https://*/*"] }, (details) => {
    const host = getHost(details.url);

    if (!host || !activeHost) return;

    if (details.error === "net::ERR_BLOCKED_BY_CLIENT" || details.error === "net::ERR_ABORTED") {
      return;
    }

    liveState.failed += 1;
    liveState.lastError = `${host} · ${details.error || "error"}`;
    sendLiveState();
  });

  ses.cookies.on("changed", (_event, _cookie, _cause, removed) => {
    if (!removed) {
      liveState.cookies += 1;
      sendLiveState();
    }
  });
}

function sendPopupRequest(url) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!url || url === "about:blank") return;

  console.log(`[Nubea][POPUP] Interceptado: ${url}`);
  mainWindow.webContents.send("popup:open-inside", url);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#0b0f14",
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    sendPopupRequest(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-attach-webview", (_event, webContents) => {
    webContents.setWindowOpenHandler(({ url }) => {
      sendPopupRequest(url);
      return { action: "deny" };
    });

    webContents.on("will-navigate", (_event, url) => {
      if (url && url !== "about:blank") {
        // La navegación normal dentro del webview sigue permitida.
        // Este hook queda como punto de auditoría futura.
      }
    });
  });
}

app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    sendPopupRequest(url);
    return { action: "deny" };
  });
});

app.whenReady().then(() => {
  setupTemporarySession();
  createWindow();
});

app.on("before-quit", async () => {
  try {
    const ses = session.fromPartition(NUBEA_PARTITION);
    await ses.clearStorageData();
    await ses.clearCache();
    console.log("[Nubea] Sesión temporal limpiada al cerrar.");
  } catch (error) {
    console.error("[Nubea] No se pudo limpiar sesión temporal:", error);
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.handle("window:minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle("window:maximize", () => {
  if (!mainWindow) return;

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle("window:close", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on("navigation:home", () => {
  resetHomeState();
});

ipcMain.on("navigation:start", (_event, url) => {
  resetLiveState(url);
});

ipcMain.on("mode:set", (_event, mode) => {
  if (!["normal", "limpio", "espejo"].includes(mode)) return;

  currentMode = mode;
  liveState.mode = mode;

  console.log(`[Nubea] Modo activo: ${currentMode}`);

  sendLiveState(true);
});
