// ════════════════════════════════════════════════
//  LIVING DEX — GENERATIONS
// ════════════════════════════════════════════════
const GENERATIONS = [
  { gen: 1, name: 'Generación I — Kanto',      start: 1,    end: 151  },
  { gen: 2, name: 'Generación II — Johto',     start: 152,  end: 251  },
  { gen: 3, name: 'Generación III — Hoenn',    start: 252,  end: 386  },
  { gen: 4, name: 'Generación IV — Sinnoh',    start: 387,  end: 493  },
  { gen: 5, name: 'Generación V — Unova',      start: 494,  end: 649  },
  { gen: 6, name: 'Generación VI — Kalos',     start: 650,  end: 721  },
  { gen: 7, name: 'Generación VII — Alola',    start: 722,  end: 809  },
  { gen: 8, name: 'Generación VIII — Galar',   start: 810,  end: 905  },
  { gen: 9, name: 'Generación IX — Paldea',    start: 906,  end: 1025 },
];
function getGen(id) { return GENERATIONS.find(g => id >= g.start && id <= g.end) || { gen: 0, name: 'Otros', start: 0, end: 99999 }; }

// Type colors for pills
const TYPE_COLORS = {
  normal:'#A8A878',fire:'#F08030',water:'#6890F0',electric:'#F8D030',
  grass:'#78C850',ice:'#98D8D8',fighting:'#C03028',poison:'#A040A0',
  ground:'#E0C068',flying:'#A890F0',psychic:'#F85888',bug:'#A8B820',
  rock:'#B8A038',ghost:'#705898',dragon:'#7038F8',dark:'#705848',
  steel:'#B8B8D0',fairy:'#EE99AC',stellar:'#40B5A5'
};

// ════════════════════════════════════════════════
//  LIVING DEX — LOAD POKEMON
// ════════════════════════════════════════════════
async function initDex() {
  // Try cache first
  try {
    const raw = localStorage.getItem(POKEMON_CACHE);
    if (raw) {
      const cached = JSON.parse(raw);
      if (Date.now() - cached.ts < CACHE_TTL && cached.list?.length > 0) {
        pokemonList = cached.list;
        finishDexInit();
        return;
      }
    }
  } catch {}

  // Fetch from PokéAPI
  const container = document.getElementById('dex-grid-container');
  container.innerHTML = `<div class="dex-loading-bar-wrap" id="dex-loading">
    <div class="dex-loading-msg">Descargando Pokédex nacional...</div>
    <div class="dex-bar-outer"><div class="dex-bar-inner" id="dex-bar"></div></div>
    <div class="dex-bar-label" id="dex-bar-label">Conectando con PokéAPI...</div>
  </div>`;

  try {
    // Step 1: get full species list
    setDexLoadBar(5, 'Obteniendo lista de Pokémon...');
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0');
    if (!res.ok) throw new Error('PokéAPI no disponible');
    const data = await res.json();
    const species = data.results;

    // Filter to numbered Pokémon only (id 1–1025, no forms)
    const mainPokemon = species
      .map(p => { const parts = p.url.split('/'); return { name: p.name, id: parseInt(parts[parts.length-2]) }; })
      .filter(p => p.id >= 1 && p.id <= 1025)
      .sort((a,b) => a.id - b.id);

    setDexLoadBar(20, `${mainPokemon.length} Pokémon encontrados. Cargando detalles...`);

    // Step 2: fetch details in batches of 50
    const BATCH = 50;
    const total = mainPokemon.length;
    pokemonList = [];

    for (let i = 0; i < total; i += BATCH) {
      const batch = mainPokemon.slice(i, i+BATCH);
      const results = await Promise.all(batch.map(p =>
        fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      ));
      results.forEach((detail, idx) => {
        const base = batch[idx];
        if (!detail) {
          pokemonList.push({ id: base.id, name: base.name, sprite: null, types: [] });
          return;
        }
        pokemonList.push({
          id: detail.id,
          name: detail.name,
          sprite: detail.sprites?.other?.['official-artwork']?.front_default
                  || detail.sprites?.front_default
                  || null,
          types: detail.types.map(t => t.type.name),
        });
      });
      const pct = 20 + Math.round((Math.min(i+BATCH, total)/total) * 75);
      setDexLoadBar(pct, `${Math.min(i+BATCH, total)} / ${total} Pokémon`);
    }

    setDexLoadBar(100, `✅ ${pokemonList.length} Pokémon cargados`);

    // Cache
    localStorage.setItem(POKEMON_CACHE, JSON.stringify({ ts: Date.now(), list: pokemonList }));
    await new Promise(r => setTimeout(r, 400));
    finishDexInit();

  } catch (err) {
    container.innerHTML = `<div class="empty-state">
      <div class="icon">⚠️</div>
      <p>No se pudo cargar la Pokédex</p>
      <p style="font-size:13px;margin-top:8px;color:var(--text-dim)">${err.message}</p>
      <button class="btn accent" style="margin-top:16px" onclick="initDex()">Reintentar</button>
    </div>`;
  }
}

