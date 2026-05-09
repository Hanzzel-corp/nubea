# Nubea Architecture / Arquitectura de Nubea

*English documentation followed by Spanish / Documentación en inglés seguida de español*

---

## Overview

Nubea is built on Electron, leveraging Chromium for rendering while implementing a custom browsing frame that enforces the no-history principle and provides live page inspection.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Nubea Browser                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │  Main Process   │    │         Renderer Process        │  │
│  │   (Node.js)     │◄──►│       (Chromium WebView)        │  │
│  │                 │ IPC │                                 │  │
│  │  main.js        │────►│  ┌───────────────────────────┐  │  │
│  │  - Window mgmt  │     │  │      UI Layer             │  │  │
│  │  - Session ctrl │     │  │  index.html + renderer.js │  │  │
│  │  - WebRequest   │     │  │  + styles.css             │  │  │
│  │  - Filtering    │     │  └───────────────────────────┘  │  │
│  └─────────────────┘     └─────────────────────────────────┘  │
│           │                           │                      │
│           ▼                           ▼                      │
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │ Preload Script  │    │      WebView (WebContents)      │  │
│  │   (Security)    │    │                                 │  │
│  │                 │    │  - Temporary Session Partition  │  │
│  │  preload.js     │    │  - No persistence               │  │
│  │  - ContextBridge│    │  - Chromium rendering           │  │
│  └─────────────────┘    └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Main Process (`src/main.js`)

The main process controls the application lifecycle and manages system-level operations.

**Responsibilities:**
- Window creation and management
- Session configuration (temporary partition)
- WebRequest API for request interception
- URL filtering based on browsing mode
- IPC communication with renderer

**Key Features:**
```javascript
// Temporary session - no persistence
partition: `nubea-temp-${Date.now()}`

// Request filtering pipeline
Normal  → allow all
Limpio  → block ads/trackers
Espejo  → block third-party
```

### 2. Renderer Process (`src/renderer.js` + `src/index.html`)

The renderer process handles the UI and user interactions.

**Responsibilities:**
- Navigation controls (address bar, search)
- Tab management UI
- Live inspection panel updates
- Mode switching
- Search engine selection

**UI Structure:**
```
┌────────────────────────────────────┐
│ [P][G][C]  🌐  [Address Bar]  [🔍] │
├────────────────────────────────────┤
│                                    │
│         WebView Content            │
│                                    │
├────────────────────────────────────┤
│ [Tab1] [Tab2] [+]              N L E│
└────────────────────────────────────┘
```

### 3. Preload Script (`src/preload.js`)

Provides secure communication between main and renderer.

**Responsibilities:**
- Expose safe APIs to renderer via `contextBridge`
- Validate IPC channels
- Prevent direct Node.js access from renderer

**Exposed APIs:**
- `window.electron.navigate(url)`
- `window.electron.onUrlUpdate(callback)`
- `window.electron.onRequestBlocked(callback)`

### 4. Request Filtering System

Three-tier filtering architecture:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Normal** | Allow all requests | Baseline inspection |
| **Limpio** | Block known trackers/ads | Balanced browsing |
| **Espejo** | Block all third-party | Maximum isolation |

**Filter Categories:**
- Advertising domains
- Analytics services
- Tracking pixels
- Social media embeds
- Third-party scripts

## Data Flow

### Navigation Flow

```
User enters URL
       ↓
Renderer validates
       ↓
IPC: navigate event
       ↓
Main loads in WebView
       ↓
WebRequest intercepts
       ↓
Filter decision (mode-based)
       ↓
Update inspection panel
       ↓
Render content
```

### Request Inspection Flow

```
Web Request Made
       ↓
onBeforeRequest listener
       ↓
Parse URL → extract domain
       ↓
Check filter rules
       ↓
{allow} → load resource
{block} → cancel + notify
       ↓
Update counters (requests, blocked)
       ↓
Emit IPC event
       ↓
Renderer updates UI
```

## Security Model

### No-Persistence Guarantee

```javascript
// Fresh session on every start
const ses = session.fromPartition(
  `nubea-temp-${Date.now()}`,
  { cache: false }
);
```

### Content Isolation
- `contextIsolation: true` prevents renderer access to Node.js
- `nodeIntegration: false` disables Node.js in renderer
- Preload script acts as security gate

