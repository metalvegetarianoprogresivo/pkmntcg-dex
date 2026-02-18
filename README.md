# PokéDex TCG — Collection Tracker

PWA para rastrear tu colección de cartas Pokémon TCG. Funciona en móvil y desktop.

## 🚀 Setup rápido

### 1. Clonar y configurar

```bash
git clone https://github.com/TU_USUARIO/pokemon-tcg-tracker
cd pokemon-tcg-tracker
```

### 2. Obtener API Key (gratuita)

1. Regístrate en [pokemontcg.io](https://pokemontcg.io)
2. Copia tu API Key
3. En tu repositorio GitHub → **Settings → Secrets and variables → Actions**
4. Crea un secreto llamado `POKEMONTCG_API_KEY` con tu clave

> Sin API Key funciona pero con límite de 1000 peticiones/día (puede no ser suficiente para la descarga inicial de ~18k cartas). Con API Key: sin límites prácticos.

### 3. Generar la base de datos inicial

```bash
cd scripts
npm install
cd ..
POKEMONTCG_API_KEY=tu_clave_aqui node scripts/fetch-cards.js
```

Esto genera `cards.json` (~15-20 MB) en la raíz del proyecto. La primera vez tarda ~3-5 minutos.

### 4. Publicar en GitHub Pages

```bash
git add .
git commit -m "init: add cards database"
git push
```

En tu repo GitHub → **Settings → Pages → Source: Deploy from branch → main / root**.

Tu app estará en: `https://TU_USUARIO.github.io/pokemon-tcg-tracker`

### 5. Actualización automática mensual

El archivo `.github/workflows/update-cards.yml` ya está configurado para ejecutarse el **1 de cada mes a las 00:00 UTC**. También puedes lanzarlo manualmente desde la pestaña **Actions** de GitHub.

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
├── cards.json                    # Base de datos (generado, ~20MB)
├── scripts/
│   ├── fetch-cards.js            # Script de actualización
│   └── package.json
└── .github/
    └── workflows/
        └── update-cards.yml      # GitHub Action mensual
```

---

## 🔧 Ejecutar la base de datos manualmente

```bash
# Actualizar cards.json en cualquier momento
node scripts/fetch-cards.js

# Con API key explícita
POKEMONTCG_API_KEY=xxxx node scripts/fetch-cards.js
```

---

## 📊 Datos almacenados por carta

| Campo | Descripción |
|-------|-------------|
| `id` | ID único (ej: `xy1-1`) |
| `name` | Nombre del Pokémon |
| `number` | Número en el set |
| `rarity` | Rareza |
| `setId` | ID del set |
| `imageSmall` | Imagen thumbnail |
| `imageLarge` | Imagen HD |
| `nationalPokedexNumbers` | Número en Pokédex nacional |
