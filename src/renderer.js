const btnP = document.getElementById("btnP");
const btnG = document.getElementById("btnG");
const btnC = document.getElementById("btnC");

const homeScreen = document.getElementById("homeScreen");
const webview = document.getElementById("webview");

const directInput = document.getElementById("directInput");
const directGo = document.getElementById("directGo");

const searchInput = document.getElementById("searchInput");
const searchGo = document.getElementById("searchGo");

const sideInput = document.getElementById("sideInput");
const refreshBtn = document.getElementById("refreshBtn");

const choiceOverlay = document.getElementById("choiceOverlay");
const choiceText = document.getElementById("choiceText");
const choiceOptions = document.getElementById("choiceOptions");
const choiceCancel = document.getElementById("choiceCancel");

const tabInicio = document.getElementById("tabInicio");
const tabBusqueda = document.getElementById("tabBusqueda");
const tabPlus = document.getElementById("tabPlus");

const searchEngines = {
  google: "https://www.google.com/search?q=",
  bing: "https://www.bing.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  brave: "https://search.brave.com/search?q="
};

let hasLoadedSomething = false;
let activeMode = "normal";

btnP.addEventListener("click", () => window.nubeaAPI.minimize());
btnG.addEventListener("click", () => window.nubeaAPI.maximize());
btnC.addEventListener("click", () => window.nubeaAPI.close());

function getSelectedEngine() {
  const selected = document.querySelector("input[name='engine']:checked");
  return selected ? selected.value : "google";
}

function isAmbiguousDestination(raw) {
  const value = raw.trim();
  if (!value) return false;

  const hasProtocol = value.startsWith("http://") || value.startsWith("https://");
  const hasDot = value.includes(".");
  const hasSpace = value.includes(" ");

  return !hasProtocol && !hasDot && !hasSpace;
}

function buildDirectUrl(raw) {
  const value = raw.trim();
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.includes(".") && !value.includes(" ")) {
    return "https://" + value;
  }

  return "";
}

function buildDestinationChoices(raw) {
  const value = raw.trim().toLowerCase();

  return [
    {
      label: `${value}.com`,
      detail: "Abrir como dominio global",
      action: () => loadUrl(`https://${value}.com`)
    },
    {
      label: `${value}.com.ar`,
      detail: "Abrir como dominio argentino",
      action: () => loadUrl(`https://${value}.com.ar`)
    },
    {
      label: `www.${value}.com`,
      detail: "Probar con www",
      action: () => loadUrl(`https://www.${value}.com`)
    },
    {
      label: `Buscar “${raw.trim()}”`,
      detail: "Usar el buscador elegido",
      action: () => navigateSearch(raw)
    }
  ];
}

function hideDestinationChoice() {
  if (!choiceOverlay) return;
  choiceOverlay.classList.add("hidden");
  choiceOptions.innerHTML = "";
}

function showDestinationChoice(raw) {
  if (!choiceOverlay || !choiceOptions || !choiceText) return;

  const value = raw.trim();
  choiceText.textContent = `“${value}” puede ser un sitio o una búsqueda. Elegí qué querés hacer.`;

  choiceOptions.innerHTML = "";

  for (const option of buildDestinationChoices(value)) {
    const btn = document.createElement("button");
    btn.className = "choice-option";
    btn.innerHTML = `<strong>${option.label}</strong><small>${option.detail}</small>`;
    btn.addEventListener("click", () => {
      hideDestinationChoice();
      option.action();
    });
    choiceOptions.appendChild(btn);
  }

  choiceOverlay.classList.remove("hidden");
}

function buildSearchUrl(raw) {
  const value = raw.trim();
  if (!value) return "";

  const engine = getSelectedEngine();
  return searchEngines[engine] + encodeURIComponent(value);
}

function displayUrl(url) {
  if (!url || url === "about:blank") return "";
  return url;
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
  hideDestinationChoice();
  hasLoadedSomething = false;
  webview.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  sideInput.value = "";
  window.nubeaAPI.homeReset();
  setTabState("home");

  if (directInput) {
    setTimeout(() => directInput.focus(), 80);
  }
}

function showWeb() {
  homeScreen.classList.add("hidden");
  webview.classList.remove("hidden");
  setTabState("web");
}

function startNavigation(url) {
  sideInput.value = url;
  window.nubeaAPI.navigationStart(url);
}

