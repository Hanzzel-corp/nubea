# Nubea

**Nubea** es un prototipo de navegador minimalista sin historial, enfocado en la navegación limpia, la inspección en vivo y la conciencia de la contaminación cognitiva.

No está diseñado para competir con Chrome, Firefox, Brave o Edge como un motor de navegador completo. Nubea utiliza Electron/Chromium internamente, pero define su propio marco de navegación, interfaz, modos y filosofía.

> Nubea no almacena tu historial de navegación.  
> Muestra en tiempo real lo que la página actual intenta cargar, solicitar, rastrear o conectar.

---

## Idea Central

Los sitios web modernos a menudo cargan mucho más que el contenido que el usuario originalmente intentaba ver. Alrededor de una sola página pueden existir analíticas, scripts publicitarios, cookies, dominios externos, incrustaciones, sistemas de recomendación, rastreadores de video, prompts de notificación y mecanismos de sincronización de identidad.

Nubea expone esa capa.

El objetivo no es ocultar al usuario ni prometer privacidad absoluta. El objetivo es más simple y claro:

> **Navegar sin historial local por diseño, y ver la actividad en vivo que rodea la página que visitas.**

---

## Estado Actual

| Atributo | Valor |
|----------|-------|
| **Versión** | `v0.1.0` |
| **Estado** | Prototipo funcional |
| **Plataforma probada** | Linux / Ubuntu |
| **Stack** | Electron + Node.js + Chromium WebView |

Este es un prototipo temprano. Ya abre páginas, cambia modos, bloquea solicitudes seleccionadas y muestra actividad de página en vivo. Aún no es un navegador de producción.

---

## Características v0.1

- Ventana de escritorio personalizada
- Sin marco clásico de navegador
- Controles de ventana basados en letras:
  - `P` = minimizar / pequeño
  - `G` = maximizar / grande
  - `C` = cerrar
- Sin perfil de usuario
- Sin menú de tres puntos
- Sin botones visibles de atrás/adelante
- Refrescar mediante botón o `F5`
- Pestañas inferiores inspiradas en hojas de cálculo
- Panel lateral derecho como panel de control principal
- Búsqueda mediante motores seleccionables:
  - Google
  - Bing
  - DuckDuckGo
  - Brave Search
- Sesión de navegación temporal
- Sin historial de navegación local por diseño
- Inspección de página en vivo:
  - Dominio activo
  - Solicitudes
  - Dominios externos
  - Cookies intentadas
  - Solicitudes de permisos
  - Solicitudes bloqueadas
  - Último dominio bloqueado
- Tres modos de navegación:
  - **Normal**
  - **Limpio**
  - **Espejo**

---

## Modos de Navegación

### Normal

Carga la página normalmente y muestra la actividad en vivo.

Útil para ver cuánta actividad externa desencadena una página sin bloquearla.

### Limpio

Bloquea solicitudes conocidas de publicidad, analíticas y rastreo.

Este modo mantiene la página más usable mientras reduce el ruido comercial y de rastreo.

### Espejo

Bloquea agresivamente solicitudes de terceros.

Este modo puede romper partes de los sitios web, pero revela cuán dependiente es una página de sistemas externos.

---

## Filosofía

Nubea sigue algunos principios estrictos:

```
Sin historial por diseño.
Sin perfil de usuario.
Sin requerimiento de cuenta.
Sin telemetría oculta.
Sin menú de tres puntos.
Sin capas de interfaz innecesarias.
Solo inspección en vivo.
El usuario decide dónde navegar.
```

Nubea no intenta decidir por el usuario. Solo expone lo que está sucediendo alrededor de la página actual.

### Contaminación Cognitiva

Nubea introduce la idea de **contaminación cognitiva** como la capa extra de ruido entre la intención original del usuario y el contenido que quería acceder.

Un usuario puede entrar a una página para leer un artículo, pero la página puede también desencadenar:

- Scripts externos
- Redes publicitarias
- Intentos de cookies
- Llamadas de analíticas
- Sistemas de reproducción automática
- Sistemas de recomendación
- Píxeles de rastreo
- Prompts de notificación
- Sistemas de terceros incrustados

Nubea hace visible esa actividad.

---

## Inicio Rápido

### Requisitos Previos

- Node.js (v18 o superior recomendado)
- npm

### Instalación

```bash
npm install
```

### Ejecutar

```bash
npm start
```

### Construir y Empaquetar

```bash
# Construir para Linux (AppImage + .deb)
npm run build

# Solo AppImage
npm run build:appimage

# Solo paquete .deb
npm run build:deb
```

---

## Guía Rápida de GitHub

¿Nuevo en Git/GitHub? Consulta [GIT_GUIDE.md](../GIT_GUIDE.md) para instrucciones paso a paso.

¿Quieres contribuir? Consulta [CONTRIBUTING.md](../CONTRIBUTING.md) para directrices.

### Primer Push a GitHub

```bash
# Inicializar git
git init
git add .
git commit -m "Initial commit: Nubea v0.1.0"

# Agregar tu repositorio de GitHub
git remote add origin https://github.com/TU_USUARIO/nubea-browser.git
git branch -M main
git push -u origin main
```

### Crear un Release

```bash
# Etiquetar nueva versión
git tag -a v0.1.0 -m "Release versión 0.1.0"
git push origin v0.1.0
```

GitHub Actions construirá automáticamente los paquetes AppImage y .deb.

---

## Notas Técnicas

Nubea actualmente usa Electron con una partición de sesión temporal. El navegador no implementa un motor de renderizado web personalizado. El renderizado es manejado por Chromium a través de Electron.

El valor de Nubea no es el motor de renderizado. El valor es el marco de navegación:

| Componente | Rol |
|------------|-----|
| **Nubea** | Marco de navegación + inspección en vivo + principio sin-historial |
| **Chromium** | Motor de renderizado |
| **Motores de búsqueda** | Herramientas externas seleccionadas por el usuario |

---

## Estructura del Proyecto

```
nubea-browser/
├── docs/                  # Documentación
│   ├── README.en.md       # Documentación en inglés
│   ├── README.es.md       # Documentación en español
│   └── ARCHITECTURE.md    # Arquitectura del sistema
├── src/                   # Código fuente
│   ├── main.js            # Proceso principal de Electron
│   ├── preload.js         # Script de precarga para seguridad
│   ├── index.html         # Interfaz principal
│   ├── renderer.js        # Lógica de la interfaz
│   └── styles.css         # Estilos
├── .github/workflows/     # Automatización CI/CD
│   └── release.yml        # Auto-construcción de releases
├── package.json           # Dependencias y scripts
├── package-lock.json      # Archivo de bloqueo
├── README.md              # Entrada principal
├── CONTRIBUTING.md        # Guía de contribución
├── GIT_GUIDE.md         # Tutorial de Git
├── LICENSE                # Licencia MIT
└── .gitignore             # Exclusiones de Git
```

---

## Hoja de Ruta

Mejoras planificadas:

- [ ] Múltiples pestañas reales
- [ ] Limpieza de sesión más fuerte
- [ ] Mejores reglas de bloqueo
- [ ] Panel de permisos por sitio
- [ ] Reporte de inspección en vivo exportable
- [ ] Archivo de configuración solo local
- [ ] Empaquetado AppImage / .deb
- [ ] Mejor identidad visual
- [ ] Endurecimiento de seguridad
- [ ] Pruebas automatizadas
- [ ] Puntuación más clara de contaminación cognitiva

---

## Licencia

MIT

---

## Autor

Desarrollado bajo el ecosistema Hanzzel Corp.
