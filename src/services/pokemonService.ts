import { Pokemon } from '../types/pokemon';
import pokemonData from '../data/pokemon.json';

class PokemonService {
  private pokemon: Pokemon[] = [];

  constructor() {
    // Load Pokemon data from JSON file
    this.pokemon = pokemonData as Pokemon[];
  }

  // Get all Pokemon (static data from GitHub)
  getAllPokemon(): Pokemon[] {
    return this.pokemon;
  }

  // Get Pokemon by ID
  getPokemonById(id: number): Pokemon | null {
    return this.pokemon.find(p => p.id === id) || null;
  }

  // Get Pokemon by name
  getPokemonByName(name: string): Pokemon | null {
    return this.pokemon.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
  }

  // Get Pokemon by type
  getPokemonByType(typeName: string): Pokemon[] {
    return this.pokemon.filter(p => 
      p.types.some(type => type.toLowerCase() === typeName.toLowerCase())
    );
  }

  // Search Pokemon by name (partial match)
  searchPokemon(query: string): Pokemon[] {
    const lowerQuery = query.toLowerCase();
    return this.pokemon.filter(p => 
      p.name.toLowerCase().includes(lowerQuery)
    );
  }

  // Get random Pokemon
  getRandomPokemon(): Pokemon {
    const randomIndex = Math.floor(Math.random() * this.pokemon.length);
    return this.pokemon[randomIndex];
  }

  // Get Pokemon types
  getAllTypes(): string[] {
    const types = new Set<string>();
    this.pokemon.forEach(p => {
      p.types.forEach(type => types.add(type));
    });
    return Array.from(types).sort();
  }

  // Validate Pokemon ID
  isValidPokemonId(id: number): boolean {
    return id >= 1 && id <= 151 && this.pokemon.some(p => p.id === id);
  }

  // Admin function: Refresh Pokemon data from PokeAPI
  async refreshPokemonData(): Promise<boolean> {
    try {
      const { fetchAllPokemon } = await import('../../scripts/fetchPokemon.js');
      const newPokemonData = await fetchAllPokemon();
      
      if (newPokemonData && newPokemonData.length > 0) {
        this.pokemon = newPokemonData as unknown as Pokemon[];
        console.log(`✅ Pokemon data refreshed: ${this.pokemon.length} Pokemon loaded`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh Pokemon data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pokemonService = new PokemonService();

// Export helper functions
export const getAllPokemon = () => pokemonService.getAllPokemon();
export const getPokemonById = (id: number) => pokemonService.getPokemonById(id);
export const getPokemonByName = (name: string) => pokemonService.getPokemonByName(name);
export const searchPokemon = (query: string) => pokemonService.searchPokemon(query);
export const getRandomPokemon = () => pokemonService.getRandomPokemon();
export const getAllTypes = () => pokemonService.getAllTypes();