function loadUrl(url) {
  if (!url) return;

  hasLoadedSomething = true;
  showWeb();

  startNavigation(url);
  webview.src = url;
}

function navigateDirect(raw) {
  const value = raw.trim();
  if (!value) return;

  if (isAmbiguousDestination(value)) {
    showDestinationChoice(value);
    return;
  }

  loadUrl(buildDirectUrl(value));
}

function navigateSearch(raw) {
  loadUrl(buildSearchUrl(raw));
}

function reloadCurrentPage() {
  if (!hasLoadedSomething || webview.classList.contains("hidden")) return;

  const currentUrl = webview.getURL() || sideInput.value;
  if (!currentUrl || currentUrl === "about:blank") return;

  startNavigation(currentUrl);
  webview.reload();
}

if (choiceCancel) {
  choiceCancel.addEventListener("click", hideDestinationChoice);
}

if (choiceOverlay) {
  choiceOverlay.addEventListener("click", (event) => {
    if (event.target === choiceOverlay) hideDestinationChoice();
  });
}

directGo.addEventListener("click", () => navigateDirect(directInput.value));

directInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") navigateDirect(directInput.value);
});

searchGo.addEventListener("click", () => navigateSearch(searchInput.value));

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") navigateSearch(searchInput.value);
});

sideInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") navigateDirect(sideInput.value);
});

refreshBtn.addEventListener("click", reloadCurrentPage);

document.addEventListener("keydown", (event) => {
  if (event.key === "F5") {
    event.preventDefault();
    reloadCurrentPage();
  }
});

webview.addEventListener("did-navigate", (event) => {
  sideInput.value = displayUrl(event.url);
});

webview.addEventListener("did-navigate-in-page", (event) => {
  sideInput.value = displayUrl(event.url);
});

webview.addEventListener("new-window", (event) => {
  event.preventDefault();
  if (event.url) {
    loadUrl(event.url);
  }
});

webview.addEventListener("did-fail-load", (event) => {
  if (event.errorCode === -3) return;
  console.error("[Nubea] did-fail-load:", event.errorCode, event.errorDescription, event.validatedURL);
});

tabInicio.addEventListener("click", showHome);

if (tabPlus) {
  tabPlus.addEventListener("click", showHome);
}

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

window.nubeaAPI.onPopupOpenInside((url) => {
  if (!url || url === "about:blank") return;
  loadUrl(url);
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
  const icc = document.getElementById("liveICC");
  const risk = document.getElementById("liveRisk");
  const allowedNoise = document.getElementById("liveAllowedNoise");
  const allowedRisk = document.getElementById("liveAllowedRisk");
  const wouldBlockLimpio = document.getElementById("liveWouldBlockLimpio");
  const wouldBlockEspejo = document.getElementById("liveWouldBlockEspejo");
  const measured = document.getElementById("liveMeasured");
  const ads = document.getElementById("liveAds");
  const usefulThirdParty = document.getElementById("liveUsefulThirdParty");
  const embeds = document.getElementById("liveEmbeds");
  const otherThirdParty = document.getElementById("liveOtherThirdParty");

  if (liveMode) liveMode.textContent = data.mode ?? activeMode;
  if (failed) failed.textContent = data.failed ?? 0;
  if (lastExternal) lastExternal.textContent = data.lastExternal ?? "—";
  if (lastError) lastError.textContent = data.lastError ?? "—";
  if (blocked) blocked.textContent = data.blocked ?? 0;
  if (lastBlocked) lastBlocked.textContent = data.lastBlocked ?? "—";
  if (icc) icc.textContent = data.icc ?? 0;
  if (risk) risk.textContent = data.risk ?? "bajo";
  if (allowedNoise) allowedNoise.textContent = data.allowedNoise ?? 0;
  if (allowedRisk) allowedRisk.textContent = data.allowedRisk ?? "bajo";
  if (wouldBlockLimpio) wouldBlockLimpio.textContent = data.wouldBlockInLimpio ?? 0;
  if (wouldBlockEspejo) wouldBlockEspejo.textContent = data.wouldBlockInEspejo ?? 0;
  if (measured) measured.textContent = data.measured ?? 0;
  if (ads) ads.textContent = data.ads ?? 0;
  if (usefulThirdParty) usefulThirdParty.textContent = data.usefulThirdParty ?? 0;
  if (embeds) embeds.textContent = data.embeds ?? 0;
  if (otherThirdParty) otherThirdParty.textContent = data.otherThirdParty ?? 0;
});
