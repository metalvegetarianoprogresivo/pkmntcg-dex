// ════════════════════════════════════════════════
//  TCG — LOAD & INIT
// ════════════════════════════════════════════════
async function loadDatabase() {
  try {
    const res = await fetch('./cards.json');
    if (!res.ok) throw new Error('No se pudo cargar cards.json');
    DB = await res.json();
    initTCG();
  } catch {
    document.getElementById('loading').innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:var(--text-dim)">
        <div style="font-size:48px;margin-bottom:12px">⚠️</div>
        <p style="font-size:16px;color:var(--text)">Base de datos no encontrada</p>
        <p style="font-size:13px;margin-top:8px">Ejecuta <code style="background:var(--surface2);padding:2px 6px;border-radius:4px">node scripts/fetch-cards.js</code></p>
      </div>`;
  }
}

function initTCG() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('sets-container').style.display = 'block';
  // Build card lookup index
  cardIndex = {}; DB.cards.forEach(c => { cardIndex[c.id] = c; });
  const seriesSet = new Set();
  Object.values(DB.sets).forEach(s => { if (s.series) seriesSet.add(s.series); });
  const sel = document.getElementById('filter-series');
  [...seriesSet].sort((a,b) => a.localeCompare(b)).forEach(s => {
    const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o);
  });
  render();
}

// ════════════════════════════════════════════════
//  TCG — RENDER
// ════════════════════════════════════════════════
function render() {
  if (!DB) return;
  const search = currentSearch.toLowerCase().trim();
  const setMap = {};
  DB.cards.forEach(card => {
    const set = DB.sets[card.setId]; if (!set) return;
    if (hidePocket && set.series === 'Pokémon TCG Pocket') return;
    if (currentSeries && set.series !== currentSeries) return;
    if (search) { if (!card.name.toLowerCase().includes(search) && !set.name.toLowerCase().includes(search)) return; }
    const have = hasCard(card.id);
    if (currentFilter === 'have' && !have) return;
    if (currentFilter === 'missing' && have) return;
    if (!setMap[card.setId]) setMap[card.setId] = { set, cards: [] };
    setMap[card.setId].cards.push(card);
  });
  const sortedSets = Object.values(setMap).sort((a,b) => (b.set.releaseDate||'').localeCompare(a.set.releaseDate||''));
  const container = document.getElementById('sets-container');
  const emptyState = document.getElementById('empty-state');
  if (!sortedSets.length) { container.style.display='none'; emptyState.style.display='block'; updateTCGStats(); return; }
  emptyState.style.display = 'none'; container.style.display = 'block';
  container.innerHTML = sortedSets.map(({ set, cards }) => {
    const haveCount = cards.filter(c => hasCard(c.id)).length;
    const pct = cards.length ? Math.round(haveCount/cards.length*100) : 0;
    const isOpen = openSets.has(set.id);
    return `<div class="set-group${isOpen?' open':''}" data-set-id="${set.id}">
      <div class="set-header" onclick="toggleSet('${set.id}')">
        ${set.symbolUrl ? `<img class="set-logo" src="${set.symbolUrl}" alt="" loading="lazy">` : '<div class="set-logo" style="font-size:20px;display:flex;align-items:center;justify-content:center">🃏</div>'}
        <div class="set-info">
          <div class="set-name">${set.name}</div>
          <div class="set-meta">${set.series||''} · ${set.releaseDate||''} · ${cards.length} cartas</div>
        </div>
        <div class="set-progress">
          <div class="set-pct">${haveCount}/${cards.length}</div>
          <div class="mini-bar"><div class="mini-bar-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="set-chevron">▼</div>
      </div>
      <div class="set-cards"><div class="cards-grid">${cards.map(renderCard).join('')}</div></div>
    </div>`;
  }).join('');
  updateTCGStats();
}

function renderCard(card) {
  const have = hasCard(card.id);
  return `<div class="card-item ${have?'have':'missing'}" onclick="openTCGModal('${card.id}')" title="${card.name}">
    <div class="card-img-wrap">
      ${card.imageSmall ? `<img src="${card.imageSmall}" alt="${card.name}" loading="lazy">` : '<div class="card-img-placeholder">🃏</div>'}
      <div class="card-status-badge ${have?'have':'missing'}" onclick="quickAddCard(event,'${card.id}')">✓</div>
    </div>
    <div class="card-info">
      <div class="card-name">${card.name}</div>
      <div class="card-number">#${card.localId||card.number||''}</div>
    </div>
  </div>`;
}

function updateTCGStats() {
  let owned, total;
  if (hidePocket && DB) {
    const pocketSets = new Set(Object.entries(DB.sets).filter(([,s]) => s.series === 'Pokémon TCG Pocket').map(([id]) => id));
    owned = Object.keys(collection).filter(id => collection[id] && cardIndex[id] && !pocketSets.has(cardIndex[id].setId)).length;
    total = DB.cards.filter(c => !pocketSets.has(c.setId)).length;
  } else {
    owned = Object.values(collection).filter(Boolean).length;
    total = DB ? DB.totalCards : 0;
  }
  const pct = total ? owned/total*100 : 0;
  document.getElementById('stat-have').textContent = owned.toLocaleString();
  document.getElementById('stat-missing').textContent = Math.max(0,total-owned).toLocaleString();
  document.getElementById('stat-total').textContent = total.toLocaleString();
  document.getElementById('progress-fill').style.width = pct+'%';
  document.getElementById('stat-pct').textContent = pct.toFixed(1)+'%';
}

function toggleSet(setId) {
  openSets.has(setId) ? openSets.delete(setId) : openSets.add(setId);
  const viewId = currentView === 'collections' ? 'coll-detail-container' : 'sets-container';
  document.querySelector(`#${viewId} [data-set-id="${setId}"]`)?.classList.toggle('open');
}

function patchCardDOM(cardId) {
  const el = document.querySelector(`.card-item[onclick="openTCGModal('${cardId}')"]`); if (!el) return;
  const have = hasCard(cardId);
  el.className = `card-item ${have?'have':'missing'}`;
  const badge = el.querySelector('.card-status-badge');
  badge.className = `card-status-badge ${have?'have':'missing'}`;
  const sg = el.closest('.set-group'); if (!sg) return;
  const sid = sg.dataset.setId;
  const sc = DB.cards.filter(c => c.setId === sid);
  const hc = sc.filter(c => hasCard(c.id)).length;
  const pct = Math.round(hc/sc.length*100);
  sg.querySelector('.set-pct').textContent = `${hc}/${sc.length}`;
  sg.querySelector('.mini-bar-fill').style.width = pct+'%';
}

// ════════════════════════════════════════════════
//  TCG — EXPORT / IMPORT
// ════════════════════════════════════════════════
document.getElementById('btn-export').addEventListener('click', () => {
  const data = { exportedAt: new Date().toISOString(), version: 3, collection, dexStatus, collections };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pokemon-tracker-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  toast('✅ Colección exportada (TCG + Living Dex + Colecciones)');
});
document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.collection)  collection  = data.collection;
      if (data.dexStatus)   dexStatus   = data.dexStatus;
      if (data.collections) collections = data.collections;
      initCollections(); // ensure Wishlist collection always exists
      saveTCG(); saveDex(); saveCollections();
      render(); renderDex();
      toast('✅ Datos importados correctamente');
    } catch { toast('❌ Error al importar el archivo'); }
  };
  reader.readAsText(file); e.target.value = '';
});

