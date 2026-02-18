// scripts/fetch-cards.js
// Fetches all Pokémon TCG cards from TCGdex API and saves them to cards.json
// API: https://tcgdex.dev — Free, no API key required, open source
//
// Run: node scripts/fetch-cards.js
// Language: English (change LANG to 'es', 'fr', 'de', 'it', 'pt-br', 'ja', etc.)

const { writeFileSync } = require('fs');

const LANG = 'en';
const API_BASE = `https://api.tcgdex.net/v2/${LANG}`;
const IMG_BASE = 'https://assets.tcgdex.net/en';
const DELAY_MS = 80; // polite delay between requests

const delay = ms => new Promise(r => setTimeout(r, ms));

async function get(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'pokemon-tcg-tracker/1.0' }
  });
  if (!res.ok) throw new Error(`TCGdex API error ${res.status} for ${url}`);
  return res.json();
}

async function fetchAllSeries() {
  const series = await get('/series');
  return series; // array of { id, name }
}

async function fetchAllSets() {
  console.log('🔍 Fetching all sets...');
  const sets = await get('/sets');
  // sets is an array of brief set objects { id, name, cardCount, releaseDate, ... }
  const setsMap = {};

  for (let i = 0; i < sets.length; i++) {
    const brief = sets[i];
    process.stdout.write(`\r  ⏳ Loading set ${i + 1}/${sets.length}: ${brief.name}          `);
    try {
      // Fetch full set detail to get logo, symbol, serie
      const full = await get(`/sets/${brief.id}`);
      setsMap[brief.id] = {
        id: full.id,
        name: full.name,
        series: full.serie?.name || null,
        releaseDate: full.releaseDate || null,
        total: full.cardCount?.total || full.cardCount?.official || 0,
        logoUrl: full.logo ? `${full.logo}.png` : null,
        symbolUrl: full.symbol ? `${full.symbol}.png` : null,
      };
    } catch (err) {
      console.warn(`\n  ⚠️  Could not load set ${brief.id}: ${err.message}`);
      setsMap[brief.id] = {
        id: brief.id,
        name: brief.name,
        series: null,
        releaseDate: brief.releaseDate || null,
        total: 0,
        logoUrl: null,
        symbolUrl: null,
      };
    }
    await delay(DELAY_MS);
  }
  console.log(`\n✅ Loaded ${Object.keys(setsMap).length} sets`);
  return setsMap;
}

async function fetchCardsForSet(setId) {
  try {
    const set = await get(`/sets/${setId}`);
    if (!set.cards || set.cards.length === 0) return [];

    // set.cards is an array of brief card objects { id, localId, name, image }
    return set.cards.map(card => ({
      id: card.id,
      localId: card.localId,
      name: card.name,
      setId,
      // TCGdex image URLs are the image field + quality suffix
      imageSmall: card.image ? `${card.image}/low.webp` : null,
      imageLarge: card.image ? `${card.image}/high.webp` : null,
      rarity: card.rarity || null,
      category: card.category || null,
    }));
  } catch {
    return [];
  }
}

async function main() {
  console.log('🚀 Starting TCGdex card database fetch...');
  console.log(`🌐 Language: ${LANG} | API: ${API_BASE}\n`);

  // Step 1: Fetch all sets
  const sets = await fetchAllSets();
  const setIds = Object.keys(sets);

  // Step 2: Fetch cards set by set (more reliable than global /cards endpoint)
  console.log(`\n🃏 Fetching cards for ${setIds.length} sets...`);
  let allCards = [];

  for (let i = 0; i < setIds.length; i++) {
    const setId = setIds[i];
    const setName = sets[setId].name;
    process.stdout.write(`\r  ⏳ Set ${i + 1}/${setIds.length}: ${setName}                    `);

    const cards = await fetchCardsForSet(setId);
    allCards = allCards.concat(cards);
    await delay(DELAY_MS);
  }
  console.log(`\n✅ Total cards fetched: ${allCards.length}\n`);

  // Step 3: Sort — newest sets first, then by localId numerically
  allCards.sort((a, b) => {
    const setA = sets[a.setId];
    const setB = sets[b.setId];
    const dateA = setA?.releaseDate || '0000-00-00';
    const dateB = setB?.releaseDate || '0000-00-00';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    // Numeric sort on localId (e.g. "1", "10", "2" → 1, 2, 10)
    return String(a.localId).localeCompare(String(b.localId), undefined, { numeric: true });
  });

  // Step 4: Write output
  const output = {
    updatedAt: new Date().toISOString(),
    source: 'TCGdex (https://tcgdex.dev)',
    language: LANG,
    totalCards: allCards.length,
    totalSets: setIds.length,
    sets,
    cards: allCards,
  };

  writeFileSync('cards.json', JSON.stringify(output, null, 2));

  console.log(`✅ cards.json written successfully`);
  console.log(`   📦 ${allCards.length} cards`);
  console.log(`   🗂  ${setIds.length} sets`);
  console.log(`   📅 Updated: ${output.updatedAt}`);
  console.log(`\n💡 Tip: Change LANG at the top of the script to fetch in another language.`);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
