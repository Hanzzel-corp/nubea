# Contributing to Nubea / Contribuir a Nubea

*English below / Español abajo*

---

## 🇬🇧 English

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Hanzzel-corp/nubea-browser.git
cd nubea-browser

# Install dependencies
npm install

# Run in development mode
npm start
```

### Project Structure

- `src/main.js` - Electron main process (window management, session, filtering)
- `src/preload.js` - Security preload script
- `src/renderer.js` - UI logic and interactions
- `src/index.html` - Main UI markup
- `src/styles.css` - Styling
- `docs/` - Documentation (bilingual)

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test locally: `npm start`
5. Commit with clear messages: `git commit -m "Add: new feature description"`
6. Push to your fork: `git push origin feature/my-feature`
7. Open a Pull Request

### Commit Message Format

- `Add:` - New feature
- `Fix:` - Bug fix
- `Update:` - Modification to existing feature
- `Docs:` - Documentation changes
- `Refactor:` - Code restructuring

### Code Style

- Use 2 spaces for indentation
- Follow existing patterns in the codebase
- Comment complex logic
- Keep functions focused and small

---

## 🇪🇸 Español

### Configuración de Desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/Hanzzel-corp/nubea-browser.git
cd nubea-browser

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start
```

### Estructura del Proyecto

- `src/main.js` - Proceso principal de Electron (gestión ventanas, sesión, filtrado)
- `src/preload.js` - Script de precarga de seguridad
- `src/renderer.js` - Lógica de UI e interacciones
- `src/index.html` - Marcado principal de UI
- `src/styles.css` - Estilos
- `docs/` - Documentación (bilingüe)

### Enviar Cambios

1. Haz fork del repositorio
2. Crea una rama de feature: `git checkout -b feature/mi-feature`
3. Realiza tus cambios
4. Prueba localmente: `npm start`
5. Commit con mensajes claros: `git commit -m "Add: descripción de la nueva feature"`
6. Push a tu fork: `git push origin feature/mi-feature`
7. Abre un Pull Request

### Formato de Mensajes de Commit

- `Add:` - Nueva característica
- `Fix:` - Corrección de bug
- `Update:` - Modificación a característica existente
- `Docs:` - Cambios en documentación
- `Refactor:` - Reestructuración de código

### Estilo de Código

- Usa 2 espacios para indentación
- Sigue los patrones existentes en el código
- Comenta lógica compleja
- Mantén funciones enfocadas y pequeñas

---

## Questions? / ¿Preguntas?

Open an issue or contact: hanzzelcorp@proton.me
