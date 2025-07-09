// Pokemon import service for Pokemon game
import { 
  PokemonMasterRecord, 
  DataverseValidator, 
  PokemonMasterSchema 
} from '../constants/dataverseSchema';
import { API_CONFIG } from '../config/api';

export interface PokemonImportData {
  id: number;
  name: string;
  types: string[];
  height: number;
  weight: number;
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  sprites: {
    front_default: string;
    front_shiny?: string;
    back_default?: string;
  };
  abilities: Array<{
    name: string;
    is_hidden: boolean;
  }>;
  moves: string[];
  evolutionChain?: any;
  flavorText?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  data?: PokemonImportData[];
}

export class PokemonImportService {
  private static readonly POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
  private static readonly DATAVERSE_API_URL = API_CONFIG.BASE_URL;

  // Import Pokemon data from PokeAPI
  static async importFromPokeAPI(pokemonIds: number[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      data: []
    };

    try {
      const importPromises = pokemonIds.map(id => this.fetchPokemonFromAPI(id));
      const pokemonData = await Promise.allSettled(importPromises);

      for (const pokemon of pokemonData) {
        if (pokemon.status === 'fulfilled' && pokemon.value) {
          result.data!.push(pokemon.value);
          result.imported++;
        } else {
          result.failed++;
          if (pokemon.status === 'rejected') {
            result.errors.push(pokemon.reason?.message || 'Unknown error');
          }
        }
      }

      result.success = result.imported > 0;
      return result;
    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  // Fetch single Pokemon from PokeAPI
  private static async fetchPokemonFromAPI(id: number): Promise<PokemonImportData> {
    try {
      const [pokemonResponse, speciesResponse] = await Promise.all([
        fetch(`${this.POKEAPI_BASE_URL}/pokemon/${id}`),
        fetch(`${this.POKEAPI_BASE_URL}/pokemon-species/${id}`)
      ]);

      if (!pokemonResponse.ok || !speciesResponse.ok) {
        throw new Error(`Failed to fetch Pokemon ${id}`);
      }

      const pokemonData = await pokemonResponse.json();
      const speciesData = await speciesResponse.json();

      return {
        id: pokemonData.id,
        name: pokemonData.name,
        types: pokemonData.types.map((t: any) => t.type.name),
        height: pokemonData.height,
        weight: pokemonData.weight,
        baseStats: {
          hp: pokemonData.stats[0].base_stat,
          attack: pokemonData.stats[1].base_stat,
          defense: pokemonData.stats[2].base_stat,
          specialAttack: pokemonData.stats[3].base_stat,
          specialDefense: pokemonData.stats[4].base_stat,
          speed: pokemonData.stats[5].base_stat,
        },
        sprites: {
          front_default: pokemonData.sprites.front_default,
          front_shiny: pokemonData.sprites.front_shiny,
          back_default: pokemonData.sprites.back_default,
        },
        abilities: pokemonData.abilities.map((a: any) => ({
          name: a.ability.name,
          is_hidden: a.is_hidden
        })),
        moves: pokemonData.moves.slice(0, 10).map((m: any) => m.move.name), // Limit to 10 moves
        flavorText: speciesData.flavor_text_entries
          ?.find((entry: any) => entry.language.name === 'en')
          ?.flavor_text?.replace(/\f/g, ' ')
      };
    } catch (error) {
      throw new Error(`Failed to import Pokemon ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Save imported Pokemon data to Dataverse
  static async saveToDataverse(pokemonData: PokemonImportData[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: []
    };

    try {
      for (const pokemon of pokemonData) {
        try {
          // Map to Dataverse schema - CURRENT FIELDS ONLY
          const dataversePokemon: Partial<PokemonMasterRecord> = {
            pokemon_id: pokemon.id,
            pokemon_name: pokemon.name
          };

          // Validate before sending
          const validation = DataverseValidator.validatePokemonMaster(dataversePokemon);
          if (!validation.valid) {
            result.failed++;
            result.errors.push(`Validation failed for ${pokemon.name}: ${validation.errors.join(', ')}`);
            continue;
          }

          const response = await fetch(`${this.DATAVERSE_API_URL}/${PokemonMasterSchema.tableName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataversePokemon)
          });

          if (response.ok) {
            result.imported++;
          } else {
            result.failed++;
            const errorText = await response.text().catch(() => response.statusText);
            result.errors.push(`Failed to save ${pokemon.name} (ID: ${pokemon.id}): ${response.status} ${response.statusText} - ${errorText}`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Network error saving ${pokemon.name} (ID: ${pokemon.id}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.success = result.imported > 0;
      return result;
    } catch (error) {
      result.errors.push(`Save operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  // Import and save Pokemon in one operation
  static async importAndSave(pokemonIds: number[]): Promise<ImportResult> {
    try {
      // First import from PokeAPI
      const importResult = await this.importFromPokeAPI(pokemonIds);
      
      if (!importResult.success || !importResult.data?.length) {
        return importResult;
      }

      // Then save to Dataverse
      const saveResult = await this.saveToDataverse(importResult.data);
      
      return {
        success: saveResult.success,
        imported: saveResult.imported,
        failed: importResult.failed + saveResult.failed,
        errors: [...importResult.errors, ...saveResult.errors]
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        failed: pokemonIds.length,
        errors: [`Import and save failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Get popular Pokemon for quick import
  static getPopularPokemonIds(): number[] {
    return [
      1, 4, 7, 25, 39, 52, 54, 58, 63, 74, 81, 92, 95, 100, 104, 109, 113, 115, 120, 122,
      129, 131, 133, 137, 143, 144, 145, 146, 150, 151, 152, 155, 158, 161, 165, 172, 173,
      174, 179, 183, 185, 190, 191, 194, 200, 201, 202, 206, 211, 213, 214, 215, 220, 222,
      225, 226, 227, 231, 233, 236, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248,
      249, 250, 251, 252, 255, 258, 261, 263, 265, 270, 276, 278, 280, 287, 293, 298, 300,
      302, 304, 309, 318, 320, 322, 325, 327, 333, 335, 339, 341, 349, 353, 355, 359, 361,
      363, 366, 369, 371, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
      387, 390, 393, 399, 403, 405, 417, 424, 425, 427, 433, 436, 440, 442, 446, 447, 448,
      449, 453, 454, 459, 461, 468, 470, 471, 474, 479, 480, 481, 482, 483, 484, 485, 486,
      487, 488, 489, 490, 491, 492, 493
    ];
  }

  // Validate Pokemon data before import
  static validatePokemonData(data: PokemonImportData[]): { valid: PokemonImportData[], invalid: string[] } {
    const valid: PokemonImportData[] = [];
    const invalid: string[] = [];

    for (const pokemon of data) {
      if (!pokemon.id || !pokemon.name || !pokemon.types?.length) {
        invalid.push(`Pokemon missing required fields: ${pokemon.name || 'Unknown'}`);
      } else if (!pokemon.sprites?.front_default) {
        invalid.push(`Pokemon ${pokemon.name} missing sprite`);
      } else {
        valid.push(pokemon);
      }
    }

    return { valid, invalid };
  }
}
