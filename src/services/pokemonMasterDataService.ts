import { PokemonDataverseEntity } from '../data/pokemon.types';
import pokemonData from '../data/pokemon.json';
import { Pokemon } from '../types/pokemon';

class PokemonMasterDataService {
  private readonly API_BASE = process.env.REACT_APP_AZURE_FUNCTION_URL || 'http://localhost:7071/api';

  /**
   * Import all Pokemon from JSON file to Dataverse pokemon_pokemon table
   */
  async importAllPokemonToDataverse(): Promise<{
    success: boolean;
    imported: number;
    updated: number;
    errors: string[];
  }> {
    console.log('🔄 Starting Pokemon master data import to Dataverse...');
    
    const results = {
      success: true,
      imported: 0,
      updated: 0,
      errors: [] as string[]
    };

    try {
      const allPokemon = pokemonData as Pokemon[];
      console.log(`📋 Found ${allPokemon.length} Pokemon to import`);

      // Process in batches to avoid overwhelming Dataverse
      const batchSize = 10;
      for (let i = 0; i < allPokemon.length; i += batchSize) {
        const batch = allPokemon.slice(i, i + batchSize);
        console.log(`📦 Processing Pokemon ${i + 1}-${Math.min(i + batchSize, allPokemon.length)}...`);

        const batchPromises = batch.map(pokemon => this.importSinglePokemon(pokemon));
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.isNew) {
              results.imported++;
            } else {
              results.updated++;
            }
          } else {
            results.errors.push(`Pokemon ${batch[index].name}: ${result.reason}`);
            console.error(`❌ Failed to import ${batch[index].name}:`, result.reason);
          }
        });

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`✅ Import complete! Imported: ${results.imported}, Updated: ${results.updated}, Errors: ${results.errors.length}`);
      
      if (results.errors.length > 0) {
        console.warn('⚠️ Some Pokemon failed to import:', results.errors);
        results.success = false;
      }

      return results;

    } catch (error) {
      console.error('💥 Critical error during import:', error);
      results.success = false;
      results.errors.push(`Critical error: ${error}`);
      return results;
    }
  }

  /**
   * Import a single Pokemon to Dataverse
   */
  private async importSinglePokemon(pokemon: Pokemon): Promise<{ isNew: boolean }> {
    try {
      // Check if Pokemon already exists
      const existingPokemon = await this.findPokemonByNumber(pokemon.id);
      
      const pokemonEntity: Omit<PokemonDataverseEntity, 'pokemon_pokemonid' | 'createdon'> = {
        pokemon_id: pokemon.id,
        pokemon_name: pokemon.name,
        pokemon_height: pokemon.height,
        pokemon_weight: pokemon.weight,
        pokemon_sprite_url: pokemon.sprites.front_default || undefined,
        pokemon_artwork_url: pokemon.sprites.official_artwork || undefined,
        pokemon_types: JSON.stringify(pokemon.types),
        pokemon_stats: JSON.stringify(pokemon.stats),
        pokemon_abilities: JSON.stringify(pokemon.abilities),
        pokemon_evolution: JSON.stringify(pokemon.evolution)
      };

      if (existingPokemon) {
        // Update existing Pokemon
        await this.updatePokemon(existingPokemon.pokemon_pokemonid!, pokemonEntity);
        return { isNew: false };
      } else {
        // Create new Pokemon
        await this.createPokemon(pokemonEntity);
        return { isNew: true };
      }

    } catch (error) {
      throw new Error(`Failed to import Pokemon ${pokemon.name}: ${error}`);
    }
  }

  /**
   * Find Pokemon by number in Dataverse
   */
  private async findPokemonByNumber(pokemonNumber: number): Promise<PokemonDataverseEntity | null> {
    try {
      const response = await fetch(
        `${this.API_BASE}/dataverse/pokemon_pokemons?$filter=pokemon_id eq ${pokemonNumber}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value && data.value.length > 0 ? data.value[0] : null;

    } catch (error) {
      console.error(`Error finding Pokemon #${pokemonNumber}:`, error);
      return null;
    }
  }

  /**
   * Create new Pokemon in Dataverse
   */
  private async createPokemon(pokemonData: Omit<PokemonDataverseEntity, 'pokemon_pokemonid' | 'createdon'>): Promise<PokemonDataverseEntity> {
    try {
      const response = await fetch(`${this.API_BASE}/dataverse/pokemon_pokemons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pokemonData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      return await response.json();

    } catch (error) {
      throw new Error(`Failed to create Pokemon: ${error}`);
    }
  }

  /**
   * Update existing Pokemon in Dataverse
   */
  private async updatePokemon(pokemonId: string, pokemonData: Partial<PokemonDataverseEntity>): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/dataverse/pokemon_pokemons(${pokemonId})`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pokemonData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

    } catch (error) {
      throw new Error(`Failed to update Pokemon: ${error}`);
    }
  }

  /**
   * Get all Pokemon from Dataverse
   */
  async getAllPokemonFromDataverse(): Promise<PokemonDataverseEntity[]> {
    try {
      const response = await fetch(`${this.API_BASE}/dataverse/pokemon_pokemons?$orderby=pokemon_id asc`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value || [];

    } catch (error) {
      console.error('Error fetching Pokemon from Dataverse:', error);
      return [];
    }
  }

  /**
   * Validate data consistency between JSON and Dataverse
   */
  async validateDataConsistency(): Promise<{
    isConsistent: boolean;
    missingInDataverse: number[];
    extraInDataverse: number[];
    inconsistentData: Array<{ pokemonNumber: number; differences: string[] }>;
  }> {
    console.log('🔍 Validating data consistency between JSON and Dataverse...');

    const jsonPokemon = pokemonData as Pokemon[];
    const dataversePokemon = await this.getAllPokemonFromDataverse();

    const jsonNumbers = new Set(jsonPokemon.map(p => p.id));
    const dataverseNumbers = new Set(dataversePokemon.map(p => p.pokemon_id));

    const missingInDataverse = jsonPokemon
      .filter(p => !dataverseNumbers.has(p.id))
      .map(p => p.id);

    const extraInDataverse = dataversePokemon
      .filter(p => !jsonNumbers.has(p.pokemon_id))
      .map(p => p.pokemon_id);

    const inconsistentData: Array<{ pokemonNumber: number; differences: string[] }> = [];

    // Check for data inconsistencies
    for (const jsonPokemonItem of jsonPokemon) {
      const dataversePokemonItem = dataversePokemon.find((dp: PokemonDataverseEntity) => dp.pokemon_id === jsonPokemonItem.id);
      if (dataversePokemonItem) {
        const differences = this.comparePokemonData(jsonPokemonItem, dataversePokemonItem);
        if (differences.length > 0) {
          inconsistentData.push({
            pokemonNumber: jsonPokemonItem.id,
            differences
          });
        }
      }
    }

    const isConsistent = missingInDataverse.length === 0 && 
                        extraInDataverse.length === 0 && 
                        inconsistentData.length === 0;

    console.log(`📊 Validation complete: ${isConsistent ? 'Consistent' : 'Inconsistent'}`);
    console.log(`   Missing in Dataverse: ${missingInDataverse.length}`);
    console.log(`   Extra in Dataverse: ${extraInDataverse.length}`);
    console.log(`   Inconsistent data: ${inconsistentData.length}`);

    return {
      isConsistent,
      missingInDataverse,
      extraInDataverse,
      inconsistentData
    };
  }

  /**
   * Compare Pokemon data between JSON and Dataverse
   */
  private comparePokemonData(jsonPokemon: Pokemon, dataversePokemon: PokemonDataverseEntity): string[] {
    const differences: string[] = [];

    if (jsonPokemon.name !== dataversePokemon.pokemon_name) {
      differences.push(`Name: JSON="${jsonPokemon.name}" vs Dataverse="${dataversePokemon.pokemon_name}"`);
    }

    if (jsonPokemon.height !== dataversePokemon.pokemon_height) {
      differences.push(`Height: JSON=${jsonPokemon.height} vs Dataverse=${dataversePokemon.pokemon_height}`);
    }

    if (jsonPokemon.weight !== dataversePokemon.pokemon_weight) {
      differences.push(`Weight: JSON=${jsonPokemon.weight} vs Dataverse=${dataversePokemon.pokemon_weight}`);
    }

    // Compare JSON strings
    try {
      const jsonTypes = JSON.stringify(jsonPokemon.types);
      if (jsonTypes !== dataversePokemon.pokemon_types) {
        differences.push(`Types: JSON=${jsonTypes} vs Dataverse=${dataversePokemon.pokemon_types}`);
      }
    } catch (error) {
      differences.push(`Types: Failed to compare - ${error}`);
    }

    return differences;
  }

  /**
   * Get import status and statistics
   */
  async getImportStatus(): Promise<{
    totalInJson: number;
    totalInDataverse: number;
    lastImportDate?: string;
    isUpToDate: boolean;
  }> {
    const jsonPokemon = pokemonData as Pokemon[];
    const dataversePokemon = await this.getAllPokemonFromDataverse();

    return {
      totalInJson: jsonPokemon.length,
      totalInDataverse: dataversePokemon.length,
      lastImportDate: undefined, // Could be stored in a settings table
      isUpToDate: jsonPokemon.length === dataversePokemon.length
    };
  }
}

export const pokemonMasterDataService = new PokemonMasterDataService();
