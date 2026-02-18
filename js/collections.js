// ════════════════════════════════════════════════
//  COLLECTIONS — CRUD
// ════════════════════════════════════════════════
function generateCollectionId() {
  return 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}
function escapeHtml(str) {
  const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}
function createCollection(name) {
  const id = generateCollectionId();
  collections[id] = { name: name.trim(), createdAt: new Date().toISOString(), cards: {} };
  saveCollections();
  return id;
}
function deleteCollection(collId) {
  delete collections[collId];
  saveCollections();
  if (currentCollectionId === collId) { currentCollectionId = null; showCollListView(); }
}
function addCardToCollection(collId, cardId) {
  const c = collections[collId]; if (!c) return;
  if (!c.cards[cardId]) { c.cards[cardId] = { obtained: false, comment: '' }; saveCollections(); }
}
function removeCardFromCollection(collId, cardId) {
  const c = collections[collId]; if (!c) return;
  delete c.cards[cardId]; saveCollections();
}
function toggleCardObtained(collId, cardId) {
  const c = collections[collId]; if (!c || !c.cards[cardId]) return;
  c.cards[cardId].obtained = !c.cards[cardId].obtained; saveCollections();
}
function setCardComment(collId, cardId, comment) {
  const c = collections[collId]; if (!c || !c.cards[cardId]) return;
  c.cards[cardId].comment = comment.trim(); saveCollections();
}
function addMultipleCardsToCollection(collId, cardIds) {
  const c = collections[collId]; if (!c) return 0;
  let added = 0;
  cardIds.forEach(id => { if (!c.cards[id]) { c.cards[id] = { obtained: false, comment: '' }; added++; } });
  saveCollections();
  return added;
}

// ════════════════════════════════════════════════
//  COLLECTIONS — LIST VIEW
// ════════════════════════════════════════════════
function renderCollectionsList() {
  const container = document.getElementById('coll-list-container');
  const emptyEl = document.getElementById('coll-empty');
  const entries = Object.entries(collections);
  const totalCards = entries.reduce((s, [, c]) => s + Object.keys(c.cards).length, 0);
  document.getElementById('coll-stat-count').textContent = entries.length;
  document.getElementById('coll-stat-cards').textContent = totalCards.toLocaleString();
  if (!entries.length) { container.innerHTML = ''; emptyEl.style.display = 'block'; return; }
  emptyEl.style.display = 'none';
  // Wishlist pinned first, then others sorted newest-first
  const wishEntry = entries.find(([id]) => id === WISHLIST_COLL_ID);
  const otherEntries = entries.filter(([id]) => id !== WISHLIST_COLL_ID)
    .sort((a, b) => (b[1].createdAt || '').localeCompare(a[1].createdAt || ''));
  const sorted = wishEntry ? [wishEntry, ...otherEntries] : otherEntries;
  container.innerHTML = '<div style="padding:12px 16px;max-width:1200px;margin:0 auto">' +
    sorted.map(([id, coll]) => {
      const cc = Object.keys(coll.cards).length;
      const oc = Object.values(coll.cards).filter(c => c.obtained).length;
      const pct = cc ? Math.round(oc / cc * 100) : 0;
      const dateStr = coll.createdAt ? new Date(coll.createdAt).toLocaleDateString('es-ES') : '';
      const isWL = id === WISHLIST_COLL_ID;
      return `<div class="coll-card" onclick="openCollectionDetail('${id}')">
        <div class="coll-card-icon">${isWL ? '⭐' : '📁'}</div>
        <div class="coll-card-info">
          <div class="coll-card-name">${escapeHtml(coll.name)}</div>
          <div class="coll-card-meta">${cc} cartas · ${oc} obtenidas · ${dateStr}</div>
        </div>
        <div class="coll-card-progress">
          <div class="coll-card-pct">${oc}/${cc}</div>
          <div class="mini-bar"><div class="mini-bar-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="coll-card-actions" onclick="event.stopPropagation()">
          ${isWL ? '' : `<button class="coll-card-delete" onclick="confirmDeleteCollection('${id}')" title="Eliminar">🗑</button>`}
        </div>
      </div>`;
    }).join('') + '</div>';
}

function confirmDeleteCollection(collId) {
  if (collId === WISHLIST_COLL_ID) { toast('⚠️ La Wishlist no se puede eliminar'); return; }
  const c = collections[collId]; if (!c) return;
  if (confirm('¿Eliminar la colección "' + c.name + '"? Esta acción no se puede deshacer.')) {
    deleteCollection(collId);
    renderCollectionsList();
    toast('🗑 Colección eliminada');
  }
}

