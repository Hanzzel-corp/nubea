# Git Guide for Nubea / Guía de Git para Nubea

*English below / Español abajo*

---

## 🇬🇧 Initial Setup (First Time)

```bash
# Initialize git repository
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: Nubea v0.1.0"

# Add remote repository (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/nubea-browser.git

# Push to main branch
git branch -M main
git push -u origin main
```

## Daily Workflow

```bash
# Check status
git status

# Add specific files
git add src/main.js

# Or add all changes
git add .

# Commit with descriptive message
git commit -m "Fix: resolve window resize issue"

# Push to remote
git push
```

## Creating a Release

```bash
# Tag a new version
git tag -a v0.1.0 -m "Release version 0.1.0"

# Push tags to trigger GitHub Actions
git push origin v0.1.0
```

## Useful Commands

```bash
# View commit history
git log --oneline

# Create and switch to new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main

# Pull latest changes
git pull origin main

# View differences
git diff

# Undo last commit (keep changes)
git reset --soft HEAD~1
```

---

## 🇪🇸 Configuración Inicial (Primera Vez)

```bash
# Inicializar repositorio git
git init

# Agregar todos los archivos
git add .

# Primer commit
git commit -m "Initial commit: Nubea v0.1.0"

# Agregar repositorio remoto (reemplaza con tu URL de GitHub)
git remote add origin https://github.com/TU_USUARIO/nubea-browser.git

# Push a la rama main
git branch -M main
git push -u origin main
```

## Flujo de Trabajo Diario

```bash
# Ver estado
git status

# Agregar archivos específicos
git add src/main.js

# O agregar todos los cambios
git add .

# Commit con mensaje descriptivo
git commit -m "Fix: resolver problema de redimensionamiento"

# Push al remoto
git push
```

## Crear un Release

```bash
# Etiquetar nueva versión
git tag -a v0.1.0 -m "Release versión 0.1.0"

# Push tags para activar GitHub Actions
git push origin v0.1.0
```

## Comandos Útiles

```bash
# Ver historial de commits
git log --oneline

# Crear y cambiar a nueva rama
git checkout -b feature/nueva-feature

# Cambiar entre ramas
git checkout main

# Traer cambios más recientes
git pull origin main

# Ver diferencias
git diff

# Deshacer último commit (mantener cambios)
git reset --soft HEAD~1
```

---

## Quick Reference / Referencia Rápida

| Command | Description | Descripción |
|---------|-------------|-------------|
| `git status` | Check changes | Ver cambios |
| `git add .` | Stage all files | Preparar todos los archivos |
| `git commit -m "msg"` | Save changes | Guardar cambios |
| `git push` | Upload to remote | Subir al remoto |
| `git pull` | Download changes | Descargar cambios |
| `git log` | View history | Ver historial |

---

## Need Help? / ¿Necesitas Ayuda?

- Git documentation: https://git-scm.com/doc
- GitHub guides: https://guides.github.com