### Request Sanitization
- All URLs validated before navigation
- Protocol whitelist: `http:`, `https:`
- Search queries escaped properly

## Browsing Modes Deep Dive

### Mode Implementation

```javascript
const MODES = {
  normal: {
    filter: () => false, // Allow all
    description: 'No filtering'
  },
  limpio: {
    filter: isTrackerOrAd, // Selective blocking
    description: 'Block known trackers'
  },
  espejo: {
    filter: isThirdParty, // Aggressive blocking
    description: 'Block all external'
  }
};
```

### Mode Switching

1. User clicks mode button (N/L/E)
2. Renderer sends `set-mode` IPC message
3. Main updates `currentMode` variable
4. Active requests use new filter immediately
5. UI reflects new mode state

## Extension Points

### Adding New Block Lists

```javascript
// In main.js
const customBlockList = [
  'example-tracker.com',
  'analytics.example.com'
];

// Merge with existing blockLists
blockLists.ads.push(...customBlockList);
```

### Adding New Search Engines

```javascript
// In renderer.js
const searchEngines = {
  google: 'https://google.com/search?q=',
  bing: 'https://bing.com/search?q=',
  // Add new:
  custom: 'https://custom.com/search?q='
};
```

---

# Arquitectura de Nubea (Español)

## Visión General

Nubea está construido sobre Electron, aprovechando Chromium para el renderizado mientras implementa un marco de navegación personalizado que impone el principio sin-historial y proporciona inspección de página en vivo.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Navegador Nubea                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │ Proceso Principal│   │      Proceso de Renderizado     │  │
│  │    (Node.js)    │◄──►│      (WebView de Chromium)      │  │
│  │                 │ IPC │                                 │  │
│  │  main.js        │────►│  ┌───────────────────────────┐  │  │
│  │  - Gestión vent │     │  │      Capa de UI           │  │  │
│  │  - Control ses  │     │  │  index.html + renderer.js │  │  │
│  │  - WebRequest   │     │  │  + styles.css             │  │  │
│  │  - Filtrado     │     │  └───────────────────────────┘  │  │  │
│  └─────────────────┘     └─────────────────────────────────┘  │
│           │                           │                      │
│           ▼                           ▼                      │
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │ Script Precarga │   │      WebView (WebContents)      │  │
│  │    (Seguridad)  │    │                                 │  │
│  │                 │    │  - Partición de sesión temporal │  │
│  │  preload.js     │    │  - Sin persistencia             │  │
│  │  - ContextBridge│    │  - Renderizado Chromium         │  │
│  └─────────────────┘    └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. Proceso Principal (`src/main.js`)

El proceso principal controla el ciclo de vida de la aplicación y gestiona operaciones a nivel de sistema.

**Responsabilidades:**
- Creación y gestión de ventanas
- Configuración de sesión (partición temporal)
- API WebRequest para intercepción de solicitudes
- Filtrado de URLs basado en modo de navegación
- Comunicación IPC con el renderizador

**Características Clave:**
```javascript
// Sesión temporal - sin persistencia
partition: `nubea-temp-${Date.now()}`

// Pipeline de filtrado de solicitudes
Normal  → permitir todo
Limpio  → bloquear ads/rastreadores
Espejo  → bloquear terceros
```

### 2. Proceso de Renderizado (`src/renderer.js` + `src/index.html`)

El proceso de renderizado maneja la interfaz de usuario y las interacciones del usuario.

**Responsabilidades:**
- Controles de navegación (barra de direcciones, búsqueda)
- UI de gestión de pestañas
- Actualizaciones del panel de inspección en vivo
- Cambio de modos
- Selección de motor de búsqueda

**Estructura de UI:**
```
┌────────────────────────────────────┐
│ [P][G][C]  🌐  [Barra Direcc] [🔍] │
├────────────────────────────────────┤
│                                    │
│         Contenido WebView          │
│                                    │
├────────────────────────────────────┤
│ [Pestaña1] [P2] [+]           N L E│
└────────────────────────────────────┘
```

### 3. Script de Precarga (`src/preload.js`)

Proporciona comunicación segura entre el proceso principal y el renderizador.

**Responsabilidades:**
- Exponer APIs seguras al renderizador vía `contextBridge`
- Validar canales IPC
- Prevenir acceso directo a Node.js desde el renderizador