// ════════════════════════════════════════════════
//  COLLECTIONS — DETAIL VIEW
// ════════════════════════════════════════════════
function openCollectionDetail(collId) {
  currentCollectionId = collId;
  collDetailFilter = 'all';
  collDetailSearch = '';
  document.getElementById('coll-list-view').style.display = 'none';
  document.getElementById('coll-detail-view').style.display = 'block';
  document.querySelectorAll('[data-coll-filter]').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-coll-filter="all"]').classList.add('active');
  renderCollectionDetail();
}

function showCollListView() {
  currentCollectionId = null;
  document.getElementById('coll-detail-view').style.display = 'none';
  document.getElementById('coll-list-view').style.display = 'block';
  renderCollectionsList();
}

function renderCollectionDetail() {
  if (!DB || !currentCollectionId) return;
  const coll = collections[currentCollectionId];
  if (!coll) { showCollListView(); return; }
  document.getElementById('coll-detail-name').textContent = coll.name;
  const search = collDetailSearch.toLowerCase().trim();
  const cardEntries = Object.entries(coll.cards)
    .map(([cardId, status]) => { const card = cardIndex[cardId]; return card ? { card, status } : null; })
    .filter(Boolean)
    .filter(({ card, status }) => {
      if (search && !card.name.toLowerCase().includes(search)) return false;
      if (collDetailFilter === 'obtained' && !status.obtained) return false;
      if (collDetailFilter === 'missing' && status.obtained) return false;
      return true;
    });
  const allCards = Object.values(coll.cards);
  const total = allCards.length;
  const obtained = allCards.filter(c => c.obtained).length;
  const pct = total ? obtained / total * 100 : 0;
  document.getElementById('coll-detail-obtained').textContent = obtained;
  document.getElementById('coll-detail-looking').textContent = total - obtained;
  document.getElementById('coll-detail-total').textContent = total;
  document.getElementById('coll-detail-progress').style.width = pct + '%';
  document.getElementById('coll-detail-pct').textContent = pct.toFixed(1) + '%';
  const container = document.getElementById('coll-detail-container');
  const emptyEl = document.getElementById('coll-detail-empty');
  if (!cardEntries.length) { container.innerHTML = ''; emptyEl.style.display = 'block'; return; }
  emptyEl.style.display = 'none';
  const collId = currentCollectionId;
  container.innerHTML = `<div style="padding:12px 16px;max-width:1200px;margin:0 auto">
    <div class="cards-grid">${cardEntries.map(({ card, status }) =>
      renderCollDetailCard(card, status, collId)
    ).join('')}</div>
  </div>`;
}

function renderCollDetailCard(card, status, collId) {
  return `<div class="coll-detail-card ${status.obtained ? 'obtained' : ''}" data-coll-card-id="${card.id}">
    <div class="card-img-wrap" onclick="openTCGModal('${card.id}')">
      ${card.imageSmall ? `<img src="${card.imageSmall}" alt="${escapeHtml(card.name)}" loading="lazy">` : '<div class="card-img-placeholder">🃏</div>'}
    </div>
    ${status.comment ? `<div class="coll-comment-badge" title="${escapeHtml(status.comment)}">${escapeHtml(status.comment)}</div>` : ''}
    <div class="card-info">
      <div class="card-name">${card.name}</div>
      <div class="card-number">#${card.localId || card.number || ''}</div>
    </div>
    <div class="coll-detail-actions">
      <button class="${status.obtained ? 'cda-obtained' : 'cda-looking'}" onclick="toggleCollObtained('${collId}','${card.id}')" title="${status.obtained ? 'Marcar como buscando' : 'Marcar como obtenida'}">
        ${status.obtained ? '✓' : '○'}
      </button>
      <button class="cda-comment" onclick="openCommentModal('${collId}','${card.id}')" title="Comentario">💬</button>
      <button class="cda-remove" onclick="removeFromCollDetail('${collId}','${card.id}')" title="Quitar">✕</button>
    </div>
  </div>`;
}

function toggleCollObtained(collId, cardId) {
  toggleCardObtained(collId, cardId);
  renderCollectionDetail();
}

function removeFromCollDetail(collId, cardId) {
  removeCardFromCollection(collId, cardId);
  renderCollectionDetail();
  toast('✕ Carta eliminada de la colección');
}

