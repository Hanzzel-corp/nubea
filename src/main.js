const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("node:path");

let mainWindow = null;

const NUBEA_PARTITION = "nubea-temp"; // sin "persist:" => sesión temporal/en memoria

let currentMode = "normal";
let appliedMode = "normal";
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
      "googletagmanager.com",
      "www.googletagmanager.com",
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
      "consentmanager.net",
      "onetrust.com",
      "cookiebot.com"
    ],
    urlPatterns: ["consent", "cookieconsent", "gdpr", "ccpa"]
  },
  {
    category: "media",
    hosts: [
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

let commercialParamKeysSeen = new Set();

function freshLiveState(overrides = {}) {
  commercialParamKeysSeen = new Set();

  return {
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
    otherThirdParty: 0,
    ...overrides
  };
}

let liveState = freshLiveState();

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

const IDENTITY_SYNC_HOSTS = [
  "doubleclick.net",
  "cm.g.doubleclick.net",
  "adnxs.com",
  "pubmatic.com",
  "rubiconproject.com",
  "bidswitch.net",
  "casalemedia.com",
  "openx.net",
  "seedtag.com",
  "outbrain.com",
  "criteo.com",
  "demdex.net",
  "simpli.fi",
  "mgid.com",
  "trkn.us",
  "adsrvr.org",
  "rlcdn.com",
  "pippio.com",
  "tapad.com",
  "lijit.com",
  "smartadserver.com"
];

const IDENTITY_SYNC_PATH_TOKENS = [
  "/sync",
  "/idsync",
  "/cookie-sync",
  "/cookiesync",
  "/match",
  "/usync",
  "/cm",
  "/pixel-sync"
];

const IDENTITY_SYNC_PARAMS = [
  "uid",
  "uuid",
  "user_id",
  "userid",
  "partner_uid",
  "buyeruid",
  "google_gid",
  "eid"
];

function looksLikeIdentitySync(rawUrl, fromHost = "", toHost = "") {
  const fromKnown = IDENTITY_SYNC_HOSTS.some((pattern) => hostMatches(fromHost, pattern));
  const toKnown = IDENTITY_SYNC_HOSTS.some((pattern) => hostMatches(toHost, pattern));

  if (!fromKnown && !toKnown) return false;

  try {
    const u = new URL(rawUrl);
    const path = `${u.pathname}${u.search}`.toLowerCase();

    const pathHit = IDENTITY_SYNC_PATH_TOKENS.some((token) => path.includes(token));
    const paramHit = IDENTITY_SYNC_PARAMS.some((param) => u.searchParams.has(param));

    return pathHit || paramHit || hostMatches(toHost, "cm.g.doubleclick.net");
  } catch {
    const text = String(rawUrl || "").toLowerCase();
    return IDENTITY_SYNC_PATH_TOKENS.some((token) => text.includes(token));
  }
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

    for (const key of COMMERCIAL_PARAMS) {
      if (u.searchParams.has(key)) {
        commercialParamKeysSeen.add(key);
        liveState.lastCommercialParam = key;
      }
    }

    liveState.commercialParams = commercialParamKeysSeen.size;

    if (liveState.commercialParams === 0) {
      liveState.lastCommercialParam = "—";
    }
  } catch {
    liveState.commercialParams = commercialParamKeysSeen.size;
    liveState.lastCommercialParam = liveState.lastCommercialParam || "—";
  }
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeLiveState() {
  liveState.requests = safeNumber(liveState.requests);
  liveState.external = safeNumber(liveState.external);
  liveState.cookies = safeNumber(liveState.cookies);
  liveState.permissions = safeNumber(liveState.permissions);
  liveState.failed = safeNumber(liveState.failed);
  liveState.blocked = safeNumber(liveState.blocked);
  liveState.wouldBlockInLimpio = safeNumber(liveState.wouldBlockInLimpio);
  liveState.wouldBlockInEspejo = safeNumber(liveState.wouldBlockInEspejo);
  liveState.redirects = safeNumber(liveState.redirects);
  liveState.thirdPartyRedirects = safeNumber(liveState.thirdPartyRedirects);
  liveState.identitySyncs = safeNumber(liveState.identitySyncs);
  liveState.commercialParams = safeNumber(liveState.commercialParams);

  if (!liveState.categories || typeof liveState.categories !== "object") {
    liveState.categories = freshCategories();
  }

  for (const key of CATEGORY_KEYS) {
    liveState.categories[key] = safeNumber(liveState.categories[key]);
  }

  liveState.host = liveState.host || "—";
  liveState.mode = liveState.mode || currentMode || "normal";
  liveState.lastExternal = liveState.lastExternal || "—";
  liveState.lastError = liveState.lastError || "—";
  liveState.lastBlocked = liveState.lastBlocked || "—";
  liveState.lastRedirect = liveState.lastRedirect || "—";
  liveState.lastThirdPartyRedirect = liveState.lastThirdPartyRedirect || "—";
  liveState.lastIdentitySync = liveState.lastIdentitySync || "—";
  liveState.lastCommercialParam = liveState.lastCommercialParam || "—";
}

function riskLabel(score) {
  if (score >= 75) return "crítico";
  if (score >= 50) return "alto";
  if (score >= 25) return "medio";
  return "bajo";
}

/**
 * Racionalidad de pesos ICC:
 * - permissions pesa alto porque un permiso nativo cambia la relación sitio/usuario.
 * - ads y measured pesan más que CDN/fuentes porque se asocian a captura comercial o medición.
 * - blocked suma al ICC detectado porque fue un intento real de carga.
 * - allowedNoise intenta estimar lo que quedó pasando después del filtro activo.
 *
 * Esta fórmula es heurística de prototipo. Para una versión pública más fuerte,
 * conviene calibrarla contra una muestra de sitios y documentar el método.
 */
function calculateDerivedMetrics() {
  normalizeLiveState();

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

  const icc = Math.min(100, Math.round(safeNumber(detectedScore)));

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

  const allowedNoise = Math.min(100, Math.round(safeNumber(allowedScore)));

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
  liveState = freshLiveState({ mode: currentMode });
  sendLiveState(true);
}

function resetLiveState(url) {
  activeHost = getHost(url);
  appliedMode = currentMode;

  liveState = freshLiveState({
    host: activeHost || "—",
    mode: appliedMode
  });

  console.log(`[Nubea] Nueva navegación: ${url}`);
  console.log(`[Nubea] Host activo: ${activeHost || "—"}`);
  console.log(`[Nubea] Modo durante navegación: ${appliedMode}`);

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
  return wouldBlock(appliedMode, details, host, category);
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
          `[Nubea][BLOCK] total=${liveState.blocked} mode=${appliedMode} category=${category} type=${details.resourceType || "unknown"} host=${host}`
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
