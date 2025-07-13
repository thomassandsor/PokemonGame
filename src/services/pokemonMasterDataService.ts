import { Pokemon } from '../types/pokemon';

class PokemonMasterDataService {
  private readonly POKEMON_API_BASE = 'https://pokeapi.co/api/v2';
  private readonly GITHUB_JSON_URL = 'https://raw.githubusercontent.com/Purukitto/pokemon-data.json/master/pokemon.json';
  
  private pokemonCache: Pokemon[] = [];
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

  /**
   * Get all Pokemon from local JSON file (first 151 Pokemon)
   */
  async getAllPokemon(): Promise<Pokemon[]> {
    // Check cache first
    if (this.pokemonCache.length > 0 && Date.now() < this.cacheExpiry) {
      return this.pokemonCache;
    }

    try {
      console.log('Fetching Pokemon data from local file...');
      const pokemonModule = await import('../data/pokemon.json');
      const pokemonData = pokemonModule.default;
      
      // The local JSON already has the correct PokeAPI format
      // We just need to transform it to match our Pokemon interface
      this.pokemonCache = pokemonData.map((pokemon: any) => ({
        id: pokemon.id,
        name: pokemon.name,
        height: pokemon.height,
        weight: pokemon.weight,
        base_experience: pokemon.base_experience || 0,
        order: pokemon.id,
        is_default: true,
        location_area_encounters: '',
        sprites: {
          front_default: pokemon.sprites.front_default,
          front_shiny: pokemon.sprites.front_shiny,
          back_default: pokemon.sprites.back_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokemon.id}.png`,
          back_shiny: pokemon.sprites.back_shiny || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/shiny/${pokemon.id}.png`,
          other: {
            'official-artwork': {
              front_default: pokemon.sprites.official_artwork || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`
            }
          }
        },
        stats: pokemon.stats.map((stat: any, index: number) => ({
          base_stat: stat.base_stat,
          effort: 0,
          stat: { name: stat.name, url: '' }
        })),
        types: pokemon.types.map((type: string, index: number) => ({
          slot: index + 1,
          type: { name: type.toLowerCase(), url: '' }
        })),
        abilities: pokemon.abilities?.map((ability: string, index: number) => ({
          slot: index + 1,
          is_hidden: false,
          ability: { name: ability, url: '' }
        })) || [],
        species: { name: pokemon.name, url: '' },
        forms: [{ name: pokemon.name, url: '' }],
        game_indices: [],
        held_items: [],
        moves: [],
        past_types: []
      }));

      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      console.log(`Loaded ${this.pokemonCache.length} Pokemon from local file`);
      return this.pokemonCache;
      
    } catch (error) {
      console.error('Error loading Pokemon data from local file:', error);
      
      // Fallback to a smaller dataset from PokeAPI
      return this.getFallbackPokemon();
    }
  }

  /**
   * Get a specific Pokemon by ID
   */
  async getPokemonById(id: number): Promise<Pokemon | null> {
    const allPokemon = await this.getAllPokemon();
    return allPokemon.find(p => p.id === id) || null;
  }

  /**
   * Get Pokemon by name
   */
  async getPokemonByName(name: string): Promise<Pokemon | null> {
    const allPokemon = await this.getAllPokemon();
    return allPokemon.find(p => 
      p.name.toLowerCase() === name.toLowerCase()
    ) || null;
  }

  /**
   * Search Pokemon by name or ID
   */
  async searchPokemon(query: string): Promise<Pokemon[]> {
    const allPokemon = await this.getAllPokemon();
    const searchTerm = query.toLowerCase();
    
    return allPokemon.filter(pokemon => 
      pokemon.name.toLowerCase().includes(searchTerm) ||
      pokemon.id.toString() === query
    );
  }

  /**
   * Get Pokemon by type
   */
  async getPokemonByType(typeName: string): Promise<Pokemon[]> {
    const allPokemon = await this.getAllPokemon();
    return allPokemon.filter(pokemon =>
      pokemon.types.some(typeInfo => 
        typeInfo.type.name.toLowerCase() === typeName.toLowerCase()
      )
    );
  }

  /**
   * Get all unique Pokemon types
   */
  async getAllTypes(): Promise<string[]> {
    const allPokemon = await this.getAllPokemon();
    const types = new Set<string>();
    
    allPokemon.forEach(pokemon => {
      pokemon.types.forEach(typeInfo => {
        types.add(typeInfo.type.name);
      });
    });
    
    return Array.from(types).sort();
  }

  /**
   * Fallback method to get a smaller dataset from PokeAPI
   */
  private async getFallbackPokemon(): Promise<Pokemon[]> {
    try {
      console.log('Using fallback PokeAPI method...');
      const fallbackPokemon: Pokemon[] = [];
      
      // Get first 151 Pokemon (Kanto region)
      for (let i = 1; i <= 151; i++) {
        try {
          const response = await fetch(`${this.POKEMON_API_BASE}/pokemon/${i}`);
          if (response.ok) {
            const pokemon = await response.json();
            fallbackPokemon.push(pokemon);
          }
        } catch (error) {
          console.warn(`Failed to fetch Pokemon ${i}:`, error);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      this.pokemonCache = fallbackPokemon;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      return fallbackPokemon;
      
    } catch (error) {
      console.error('Fallback method also failed:', error);
      return [];
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.pokemonCache = [];
    this.cacheExpiry = 0;
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { cached: number; expires: Date | null } {
    return {
      cached: this.pokemonCache.length,
      expires: this.cacheExpiry > 0 ? new Date(this.cacheExpiry) : null
    };
  }
}

export const pokemonMasterDataService = new PokemonMasterDataService();