// ════════════════════════════════════════════════
//  COLLECTIONS — PICKER MODAL
// ════════════════════════════════════════════════
function openCollectionPicker(callback, cardId) {
  collPickerCallback = callback;
  const list = document.getElementById('coll-picker-list');
  const entries = Object.entries(collections);
  if (!entries.length) {
    list.innerHTML = '<p style="color:var(--text-dim);font-size:13px;padding:12px">No hay colecciones. Crea una primero.</p>';
  } else {
    entries.sort((a, b) => (b[1].createdAt || '').localeCompare(a[1].createdAt || ''));
    list.innerHTML = entries.map(([id, coll]) => {
      const cc = Object.keys(coll.cards).length;
      const alreadyIn = cardId ? !!coll.cards[cardId] : false;
      return `<div class="coll-picker-item${alreadyIn ? ' in-collection' : ''}" ${alreadyIn ? '' : `onclick="pickCollection('${id}')"`}>
        <span class="cpi-name">${escapeHtml(coll.name)}</span>
        <span class="cpi-count">${cc} cartas</span>
        <span class="cpi-check">✓ incluida</span>
      </div>`;
    }).join('');
  }
  document.getElementById('coll-picker-overlay').classList.add('open');
}

function pickCollection(collId) {
  closeCollectionPicker();
  if (collPickerCallback) { collPickerCallback(collId); collPickerCallback = null; }
}

function closeCollectionPicker() {
  document.getElementById('coll-picker-overlay').classList.remove('open');
}

document.getElementById('coll-picker-close').addEventListener('click', closeCollectionPicker);
document.getElementById('coll-picker-overlay').addEventListener('click', e => {
  if (e.target.id === 'coll-picker-overlay') closeCollectionPicker();
});
document.getElementById('coll-picker-new').addEventListener('click', () => {
  const savedCallback = collPickerCallback;
  collPickerCallback = null;
  closeCollectionPicker();
  openNewCollectionModal((newId) => {
    if (savedCallback) { savedCallback(newId); }
  });
});

// ════════════════════════════════════════════════
//  COLLECTIONS — NAME MODAL
// ════════════════════════════════════════════════
let _afterCreateColl = null;
function openNewCollectionModal(afterCreate) {
  _afterCreateColl = afterCreate || null;
  document.getElementById('coll-name-input').value = '';
  document.getElementById('coll-name-overlay').classList.add('open');
  setTimeout(() => document.getElementById('coll-name-input').focus(), 50);
}
function confirmNewCollection() {
  const name = document.getElementById('coll-name-input').value.trim();
  if (!name) { toast('⚠️ Escribe un nombre'); return; }
  const id = createCollection(name);
  closeNewCollectionModal();
  toast('📁 Colección creada: ' + name);
  if (_afterCreateColl) { _afterCreateColl(id); _afterCreateColl = null; }
  if (currentView === 'collections' && !currentCollectionId) renderCollectionsList();
}
function closeNewCollectionModal() {
  document.getElementById('coll-name-overlay').classList.remove('open');
}
document.getElementById('coll-name-confirm').addEventListener('click', confirmNewCollection);
document.getElementById('coll-name-cancel').addEventListener('click', closeNewCollectionModal);
document.getElementById('coll-name-overlay').addEventListener('click', e => {
  if (e.target.id === 'coll-name-overlay') closeNewCollectionModal();
});
document.getElementById('coll-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmNewCollection();
});

// ════════════════════════════════════════════════
//  COLLECTIONS — COMMENT MODAL
// ════════════════════════════════════════════════
function openCommentModal(collId, cardId) {
  commentEditCollId = collId; commentEditCardId = cardId;
  const coll = collections[collId];
  const card = cardIndex[cardId];
  document.getElementById('coll-comment-card-name').textContent = card?.name || cardId;
  document.getElementById('coll-comment-input').value = coll?.cards[cardId]?.comment || '';
  document.getElementById('coll-comment-overlay').classList.add('open');
  setTimeout(() => document.getElementById('coll-comment-input').focus(), 50);
}
function saveComment() {
  setCardComment(commentEditCollId, commentEditCardId, document.getElementById('coll-comment-input').value);
  closeCommentModal();
  renderCollectionDetail();
  toast('💬 Comentario guardado');
}
function closeCommentModal() {
  document.getElementById('coll-comment-overlay').classList.remove('open');
  commentEditCollId = null; commentEditCardId = null;
}
document.getElementById('coll-comment-save').addEventListener('click', saveComment);
document.getElementById('coll-comment-cancel').addEventListener('click', closeCommentModal);
document.getElementById('coll-comment-overlay').addEventListener('click', e => {
  if (e.target.id === 'coll-comment-overlay') closeCommentModal();
});

// Collections list: new collection & back buttons
document.getElementById('btn-new-collection').addEventListener('click', () => openNewCollectionModal());
document.getElementById('btn-coll-back').addEventListener('click', showCollListView);

// Collection detail filter tabs
document.querySelectorAll('[data-coll-filter]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-coll-filter]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    collDetailFilter = tab.dataset.collFilter;
    renderCollectionDetail();
  });
});
