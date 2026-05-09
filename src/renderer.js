const btnP = document.getElementById("btnP");
const btnG = document.getElementById("btnG");
const btnC = document.getElementById("btnC");

const homeScreen = document.getElementById("homeScreen");
const webview = document.getElementById("webview");

const homeInput = document.getElementById("homeInput");
const homeGo = document.getElementById("homeGo");

const sideInput = document.getElementById("sideInput");
const refreshBtn = document.getElementById("refreshBtn");

const tabInicio = document.getElementById("tabInicio");
const tabBusqueda = document.getElementById("tabBusqueda");

const searchEngines = {
  google: "https://www.google.com/search?q=",
  bing: "https://www.bing.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  brave: "https://search.brave.com/search?q="
};

let hasLoadedSomething = false;
let activeMode = "normal";
let lastNavigationKey = "";

btnP.addEventListener("click", () => window.nubeaAPI.minimize());
btnG.addEventListener("click", () => window.nubeaAPI.maximize());
btnC.addEventListener("click", () => window.nubeaAPI.close());

function getSelectedEngine() {
  const selected = document.querySelector("input[name='engine']:checked");
  return selected ? selected.value : "google";
}

function buildUrl(raw) {
  const value = raw.trim();
  if (!value) return "";

  const looksLikeUrl =
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    (value.includes(".") && !value.includes(" "));

  if (looksLikeUrl) {
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return "https://" + value;
  }

  const engine = getSelectedEngine();
  return searchEngines[engine] + encodeURIComponent(value);
}

function setTabState(state) {
  if (state === "home") {
    tabInicio.classList.add("active");
    tabBusqueda.classList.remove("active");
  } else {
    tabBusqueda.classList.add("active");
    tabInicio.classList.remove("active");
  }
}

function showHome() {
  webview.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  setTabState("home");
}

function showWeb() {
  homeScreen.classList.add("hidden");
  webview.classList.remove("hidden");
  setTabState("web");
}

function startNavigation(url) {
  lastNavigationKey = `${activeMode}|${url}|${Date.now()}`;
  sideInput.value = url;
  window.nubeaAPI.navigationStart(url);
}

function navigate(raw) {
  const url = buildUrl(raw);
  if (!url) return;

  hasLoadedSomething = true;
  showWeb();

  startNavigation(url);
  webview.src = url;
}

function reloadCurrentPage() {
  if (!hasLoadedSomething || webview.classList.contains("hidden")) return;

  const currentUrl = webview.getURL() || sideInput.value;
  if (!currentUrl || currentUrl === "about:blank") return;

  startNavigation(currentUrl);
  webview.reload();
}

homeGo.addEventListener("click", () => navigate(homeInput.value));

homeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") navigate(homeInput.value);
});

sideInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") navigate(sideInput.value);
});

refreshBtn.addEventListener("click", reloadCurrentPage);

document.addEventListener("keydown", (event) => {
  if (event.key === "F5") {
    event.preventDefault();
    reloadCurrentPage();
  }
});

webview.addEventListener("did-navigate", (event) => {
  sideInput.value = event.url;
  // No reseteamos métricas acá.
  // El reset ocurre solo cuando Nubea inicia navegación o recarga.
});

webview.addEventListener("did-navigate-in-page", (event) => {
  sideInput.value = event.url;
  // Navegación interna/hash: no reinicia métricas.
});

webview.addEventListener("did-fail-load", (event) => {
  if (event.errorCode === -3) return;
  console.error("[Nubea] did-fail-load:", event.errorCode, event.errorDescription, event.validatedURL);
});

tabInicio.addEventListener("click", showHome);

tabBusqueda.addEventListener("click", () => {
  if (hasLoadedSomething) showWeb();
});

document.querySelectorAll(".mode").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    const mode = btn.dataset.mode || "normal";
    activeMode = mode;

    window.nubeaAPI.setMode(mode);

    const liveMode = document.getElementById("liveMode");
    if (liveMode) liveMode.textContent = mode;

    setTimeout(() => {
      reloadCurrentPage();
    }, 180);
  });
});

window.nubeaAPI.onLiveUpdate((data) => {
  document.getElementById("liveHost").textContent = data.host ?? "—";
  document.getElementById("liveRequests").textContent = data.requests ?? 0;
  document.getElementById("liveExternal").textContent = data.external ?? 0;
  document.getElementById("liveCookies").textContent = data.cookies ?? 0;
  document.getElementById("livePermissions").textContent = data.permissions ?? 0;

  const liveMode = document.getElementById("liveMode");
  const failed = document.getElementById("liveFailed");
  const lastExternal = document.getElementById("liveLastExternal");
  const lastError = document.getElementById("liveLastError");
  const blocked = document.getElementById("liveBlocked");
  const lastBlocked = document.getElementById("liveLastBlocked");

  if (liveMode) liveMode.textContent = data.mode ?? activeMode;
  if (failed) failed.textContent = data.failed ?? 0;
  if (lastExternal) lastExternal.textContent = data.lastExternal ?? "—";
  if (lastError) lastError.textContent = data.lastError ?? "—";
  if (blocked) blocked.textContent = data.blocked ?? 0;
  if (lastBlocked) lastBlocked.textContent = data.lastBlocked ?? "—";
});
