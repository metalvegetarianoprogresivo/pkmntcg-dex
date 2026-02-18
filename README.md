# PokéDex TCG — Collection Tracker

![Pokemon TCG](https://img.shields.io/badge/Pokémon%20TCG-Standard-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

PWA para rastrear tu colección de cartas Pokémon TCG. Funciona en móvil y desktop.

🔗 **[Ver Aplicación en Vivo](https://metalvegetarianoprogresivo.github.io/pkmntcg-dex/)**

## 🚀 Setup rápido

### 1. Clonar y configurar

```bash
git clone https://github.com/TU_USUARIO/pokemon-tcg-tracker
cd pokemon-tcg-tracker
```

### 2. Instalar dependencias del script

```bash
cd scripts && npm install && cd ..
```

> **No necesitas API Key.** El proyecto usa [TCGdex](https://tcgdex.dev), una API completamente gratuita y open source.

### 3. Generar la base de datos inicial

```bash
node scripts/fetch-cards.js
```

Esto genera `cards.json` (~20-30 MB) en la raíz del proyecto. La primera vez tarda ~5-10 minutos (descarga cartas set por set con delays corteses).

> 💡 **Idioma:** Por defecto usa inglés. Para cambiar a español, edita `const LANG = 'en'` → `'es'` en `scripts/fetch-cards.js`.

### 4. Publicar en GitHub Pages

```bash
git add .
git commit -m "init: add cards database"
git push
```

En tu repo GitHub → **Settings → Pages → Source: Deploy from branch → main / root**.

Tu app estará en: `https://TU_USUARIO.github.io/pokemon-tcg-tracker`

### 5. Actualización automática mensual

El archivo `.github/workflows/update-cards.yml` ya está configurado para ejecutarse el **1 de cada mes a las 00:00 UTC**. También puedes lanzarlo manualmente desde la pestaña **Actions** de GitHub. No necesita secrets ni configuración adicional.

---

## 📱 Instalar como app en móvil

**iOS (Safari):** Abrir la URL → botón Compartir → "Añadir a pantalla de inicio"  
**Android (Chrome):** Abrir la URL → menú ⋮ → "Añadir a pantalla de inicio"

---

## 💾 Datos y privacidad

- Tu colección se guarda **solo en tu dispositivo** (localStorage)
- Exporta tu colección con el botón **Export** (descarga un `.json`)
- Importa en otro dispositivo con el botón **Import**

---

## 🗂 Estructura del proyecto

```
pokemon-tcg-tracker/
├── index.html                    # La app completa (PWA)
├── cards.json                    # Base de datos (generado, ~25MB)
├── scripts/
│   ├── fetch-cards.js            # Script de actualización (usa TCGdex)
│   └── package.json
└── .github/
    └── workflows/
        └── update-cards.yml      # GitHub Action mensual (sin API Key)
```

---

## 🔧 API utilizada

**[TCGdex](https://tcgdex.dev)** — Completamente gratuita, open source, sin registro.

- Base URL: `https://api.tcgdex.net/v2/en`
- Soporta 10+ idiomas (en, es, fr, de, it, pt-br, ja, zh-tw, id, th...)
- Imágenes hosteadas en `assets.tcgdex.net`
- Compatible con Pokémon TCG y TCG Pocket

---

## 📊 Datos almacenados por carta

| Campo | Descripción |
|-------|-------------|
| `id` | ID único global (ej: `swsh3-136`) |
| `localId` | Número en el set |
| `name` | Nombre de la carta |
| `setId` | ID del set |
| `rarity` | Rareza |
| `category` | Pokémon / Trainer / Energy |
| `imageSmall` | Imagen thumbnail (WebP) |
| `imageLarge` | Imagen HD (WebP) |
