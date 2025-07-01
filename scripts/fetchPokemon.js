/**
 * Pokemon Data Fetcher
 * Fetches the original 151 Pokemon from PokeAPI and saves to src/data/pokemon.json
 * Can be run as: node scripts/fetchPokemon.js
 */

const fs = require('fs');
const path = require('path');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function fetchPokemon(id) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokemon ${id}: ${response.status}`);
    }
    const pokemon = await response.json();
    
    // Extract only the data we need
    return {
      id: pokemon.id,
      name: pokemon.name,
      sprites: {
        front_default: pokemon.sprites.front_default,
        front_shiny: pokemon.sprites.front_shiny,
        official_artwork: pokemon.sprites.other?.['official-artwork']?.front_default
      },
      types: pokemon.types.map(type => ({
        slot: type.slot,
        type: {
          name: type.type.name
        }
      })),
      height: pokemon.height,
      weight: pokemon.weight,
      base_experience: pokemon.base_experience,
      stats: pokemon.stats.map(stat => ({
        base_stat: stat.base_stat,
        stat: {
          name: stat.stat.name
        }
      }))
    };
  } catch (error) {
    console.error(`Error fetching Pokemon ${id}:`, error.message);
    return null;
  }
}

async function fetchAllPokemon() {
  console.log('Fetching original 151 Pokemon from PokeAPI...');
  const pokemon = [];
  
  for (let i = 1; i <= 151; i++) {
    console.log(`Fetching Pokemon ${i}/151...`);
    const pokemonData = await fetchPokemon(i);
    if (pokemonData) {
      pokemon.push(pokemonData);
    }
    
    // Small delay to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Sort by ID to ensure consistent ordering
  pokemon.sort((a, b) => a.id - b.id);
  
  // Save to JSON file
  const outputPath = path.join(dataDir, 'pokemon.json');
  fs.writeFileSync(outputPath, JSON.stringify(pokemon, null, 2));
  
  console.log(`✅ Successfully fetched ${pokemon.length} Pokemon and saved to ${outputPath}`);
  return pokemon;
}

// Run if called directly
if (require.main === module) {
  fetchAllPokemon().catch(console.error);
}

module.exports = { fetchAllPokemon, fetchPokemon };