function setDexLoadBar(pct, label) {
  const bar = document.getElementById('dex-bar');
  const lbl = document.getElementById('dex-bar-label');
  if (bar) bar.style.width = pct+'%';
  if (lbl) lbl.textContent = label;
}

function finishDexInit() {
  // Populate gen filter
  const sel = document.getElementById('dex-filter-gen');
  GENERATIONS.forEach(g => {
    const o = document.createElement('option'); o.value = g.gen; o.textContent = g.name; sel.appendChild(o);
  });
  renderDex();
}

// ════════════════════════════════════════════════
//  LIVING DEX — RENDER
// ════════════════════════════════════════════════
function renderDex() {
  if (!pokemonList.length) return;
  updateDexStats();

  let filtered = pokemonList;
  if (dexSearch) filtered = filtered.filter(p => p.name.toLowerCase().includes(dexSearch) || String(p.id).includes(dexSearch));
  if (dexGenFilter) {
    const g = GENERATIONS.find(g => g.gen == dexGenFilter);
    if (g) filtered = filtered.filter(p => p.id >= g.start && p.id <= g.end);
  }
  if (dexFilter === 'registered') filtered = filtered.filter(p => isDexed(p.id));
  if (dexFilter === 'missing')    filtered = filtered.filter(p => !isDexed(p.id));

  const container = document.getElementById('dex-grid-container');
  if (!filtered.length) { container.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>No se encontraron Pokémon</p></div>'; return; }

  // Group by generation
  const genGroups = {};
  filtered.forEach(p => {
    const g = getGen(p.id);
    if (!genGroups[g.gen]) genGroups[g.gen] = { ...g, pokemon: [] };
    genGroups[g.gen].pokemon.push(p);
  });

  const sorted = Object.values(genGroups).sort((a,b) => a.gen - b.gen);
  container.innerHTML = sorted.map(group => {
    const registered = group.pokemon.filter(p => isDexed(p.id)).length;
    const total = group.pokemon.length;
    const pct = total ? Math.round(registered/total*100) : 0;
    return `
      <div class="gen-header">
        <div class="gen-badge">GEN ${group.gen||'?'}</div>
        <div class="gen-title">${group.name}</div>
        <div class="gen-progress-wrap">
          <div class="gen-pct">${registered}/${total}</div>
          <div class="gen-mini-bar"><div class="gen-mini-fill" style="width:${pct}%"></div></div>
        </div>
      </div>
      <div class="dex-grid">
        ${group.pokemon.map(p => renderDexItem(p)).join('')}
      </div>
    `;
  }).join('');
}

function renderDexItem(p) {
  const reg = isDexed(p.id);
  const typeDots = p.types.map(t => `<div class="dex-type-dot t-${t}"></div>`).join('');
  const num = String(p.id).padStart(4,'0');
  return `<div class="dex-item ${reg?'registered':'missing-dex'}" onclick="openDexModal(${p.id})">
    <div class="dex-sprite-wrap">
      ${p.sprite ? `<img class="dex-sprite" src="${p.sprite}" alt="${p.name}" loading="lazy">` : `<div class="dex-sprite" style="font-size:28px;display:flex;align-items:center;justify-content:center">❓</div>`}
      <div class="dex-check" onclick="quickRegisterDex(event, ${p.id})">✓</div>
    </div>
    <div class="dex-number">#${num}</div>
    <div class="dex-name">${p.name}</div>
    <div class="dex-type-dots">${typeDots}</div>
  </div>`;
}

function updateDexStats() {
  const total = pokemonList.length;
  const registered = pokemonList.filter(p => isDexed(p.id)).length;
  const pct = total ? registered/total*100 : 0;
  document.getElementById('dex-stat-have').textContent = registered.toLocaleString();
  document.getElementById('dex-stat-missing').textContent = (total-registered).toLocaleString();
  document.getElementById('dex-stat-total').textContent = total.toLocaleString();
  document.getElementById('dex-progress-fill').style.width = pct+'%';
  document.getElementById('dex-stat-pct').textContent = pct.toFixed(1)+'%';
}

// ════════════════════════════════════════════════
//  DEX MODAL
// ════════════════════════════════════════════════
function openDexModal(pokemonId) {
  const p = pokemonList.find(p => p.id === pokemonId); if (!p) return;
  currentDexPokemonId = pokemonId;

  document.getElementById('dex-modal-sprite').src = p.sprite || '';
  document.getElementById('dex-modal-number').textContent = `#${String(p.id).padStart(4,'0')}`;
  document.getElementById('dex-modal-name').textContent = p.name;

  // Types
  document.getElementById('dex-modal-types').innerHTML = p.types.map(t =>
    `<span class="type-pill" style="background:${TYPE_COLORS[t]||'#888'}">${t}</span>`
  ).join('');

  updateDexModalBtns();

  // Find all TCG cards for this Pokémon (exact match or name + suffix like " V", " VMAX", " ex")
  let tcgCards = [];
  if (DB) {
    const nameLower = p.name.toLowerCase();
    tcgCards = DB.cards.filter(c => {
      const cardName = c.name.toLowerCase();
      return cardName === nameLower ||
        cardName.startsWith(nameLower + ' ') ||
        cardName.startsWith(nameLower + '-');
    });
  }

  document.getElementById('dex-modal-card-count').textContent = tcgCards.length;
  const row = document.getElementById('dex-modal-cards-row');

  if (!tcgCards.length) {
    row.innerHTML = `<div class="dex-no-cards">No hay cartas TCG disponibles para este Pokémon</div>`;
  } else {
    row.innerHTML = tcgCards.map(card => {
      const set = DB?.sets[card.setId];
      const have = hasCard(card.id);
      return `<div class="dex-mini-card ${have?'have':''}" onclick="openTCGModalFromDex('${card.id}')">
        <div class="dex-mini-card-img">
          ${card.imageSmall ? `<img src="${card.imageSmall}" alt="${card.name}" loading="lazy">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px">🃏</div>'}
          <div class="card-status-badge ${have?'have':'missing'}">${have?'✓':'·'}</div>
        </div>
        <div class="dex-mini-card-info">
          <div class="dex-mini-card-set">${set?.name||''}</div>
          <div class="dex-mini-card-num">#${card.localId||card.number||''}</div>
          <div class="dex-mini-card-rarity">${card.rarity||''}</div>
        </div>
      </div>`;
    }).join('');
  }

  document.getElementById('dex-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function updateDexModalBtns() {
  const reg = isDexed(currentDexPokemonId);
  document.getElementById('dex-btn-register').style.opacity = reg ? '1' : '0.4';
  document.getElementById('dex-btn-unregister').style.opacity = !reg ? '1' : '0.4';
}

function quickRegisterDex(event, pokemonId) {
  event.stopPropagation();
  if (isDexed(pokemonId)) return;
  dexStatus[pokemonId] = true;
  saveDex();
  patchDexItemDOM(pokemonId);
  updateDexStats();
  toast('✅ Pokémon registrado en la dex');
}

document.getElementById('dex-btn-register').addEventListener('click', () => {
  if (!isDexed(currentDexPokemonId)) {
    dexStatus[currentDexPokemonId] = true; saveDex();
    updateDexModalBtns(); patchDexItemDOM(currentDexPokemonId);
    updateDexStats(); toast('✅ Pokémon registrado en la dex');
  }
});
document.getElementById('dex-btn-unregister').addEventListener('click', () => {
  if (isDexed(currentDexPokemonId)) {
    delete dexStatus[currentDexPokemonId]; saveDex();
    updateDexModalBtns(); patchDexItemDOM(currentDexPokemonId);
    updateDexStats(); toast('🗑 Pokémon eliminado de la dex');
  }
});

function patchDexItemDOM(pokemonId) {
  const p = pokemonList.find(p => p.id === pokemonId); if (!p) return;
  const reg = isDexed(pokemonId);
  const el = document.querySelector(`.dex-item[onclick="openDexModal(${pokemonId})"]`); if (!el) return;
  el.className = `dex-item ${reg?'registered':'missing-dex'}`;
  const sprite = el.querySelector('.dex-sprite');
  if (sprite) sprite.style.filter = reg ? 'drop-shadow(0 2px 8px rgba(46,204,113,0.35))' : 'grayscale(1) brightness(0.4)';
  // update gen header progress
  const g = getGen(pokemonId);
  updateGenHeader(g.gen);
}

function updateGenHeader(genNum) {
  const genItems = pokemonList.filter(p => { const g = getGen(p.id); return g.gen === genNum; });
  const reg = genItems.filter(p => isDexed(p.id)).length;
  const total = genItems.length;
  const pct = total ? Math.round(reg/total*100) : 0;
  const headers = document.querySelectorAll('.gen-header');
  headers.forEach(h => {
    const badge = h.querySelector('.gen-badge');
    if (badge && badge.textContent.includes(`GEN ${genNum}`)) {
      h.querySelector('.gen-pct').textContent = `${reg}/${total}`;
      h.querySelector('.gen-mini-fill').style.width = pct+'%';
    }
  });
}

// Open TCG modal from within dex modal
function openTCGModalFromDex(cardId) {
  closeDexModal();
  setTimeout(() => openTCGModal(cardId), 50);
}

function closeDexModal() {
  document.getElementById('dex-modal-overlay').classList.remove('open');
  document.body.style.overflow = ''; currentDexPokemonId = null;
}
document.getElementById('dex-modal-close').addEventListener('click', closeDexModal);
document.getElementById('dex-modal-overlay').addEventListener('click', e => { if (e.target.id==='dex-modal-overlay') closeDexModal(); });

// Dex filters
document.querySelectorAll('[data-dex-filter]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-dex-filter]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active'); dexFilter = tab.dataset.dexFilter; renderDex();
  });
});
document.getElementById('dex-filter-gen').addEventListener('change', e => { dexGenFilter = e.target.value; renderDex(); });
