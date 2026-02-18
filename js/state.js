// ════════════════════════════════════════════════
//  CONSTANTS & STORAGE KEYS
// ════════════════════════════════════════════════
const TCG_KEY        = 'pokédex-tcg-collection-v1';
const DEX_KEY        = 'pokédex-living-dex-v1';
const POKEMON_CACHE  = 'pokédex-pokemon-list-v1';
const COLL_KEY       = 'pokédex-collections-v1';
const WISHLIST_COLL_ID = 'wishlist';
const CACHE_TTL      = 30 * 24 * 60 * 60 * 1000; // 30 days

// ════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════
let DB         = null;  // cards.json
let collection = {};    // TCG collection { cardId: true }
let dexStatus  = {};    // Living Dex { pokemonId: true }
let pokemonList = [];   // [{ id, name, sprite, types, gen }]
let currentView = 'tcg';
let cardIndex  = {};    // { cardId: cardObj } built once in initTCG()

// TCG filters
let currentFilter = 'all';
let currentSearch = '';
let currentSeries = '';
let hidePocket = false;
let openSets = new Set();
let modalCardId = null;

// Dex filters
let dexFilter = 'all';
let dexGenFilter = '';
let dexSearch = '';
let currentDexPokemonId = null;

// Collections
let collections = {};
let currentCollectionId = null;
let collDetailFilter = 'all';
let collDetailSearch = '';
let collPickerCallback = null;
let commentEditCollId = null;
let commentEditCardId = null;

// ════════════════════════════════════════════════
//  LOCALSTORAGE HELPERS
// ════════════════════════════════════════════════
function loadStorage() {
  try { collection  = JSON.parse(localStorage.getItem(TCG_KEY))  || {}; } catch { collection  = {}; }
  try { dexStatus   = JSON.parse(localStorage.getItem(DEX_KEY))  || {}; } catch { dexStatus   = {}; }
  try { collections = JSON.parse(localStorage.getItem(COLL_KEY)) || {}; } catch { collections = {}; }
}
function saveTCG()         { localStorage.setItem(TCG_KEY,  JSON.stringify(collection)); }
function saveDex()         { localStorage.setItem(DEX_KEY,  JSON.stringify(dexStatus)); }
function saveCollections() { localStorage.setItem(COLL_KEY, JSON.stringify(collections)); }

function hasCard(id)       { return collection[id] === true; }
function isDexed(id)       { return dexStatus[id] === true; }
function isInWishlist(id)  { return !!(collections[WISHLIST_COLL_ID]?.cards[id]); }

function initCollections() {
  if (!collections[WISHLIST_COLL_ID]) {
    collections[WISHLIST_COLL_ID] = { name: '⭐ Wishlist', createdAt: new Date().toISOString(), cards: {} };
    saveCollections();
  }
}

// ════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════
let toastTimeout;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('show'), 2200);
}