**APIs Expuestas:**
- `window.electron.navigate(url)`
- `window.electron.onUrlUpdate(callback)`
- `window.electron.onRequestBlocked(callback)`

### 4. Sistema de Filtrado de Solicitudes

Arquitectura de filtrado de tres niveles:

| Modo | Comportamiento | Caso de Uso |
|------|----------------|-------------|
| **Normal** | Permitir todas las solicitudes | Inspección base |
| **Limpio** | Bloquear rastreadores/ads conocidos | Navegación balanceada |
| **Espejo** | Bloquear todo tercero | Aislamiento máximo |

**Categorías de Filtros:**
- Dominios publicitarios
- Servicios de analíticas
- Píxeles de rastreo
- Incrustaciones de redes sociales
- Scripts de terceros

## Flujo de Datos

### Flujo de Navegación

```
Usuario ingresa URL
       ↓
Renderizador valida
       ↓
IPC: evento navigate
       ↓
Principal carga en WebView
       ↓
WebRequest intercepta
       ↓
Decisión de filtro (basada en modo)
       ↓
Actualizar panel de inspección
       ↓
Renderizar contenido
```

### Flujo de Inspección de Solicitudes

```
Solicitud Web Realizada
       ↓
Listener onBeforeRequest
       ↓
Analizar URL → extraer dominio
       ↓
Verificar reglas de filtro
       ↓
{permitir} → cargar recurso
{bloquear} → cancelar + notificar
       ↓
Actualizar contadores (solicitudes, bloqueados)
       ↓
Emitir evento IPC
       ↓
Renderizador actualiza UI
```

## Modelo de Seguridad

### Garantía de No-Persistencia

```javascript
// Sesión fresca en cada inicio
const ses = session.fromPartition(
  `nubea-temp-${Date.now()}`,
  { cache: false }
);
```

### Aislamiento de Contenido
- `contextIsolation: true` previene acceso del renderizador a Node.js
- `nodeIntegration: false` deshabilita Node.js en el renderizador
- El script de precarga actúa como puerta de seguridad

### Sanitización de Solicitudes
- Todas las URLs validadas antes de navegación
- Lista blanca de protocolos: `http:`, `https:`
- Consultas de búsqueda escapadas adecuadamente

## Profundización en Modos de Navegación

### Implementación de Modos

```javascript
const MODES = {
  normal: {
    filter: () => false, // Permitir todo
    description: 'Sin filtrado'
  },
  limpio: {
    filter: isTrackerOrAd, // Bloqueo selectivo
    description: 'Bloquear rastreadores conocidos'
  },
  espejo: {
    filter: isThirdParty, // Bloqueo agresivo
    description: 'Bloquear todo externo'
  }
};
```

### Cambio de Modo

1. Usuario hace clic en botón de modo (N/L/E)
2. Renderizador envía mensaje IPC `set-mode`
3. Principal actualiza variable `currentMode`
4. Solicitudes activas usan nuevo filtro inmediatamente
5. UI refleja el nuevo estado del modo

## Puntos de Extensión

### Agregar Nuevas Listas de Bloqueo

```javascript
// En main.js
const customBlockList = [
  'ejemplo-rastreador.com',
  'analiticas.ejemplo.com'
];

// Fusionar con listas de bloqueo existentes
blockLists.ads.push(...customBlockList);
```

### Agregar Nuevos Motores de Búsqueda

```javascript
// En renderer.js
const searchEngines = {
  google: 'https://google.com/search?q=',
  bing: 'https://bing.com/search?q=',
  // Agregar nuevo:
  custom: 'https://custom.com/search?q='
};
```

---

## Component Interaction Summary / Resumen de Interacción

```
┌──────────────┐     IPC      ┌──────────────┐
│   Main       │◄────────────►│  Renderer    │
│  Process     │              │   Process    │
│              │              │              │
│ • Window     │              │ • Navigation │
│ • Session    │              │ • Search     │
│ • Filtering  │              │ • UI Updates │
│ • WebRequest │              │ • Mode Switch│
└──────┬───────┘              └──────┬───────┘
       │                             │
       │    ┌─────────────┐           │
       └───►│  WebView    │◄──────────┘
            │  (Chromium) │
            │             │
            │ • Render    │
            │ • Execute   │
            │ • Cookies   │
            └─────────────┘
```
