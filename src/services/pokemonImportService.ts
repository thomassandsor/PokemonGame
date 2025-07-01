import axios from 'axios';
import pokemonDataRaw from '../data/pokemon.json';
import type { Pokemon } from '../types/pokemon';
import type { PokemonDataverseEntity } from '../data/pokemon.types';

// Cast the imported JSON to proper type
const pokemonData = pokemonDataRaw as Pokemon[];

/**
 * Service for importing Pokemon data to Dataverse
 * Can be used both as admin function in app and as standalone script
 */
class PokemonImportService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/dataverse-proxy'
      : 'http://localhost:7071/api/dataverse-proxy';
  }

  private async makeRequest(method: string, path: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}?path=${encodeURIComponent(path)}`;
    
    const config: any = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  }

  /**
   * Checks if a Pokemon already exists in Dataverse by number
   */
  async pokemonExists(pokemonNumber: number): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', 
        `/pokemon_pokemons?$filter=pokemon_id eq ${pokemonNumber}&$top=1`
      );
      return response.value && response.value.length > 0;
    } catch (error) {
      console.error(`Error checking if Pokemon ${pokemonNumber} exists:`, error);
      return false;
    }
  }

  /**
   * Converts GitHub Pokemon data to Dataverse entity format
   */
  private convertToDataverseEntity(pokemon: Pokemon): Omit<PokemonDataverseEntity, 'pokemon_pokemonid'> {
    return {
      pokemon_id: pokemon.id,
      pokemon_name: pokemon.name
      // Only include the essential fields for now
      // pokemon_height: pokemon.height,
      // pokemon_weight: pokemon.weight,
      // pokemon_sprite_url: pokemon.sprites.front_default || '',
      // pokemon_artwork_url: pokemon.sprites.official_artwork || '',
      // pokemon_types: JSON.stringify(pokemon.types),
      // pokemon_stats: JSON.stringify(pokemon.stats),
      // pokemon_abilities: JSON.stringify(pokemon.abilities),
      // pokemon_evolution: JSON.stringify(pokemon.evolution)
    };
  }

  /**
   * Imports a single Pokemon to Dataverse
   */
  async importSinglePokemon(pokemon: Pokemon): Promise<boolean> {
    try {
      // Check if already exists
      const exists = await this.pokemonExists(pokemon.id);
      if (exists) {
        console.log(`⏭️  Pokemon ${pokemon.id} (${pokemon.name}) already exists, skipping`);
        return false;
      }

      // Convert to Dataverse format
      const dataverseEntity = this.convertToDataverseEntity(pokemon);

      // Import to Dataverse
      await this.makeRequest('POST', '/pokemon_pokemons', dataverseEntity);
      console.log(`✅ Imported Pokemon ${pokemon.id}: ${pokemon.name}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to import Pokemon ${pokemon.id} (${pokemon.name}):`, error);
      return false;
    }
  }

  /**
   * Imports all Pokemon from GitHub data to Dataverse
   * Returns count of newly imported Pokemon
   */
  async importAllPokemon(onProgress?: (current: number, total: number, name: string) => void): Promise<number> {
    console.log('🚀 Starting Pokemon import to Dataverse...');
    
    const totalPokemon = pokemonData.length;
    let importedCount = 0;
    let skippedCount = 0;

    try {
      for (let i = 0; i < totalPokemon; i++) {
        const pokemon = pokemonData[i] as Pokemon;
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(i + 1, totalPokemon, pokemon.name);
        }

        const wasImported = await this.importSinglePokemon(pokemon);
        if (wasImported) {
          importedCount++;
        } else {
          skippedCount++;
        }

        // Small delay to avoid overwhelming Dataverse
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`🎉 Import complete!`);
      console.log(`📈 Imported: ${importedCount} new Pokemon`);
      console.log(`⏭️  Skipped: ${skippedCount} existing Pokemon`);
      console.log(`📊 Total: ${totalPokemon} Pokemon processed`);

      return importedCount;

    } catch (error) {
      console.error('💥 Import failed:', error);
      throw error;
    }
  }

  /**
   * Gets count of Pokemon currently in Dataverse
   */
  async getPokemonCount(): Promise<number> {
    try {
      const response = await this.makeRequest('GET', '/pokemon_pokemons?$count=true&$top=1');
      return response['@odata.count'] || 0;
    } catch (error) {
      console.error('Error getting Pokemon count:', error);
      return 0;
    }
  }

  /**
   * Validates that all expected Pokemon are in Dataverse
   */
  async validateImport(): Promise<{ isComplete: boolean; missing: number[]; total: number }> {
    console.log('🔍 Validating Pokemon import...');
    
    const expectedPokemon = pokemonData.map((p: Pokemon) => p.id);
    const missing: number[] = [];

    try {
      for (const pokemonId of expectedPokemon) {
        const exists = await this.pokemonExists(pokemonId);
        if (!exists) {
          missing.push(pokemonId);
        }
      }

      const isComplete = missing.length === 0;
      
      if (isComplete) {
        console.log('✅ All Pokemon successfully imported to Dataverse');
      } else {
        console.log(`⚠️  Missing ${missing.length} Pokemon:`, missing);
      }

      return {
        isComplete,
        missing,
        total: expectedPokemon.length
      };

    } catch (error) {
      console.error('Error validating import:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pokemonImportService = new PokemonImportService();

// Export functions for easier use
export const importAllPokemon = (onProgress?: (current: number, total: number, name: string) => void) => 
  pokemonImportService.importAllPokemon(onProgress);

export const validatePokemonImport = () => 
  pokemonImportService.validateImport();

export const getPokemonCount = () => 
  pokemonImportService.getPokemonCount();
