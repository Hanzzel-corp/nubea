const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("node:path");

let mainWindow = null;

const NUBEA_PARTITION = "nubea-temp"; // sin "persist:" => sesión temporal/en memoria

let currentMode = "normal";
let activeHost = "";

let liveState = {
  host: "—",
  mode: "normal",
  requests: 0,
  external: 0,
  cookies: 0,
  permissions: 0,
  failed: 0,
  blocked: 0,
  lastExternal: "—",
  lastError: "—",
  lastBlocked: "—"
};

const TRACKER_HINTS = [
  "ad.",
  "ads.",
  "ads-",
  "adservice",
  "adserver",
  "admanmedia",
  "doubleclick",
  "googlesyndication",
  "googleadservices",
  "google-analytics",
  "analytics",
  "tracking",
  "tracker",
  "pixel",
  "cookiesync",
  "cookie-sync",
  "seedtag",
  "iqzone",
  "facebook.net",
  "connect.facebook",
  "scorecardresearch",
  "taboola",
  "outbrain",
  "criteo",
  "adsystem",
  "amazon-adsystem",
  "adnxs",
  "rubiconproject",
  "pubmatic",
  "openx",
  "teads",
  "hotjar",
  "quantserve",
  "chartbeat",
  "securepubads",
  "cdn.ads",
  "casalemedia",
  "smartadserver",
  "bidr",
  "bidswitch",
  "yieldmo",
  "mediavine",
  "gumgum",
  "moatads",
  "adsrvr"
];

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

function looksLikeTracker(host, rawUrl) {
  const text = `${host} ${rawUrl}`.toLowerCase();
  return TRACKER_HINTS.some((hint) => text.includes(hint));
}

function shouldBlockRequest(details, host) {
  if (!host || !activeHost) return false;

  const protocol = getProtocol(details.url);

  // No bloqueamos protocolos internos.
  if (!["http:", "https:"].includes(protocol)) return false;

  const external = !isSameSite(host, activeHost);
  const type = details.resourceType || "unknown";

  // Nunca bloquear la navegación principal del usuario.
  if (type === "mainFrame") return false;

  if (currentMode === "normal") {
    return false;
  }

  if (currentMode === "limpio") {
    // Limpio: bloquea terceros sospechosos de anuncios/tracking.
    return external && looksLikeTracker(host, details.url);
  }

  if (currentMode === "espejo") {
    // Espejo: bloquea todo tercero que no sea navegación principal.
    return external;
  }

  return false;
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
    lastExternal: "—",
    lastError: "—",
    lastBlocked: "—"
  };

  console.log(`[Nubea] Nueva navegación: ${url}`);
  console.log(`[Nubea] Host activo: ${activeHost || "—"}`);
  console.log(`[Nubea] Modo durante navegación: ${currentMode}`);

  sendLiveState();
}

function sendLiveState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("live:update", liveState);
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

    liveState.requests += 1;

    const external = !isSameSite(host, activeHost);

    if (external) {
      liveState.external += 1;
      liveState.lastExternal = host;
    }

    const block = shouldBlockRequest(details, host);

    if (block) {
      liveState.blocked += 1;
      liveState.lastBlocked = `${host} · ${details.resourceType || "unknown"}`;

      if (liveState.blocked <= 15 || liveState.blocked % 25 === 0) {
        console.log(
          `[Nubea][BLOCK] total=${liveState.blocked} mode=${currentMode} type=${details.resourceType || "unknown"} host=${host}`
        );
      }

      sendLiveState();
      callback({ cancel: true });
      return;
    }

    sendLiveState();
    callback({});
  });

  ses.webRequest.onErrorOccurred({ urls: ["http://*/*", "https://*/*"] }, (details) => {
    const host = getHost(details.url);

    if (!host || !activeHost) return;

    // Los bloqueos propios también generan errores cancelados.
    // No los contamos como fallo externo real.
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

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });
}

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

ipcMain.on("navigation:start", (_event, url) => {
  resetLiveState(url);
});

ipcMain.on("mode:set", (_event, mode) => {
  if (!["normal", "limpio", "espejo"].includes(mode)) return;

  currentMode = mode;
  liveState.mode = mode;

  console.log(`[Nubea] Modo activo: ${currentMode}`);

  sendLiveState();
});
