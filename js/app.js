// ════════════════════════════════════════════════
//  VIEW SWITCHING
// ════════════════════════════════════════════════
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentView = tab.dataset.view;

    document.getElementById('view-tcg').style.display         = currentView === 'tcg'         ? 'block' : 'none';
    document.getElementById('view-dex').style.display         = currentView === 'dex'         ? 'block' : 'none';
    document.getElementById('view-collections').style.display = currentView === 'collections' ? 'block' : 'none';

    const si = document.getElementById('search-input');
    if (currentView === 'tcg') {
      si.placeholder = 'Buscar carta o set...';
    } else if (currentView === 'collections') {
      si.placeholder = 'Buscar en colecciones...';
      if (currentCollectionId) renderCollectionDetail();
      else renderCollectionsList();
    } else {
      si.placeholder = 'Buscar Pokémon...';
      if (pokemonList.length > 0) renderDex();
      else initDex();
    }
  });
});

// ════════════════════════════════════════════════
//  SHARED SEARCH
// ════════════════════════════════════════════════
let searchTimeout;
document.getElementById('search-input').addEventListener('input', e => {
  const val = e.target.value;
  document.getElementById('search-clear').style.display = val ? 'block' : 'none';
  clearTimeout(searchTimeout);
  if (currentView === 'tcg') { currentSearch = val; searchTimeout = setTimeout(render, 200); }
  else if (currentView === 'collections') { collDetailSearch = val; if (currentCollectionId) searchTimeout = setTimeout(renderCollectionDetail, 200); }
  else { dexSearch = val.toLowerCase().trim(); searchTimeout = setTimeout(renderDex, 150); }
});
document.getElementById('search-clear').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').style.display = 'none';
  if (currentView === 'tcg') { currentSearch = ''; render(); }
  else if (currentView === 'collections') { collDetailSearch = ''; if (currentCollectionId) renderCollectionDetail(); }
  else { dexSearch = ''; renderDex(); }
});

// ════════════════════════════════════════════════
//  BOOT
// ════════════════════════════════════════════════
document.getElementById('view-dex').style.display = 'none';
loadStorage();
initCollections();
loadDatabase();
