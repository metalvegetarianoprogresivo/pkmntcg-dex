// scripts/fetch-cards.js
// Fetches all Pokémon TCG cards and saves them to cards.json
// Run: node scripts/fetch-cards.js
// Requires: POKEMONTCG_API_KEY env var (optional but increases rate limits)

import fetch from 'node-fetch';
import { writeFileSync } from 'fs';

const API_BASE = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMONTCG_API_KEY || '';
const PAGE_SIZE = 250;

const headers = {
  'Content-Type': 'application/json',
  ...(API_KEY && { 'X-Api-Key': API_KEY }),
};

async function fetchPage(page) {
  const url = `${API_BASE}/cards?page=${page}&pageSize=${PAGE_SIZE}&select=id,name,supertype,subtypes,set,number,rarity,images,nationalPokedexNumbers`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchAllSets() {
  const res = await fetch(`${API_BASE}/sets?select=id,name,series,releaseDate,images,total`, { headers });
  if (!res.ok) throw new Error(`Sets API error: ${res.status}`);
  const data = await res.json();
  // Index by set id for fast lookup
  return Object.fromEntries(data.data.map(s => [s.id, s]));
}

async function main() {
  console.log('🔍 Fetching sets...');
  const sets = await fetchAllSets();
  console.log(`✅ Found ${Object.keys(sets).length} sets`);

  console.log('🃏 Fetching cards (this may take a few minutes)...');

  // First call to get total count
  const firstPage = await fetchPage(1);
  const totalCards = firstPage.totalCount;
  const totalPages = Math.ceil(totalCards / PAGE_SIZE);
  console.log(`📦 Total cards: ${totalCards} across ${totalPages} pages`);

  let allCards = [...firstPage.data];

  // Fetch remaining pages with a small delay to be polite
  for (let page = 2; page <= totalPages; page++) {
    process.stdout.write(`\r⏳ Fetching page ${page}/${totalPages}...`);
    await new Promise(r => setTimeout(r, 100)); // 100ms delay
    const data = await fetchPage(page);
    allCards = allCards.concat(data.data);
  }
  console.log('\n');

  // Normalize cards to only what we need
  const normalizedCards = allCards.map(card => ({
    id: card.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity || null,
    supertype: card.supertype,
    subtypes: card.subtypes || [],
    nationalPokedexNumbers: card.nationalPokedexNumbers || [],
    setId: card.set?.id,
    imageSmall: card.images?.small,
    imageLarge: card.images?.large,
  }));

  // Sort: by set release date desc, then by card number
  normalizedCards.sort((a, b) => {
    const setA = sets[a.setId];
    const setB = sets[b.setId];
    const dateA = setA?.releaseDate || '0000-00-00';
    const dateB = setB?.releaseDate || '0000-00-00';
    if (dateA !== dateB) return dateB.localeCompare(dateA); // newest first
    return a.number?.localeCompare(b.number, undefined, { numeric: true }) || 0;
  });

  const output = {
    updatedAt: new Date().toISOString(),
    totalCards: normalizedCards.length,
    totalSets: Object.keys(sets).length,
    sets,
    cards: normalizedCards,
  };

  writeFileSync('cards.json', JSON.stringify(output, null, 2));
  console.log(`✅ Saved ${normalizedCards.length} cards and ${Object.keys(sets).length} sets to cards.json`);
  console.log(`📅 Updated at: ${output.updatedAt}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