// Add all filtered cards to a collection
document.getElementById('btn-add-all-collection').addEventListener('click', () => {
  if (!DB) return;
  const search = currentSearch.toLowerCase().trim();
  const visibleIds = [];
  DB.cards.forEach(card => {
    const set = DB.sets[card.setId]; if (!set) return;
    if (hidePocket && set.series === 'Pokémon TCG Pocket') return;
    if (currentSeries && set.series !== currentSeries) return;
    if (search && !card.name.toLowerCase().includes(search) && !set.name.toLowerCase().includes(search)) return;
    const have = hasCard(card.id);
    if (currentFilter === 'have' && !have) return;
    if (currentFilter === 'missing' && have) return;
    visibleIds.push(card.id);
  });
  if (!visibleIds.length) { toast('⚠️ No hay cartas visibles para añadir'); return; }
  if (visibleIds.length > 500 && !confirm(`Vas a añadir ${visibleIds.length.toLocaleString()} cartas. ¿Continuar?`)) return;
  openCollectionPicker((collId) => {
    const added = addMultipleCardsToCollection(collId, visibleIds);
    toast(`📁 ${added} cartas añadidas a ${collections[collId].name}`);
  }, null);
});

// ════════════════════════════════════════════════
//  TCG CARD MODAL
// ════════════════════════════════════════════════
function openTCGModal(cardId) {
  const card = DB.cards.find(c => c.id === cardId); if (!card) return;
  const set = DB.sets[card.setId]; modalCardId = cardId;
  document.getElementById('modal-img').src = card.imageLarge || card.imageSmall || '';
  document.getElementById('modal-name').textContent = card.name;
  document.getElementById('modal-meta').textContent = `${set?.name||''} · #${card.localId||card.number||''}${card.rarity?' · '+card.rarity:''}`;
  updateTCGModalBtns();
  updateWishModalBtn();
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function updateTCGModalBtns() {
  const have = hasCard(modalCardId);
  document.getElementById('modal-btn-have').style.opacity = have ? '1' : '0.4';
  document.getElementById('modal-btn-missing').style.opacity = !have ? '1' : '0.4';
}
document.getElementById('modal-btn-have').addEventListener('click', () => {
  if (!hasCard(modalCardId)) { collection[modalCardId] = true; saveTCG(); updateTCGModalBtns(); patchCardDOM(modalCardId); updateTCGStats(); toast('✅ Carta añadida'); }
});
document.getElementById('modal-btn-missing').addEventListener('click', () => {
  if (hasCard(modalCardId)) { delete collection[modalCardId]; saveTCG(); updateTCGModalBtns(); patchCardDOM(modalCardId); updateTCGStats(); toast('🗑 Carta eliminada'); }
});
function quickAddCard(event, cardId) {
  event.stopPropagation();
  if (hasCard(cardId)) return;
  collection[cardId] = true;
  saveTCG();
  patchCardDOM(cardId);
  updateTCGStats();
  toast('✅ Carta añadida');
}

function updateWishModalBtn() {
  const inWishlist = isInWishlist(modalCardId);
  const btn = document.getElementById('modal-btn-wish');
  btn.classList.toggle('active', inWishlist);
  btn.textContent = inWishlist ? '⭐ En wishlist' : '☆ Añadir a wishlist';
}
document.getElementById('modal-btn-wish').addEventListener('click', () => {
  const wl = collections[WISHLIST_COLL_ID]; if (!wl) return;
  if (wl.cards[modalCardId]) {
    delete wl.cards[modalCardId];
    toast('☆ Eliminado de la Wishlist');
  } else {
    wl.cards[modalCardId] = { obtained: false, comment: '' };
    toast('⭐ Añadido a la Wishlist');
  }
  saveCollections();
  updateWishModalBtn();
});
document.getElementById('modal-btn-collection').addEventListener('click', () => {
  if (!modalCardId) return;
  openCollectionPicker((collId) => {
    addCardToCollection(collId, modalCardId);
    toast('📁 Añadida a ' + collections[collId].name);
  }, modalCardId);
});
function closeTCGModal() { document.getElementById('modal-overlay').classList.remove('open'); document.body.style.overflow = ''; modalCardId = null; }
document.getElementById('modal-close').addEventListener('click', closeTCGModal);
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target.id==='modal-overlay') closeTCGModal(); });

// TCG Filters
document.querySelectorAll('#view-tcg .filter-tab[data-filter]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#view-tcg .filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active'); currentFilter = tab.dataset.filter; render();
  });
});
document.getElementById('filter-series').addEventListener('change', e => { currentSeries = e.target.value; render(); });
document.getElementById('chk-hide-pocket').addEventListener('change', e => {
  hidePocket = e.target.checked;
  const sel = document.getElementById('filter-series');
  [...sel.options].forEach(o => { if (o.value === 'Pokémon TCG Pocket') o.hidden = hidePocket; });
  if (hidePocket && currentSeries === 'Pokémon TCG Pocket') { currentSeries = ''; sel.value = ''; }
  render();
});
