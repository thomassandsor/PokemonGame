const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Fetches the first 151 Pokemon from PokeAPI and saves to GitHub JSON
 * Also provides data structure for Dataverse import
 */
async function fetchPokemonData() {
  console.log('🔄 Fetching Pokemon data from PokeAPI...');
  
  const pokemon = [];
  const TOTAL_POKEMON = 151; // Original Pokemon only
  
  try {
    // Fetch Pokemon data in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 1; i <= TOTAL_POKEMON; i += batchSize) {
      const batch = [];
      const endIndex = Math.min(i + batchSize - 1, TOTAL_POKEMON);
      
      console.log(`📦 Fetching Pokemon ${i}-${endIndex}...`);
      
      for (let id = i; id <= endIndex; id++) {
        batch.push(fetchSinglePokemon(id));
      }
      
      const batchResults = await Promise.all(batch);
      pokemon.push(...batchResults.filter(p => p !== null));
      
      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Sort by ID to ensure consistent order
    pokemon.sort((a, b) => a.id - b.id);
    
    // Save to GitHub JSON file
    const dataDir = path.join(__dirname, '..', 'src', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const filePath = path.join(dataDir, 'pokemon.json');
    fs.writeFileSync(filePath, JSON.stringify(pokemon, null, 2));
    
    console.log(`✅ Successfully saved ${pokemon.length} Pokemon to ${filePath}`);
    console.log(`📊 File size: ${(fs.statSync(filePath).size / 1024).toFixed(1)} KB`);
    
    // Also create a TypeScript type file
    createTypeDefinitions(dataDir);
    
    return pokemon;
    
  } catch (error) {
    console.error('❌ Error fetching Pokemon data:', error.message);
    throw error;
  }
}

async function fetchSinglePokemon(id) {
  try {
    // Fetch main Pokemon data
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const pokemon = response.data;
    
    // Fetch species data to get evolution chain
    const speciesResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    const species = speciesResponse.data;
    
    // Fetch evolution chain data
    let evolutionData = null;
    if (species.evolution_chain?.url) {
      try {
        const evolutionResponse = await axios.get(species.evolution_chain.url);
        evolutionData = parseEvolutionChain(evolutionResponse.data.chain, id);
      } catch (evolutionError) {
        console.warn(`Could not fetch evolution data for Pokemon ${id}:`, evolutionError.message);
      }
    }
    
    return {
      id: pokemon.id,
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      sprites: {
        front_default: pokemon.sprites.front_default,
        front_shiny: pokemon.sprites.front_shiny,
        official_artwork: pokemon.sprites.other?.['official-artwork']?.front_default
      },
      types: pokemon.types.map(typeInfo => typeInfo.type.name),
      stats: pokemon.stats.map(stat => ({
        name: stat.stat.name,
        base_stat: stat.base_stat
      })),
      abilities: pokemon.abilities.map(ability => ability.ability.name),
      evolution: evolutionData
    };
  } catch (error) {
    console.error(`❌ Error fetching Pokemon ${id}:`, error.message);
    return null;
  }
}

/**
 * Parses evolution chain data to find evolution info for a specific Pokemon
 */
function parseEvolutionChain(chain, pokemonId) {
  const evolutionInfo = {
    evolves_from: null,
    evolves_to: [],
    can_evolve: false
  };

  // Helper function to extract Pokemon ID from URL
  function getPokemonIdFromUrl(url) {
    const matches = url.match(/\/pokemon-species\/(\d+)\//);
    return matches ? parseInt(matches[1]) : null;
  }

  // Helper function to parse evolution details
  function parseEvolutionDetails(evolutionDetails) {
    if (!evolutionDetails || evolutionDetails.length === 0) return null;
    
    const detail = evolutionDetails[0]; // Use first evolution method
    const requirement = {};
    
    if (detail.min_level) {
      requirement.level = detail.min_level;
    }
    
    if (detail.item) {
      requirement.item = detail.item.name;
    }
    
    if (detail.trigger) {
      requirement.trigger = detail.trigger.name;
    }
    
    if (detail.time_of_day) {
      requirement.time_of_day = detail.time_of_day;
    }
    
    if (detail.min_happiness) {
      requirement.min_happiness = detail.min_happiness;
    }
    
    if (detail.min_beauty) {
      requirement.min_beauty = detail.min_beauty;
    }
    
    if (detail.location) {
      requirement.location = detail.location.name;
    }
    
    if (detail.known_move) {
      requirement.known_move = detail.known_move.name;
    }
    
    return Object.keys(requirement).length > 0 ? requirement : null;
  }

  // Recursive function to traverse evolution chain
  function traverseChain(currentChain, path = []) {
    const currentId = getPokemonIdFromUrl(currentChain.species.url);
    const currentPath = [...path, currentId];
    
    // If this is our target Pokemon
    if (currentId === pokemonId) {
      // Set what it evolves from (previous in path)
      if (path.length > 0) {
        evolutionInfo.evolves_from = {
          id: path[path.length - 1],
          name: null // We'll need to look this up separately if needed
        };
      }
      
      // Set what it evolves to
      if (currentChain.evolves_to && currentChain.evolves_to.length > 0) {
        evolutionInfo.can_evolve = true;
        evolutionInfo.evolves_to = currentChain.evolves_to.map(evolution => {
          const evolvedId = getPokemonIdFromUrl(evolution.species.url);
          const requirement = parseEvolutionDetails(evolution.evolution_details);
          
          return {
            id: evolvedId,
            name: evolution.species.name,
            requirement: requirement
          };
        });
      }
      
      return true; // Found our Pokemon
    }
    
    // Continue searching in evolutions
    if (currentChain.evolves_to) {
      for (const evolution of currentChain.evolves_to) {
        if (traverseChain(evolution, currentPath)) {
          return true; // Found in a sub-chain
        }
      }
    }
    
    return false;
  }
  
  // Start traversing from the root of the evolution chain
  traverseChain(chain);
  
  return evolutionInfo;
}

function createTypeDefinitions(dataDir) {
  const typeDefinitions = `// Auto-generated Pokemon type definitions
export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    official_artwork: string | null;
  };
  types: string[];
  stats: Array<{
    name: string;
    base_stat: number;
  }>;
  abilities: string[];
  evolution: EvolutionData | null;
}

export interface EvolutionData {
  evolves_from: {
    id: number;
    name: string | null;
  } | null;
  evolves_to: Array<{
    id: number;
    name: string;
    requirement: EvolutionRequirement | null;
  }>;
  can_evolve: boolean;
}

export interface EvolutionRequirement {
  level?: number;
  item?: string;
  trigger?: string;
  time_of_day?: string;
  min_happiness?: number;
  min_beauty?: number;
  location?: string;
  known_move?: string;
}

export interface PokemonDataverseEntity {
  pokemon_pokemonid?: string;
  pokemon_number: number;
  pokemon_name: string;
  pokemon_height: number;
  pokemon_weight: number;
  pokemon_sprite_url?: string;
  pokemon_artwork_url?: string;
  pokemon_types: string; // JSON string of types array
  pokemon_stats: string; // JSON string of stats array
  pokemon_abilities: string; // JSON string of abilities array
  pokemon_evolution: string; // JSON string of evolution data
}

export type PokemonList = Pokemon[];
`;

  const typesPath = path.join(dataDir, 'pokemon.types.ts');
  fs.writeFileSync(typesPath, typeDefinitions);
  console.log(`📝 Created type definitions at ${typesPath}`);
}

// Run the script if called directly
if (require.main === module) {
  fetchPokemonData()
    .then(pokemon => {
      console.log(`🎉 Complete! Fetched ${pokemon.length} Pokemon successfully.`);
      console.log('📋 Sample Pokemon:', pokemon.slice(0, 3).map(p => `${p.id}. ${p.name}`).join(', '));
    })
    .catch(error => {
      console.error('💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fetchPokemonData };
