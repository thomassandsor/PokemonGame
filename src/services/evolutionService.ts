import { Pokemon, EvolutionRequirement } from '../types/pokemon';
import { updateUserPokemon } from './azureFunctionsDataverseService';
import { UserPokemon } from './battleService';

export interface EvolutionResult {
  success: boolean;
  newPokemonId?: number;
  newPokemonName?: string;
  error?: string;
}

export interface EvolutionOption {
  targetPokemon: Pokemon;
  requirement: EvolutionRequirement | null;
  canEvolveNow: boolean;
  missingRequirements: string[];
}

class EvolutionService {
  /**
   * Check if a Pokemon can evolve and return available evolution options
   */
  getEvolutionOptions(
    userPokemon: UserPokemon, 
    allPokemon: Pokemon[], 
    userItems?: string[]
  ): EvolutionOption[] {
    const pokemonData = allPokemon.find(p => p.id === userPokemon.pokemonId);
    if (!pokemonData?.evolution?.can_evolve) {
      return [];
    }

    return pokemonData.evolution.evolves_to.map(evolution => {
      const targetPokemon = allPokemon.find(p => p.id === evolution.id);
      if (!targetPokemon) {
        return {
          targetPokemon: {} as Pokemon,
          requirement: evolution.requirement,
          canEvolveNow: false,
          missingRequirements: ['Target Pokemon not found']
        };
      }

      const { canEvolve, missingRequirements } = this.checkEvolutionRequirements(
        userPokemon,
        evolution.requirement,
        userItems
      );

      return {
        targetPokemon,
        requirement: evolution.requirement,
        canEvolveNow: canEvolve,
        missingRequirements
      };
    });
  }

  /**
   * Check if evolution requirements are met
   */
  private checkEvolutionRequirements(
    userPokemon: UserPokemon,
    requirement: EvolutionRequirement | null,
    userItems?: string[]
  ): { canEvolve: boolean; missingRequirements: string[] } {
    const missing: string[] = [];

    if (!requirement) {
      return { canEvolve: true, missingRequirements: [] };
    }

    // Check level requirement
    if (requirement.level && userPokemon.level < requirement.level) {
      missing.push(`Level ${requirement.level} required (current: ${userPokemon.level})`);
    }

    // Check item requirement
    if (requirement.item) {
      if (!userItems || !userItems.includes(requirement.item)) {
        missing.push(`${requirement.item} required`);
      }
    }

    // Check happiness requirement
    if (requirement.min_happiness) {
      // For now, assume happiness is related to battle wins
      const happiness = this.calculateHappiness(userPokemon);
      if (happiness < requirement.min_happiness) {
        missing.push(`${requirement.min_happiness} happiness required (current: ${happiness})`);
      }
    }

    // Check time of day requirement
    if (requirement.time_of_day) {
      const currentHour = new Date().getHours();
      const isDayTime = currentHour >= 6 && currentHour < 18;
      const isNightTime = currentHour >= 18 || currentHour < 6;
      
      if (requirement.time_of_day === 'day' && !isDayTime) {
        missing.push('Must evolve during day time (6 AM - 6 PM)');
      } else if (requirement.time_of_day === 'night' && !isNightTime) {
        missing.push('Must evolve during night time (6 PM - 6 AM)');
      }
    }

    // Check location requirement (simplified - could be expanded)
    if (requirement.location) {
      missing.push(`Must be at ${requirement.location}`);
    }

    // Check known move requirement
    if (requirement.known_move) {
      // For now, assume all Pokemon know their required moves
      // In a full implementation, you'd check the Pokemon's moveset
    }

    return {
      canEvolve: missing.length === 0,
      missingRequirements: missing
    };
  }

  /**
   * Calculate Pokemon happiness based on battle performance
   */
  private calculateHappiness(userPokemon: UserPokemon): number {
    const baseHappiness = 50;
    const winBonus = userPokemon.battleStats.wins * 2;
    const levelBonus = userPokemon.level * 1;
    const timeBonusWeeks = Math.floor((Date.now() - userPokemon.caughtDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    return Math.min(255, baseHappiness + winBonus + levelBonus + timeBonusWeeks);
  }

  /**
   * Evolve a Pokemon
   */
  async evolvePokemon(
    userPokemon: UserPokemon,
    targetPokemonId: number,
    allPokemon: Pokemon[],
    consumeItem?: string
  ): Promise<EvolutionResult> {
    try {
      // Verify evolution is valid
      const evolutionOptions = this.getEvolutionOptions(userPokemon, allPokemon);
      const validEvolution = evolutionOptions.find(
        option => option.targetPokemon.id === targetPokemonId && option.canEvolveNow
      );

      if (!validEvolution) {
        return {
          success: false,
          error: 'Evolution requirements not met or invalid target Pokemon'
        };
      }

      const targetPokemon = validEvolution.targetPokemon;

      // Create evolved Pokemon data
      const evolvedPokemon: UserPokemon = {
        ...userPokemon,
        pokemonId: targetPokemon.id,
        // Recalculate stats for the new Pokemon at the same level
        currentStats: this.calculateStatsForEvolution(targetPokemon, userPokemon.level)
      };

      // Update in Dataverse
      await updateUserPokemon(evolvedPokemon);

      return {
        success: true,
        newPokemonId: targetPokemon.id,
        newPokemonName: targetPokemon.name
      };

    } catch (error) {
      console.error('Evolution failed:', error);
      return {
        success: false,
        error: 'Evolution failed due to system error'
      };
    }
  }

  /**
   * Calculate stats for evolved Pokemon
   */
  private calculateStatsForEvolution(pokemon: Pokemon, level: number) {
    const baseStats = pokemon.stats.reduce((acc, stat) => {
      acc[stat.name.replace('-', '')] = stat.base_stat;
      return acc;
    }, {} as any);

    const statMultiplier = 1 + (level - 1) * 0.1;
    
    return {
      hp: Math.floor(baseStats.hp * statMultiplier),
      attack: Math.floor(baseStats.attack * statMultiplier),
      defense: Math.floor(baseStats.defense * statMultiplier),
      specialAttack: Math.floor(baseStats.specialattack * statMultiplier),
      specialDefense: Math.floor(baseStats.specialdefense * statMultiplier),
      speed: Math.floor(baseStats.speed * statMultiplier)
    };
  }

  /**
   * Get evolution chain for a Pokemon (for display purposes)
   */
  getEvolutionChain(pokemonId: number, allPokemon: Pokemon[]): Pokemon[] {
    const pokemon = allPokemon.find(p => p.id === pokemonId);
    if (!pokemon) return [];

    const chain: Pokemon[] = [];
    
    // Find the first Pokemon in the chain
    let current = pokemon;
    while (current.evolution?.evolves_from) {
      const evolvesFromName = current.evolution.evolves_from;
      const previous = allPokemon.find(p => p.name === evolvesFromName);
      if (previous) {
        current = previous;
      } else {
        break;
      }
    }

    // Build the full chain from the beginning
    chain.push(current);
    
    let workingPokemon = current;
    while (workingPokemon.evolution?.evolves_to && workingPokemon.evolution.evolves_to.length > 0) {
      // For simplicity, take the first evolution option
      const nextId = workingPokemon.evolution.evolves_to[0].id;
      const next = allPokemon.find(p => p.id === nextId);
      if (next) {
        chain.push(next);
        workingPokemon = next;
      } else {
        break;
      }
    }

    return chain;
  }

  /**
   * Check if a Pokemon is at the final evolution stage
   */
  isFinalEvolution(pokemonId: number, allPokemon: Pokemon[]): boolean {
    const pokemon = allPokemon.find(p => p.id === pokemonId);
    return !pokemon?.evolution?.can_evolve;
  }

  /**
   * Get evolution stones/items required for all evolutions
   */
  getEvolutionItems(allPokemon: Pokemon[]): string[] {
    const items = new Set<string>();
    
    allPokemon.forEach(pokemon => {
      if (pokemon.evolution?.evolves_to) {
        pokemon.evolution.evolves_to.forEach(evolution => {
          if (evolution.requirement?.item) {
            items.add(evolution.requirement.item);
          }
        });
      }
    });
    
    return Array.from(items).sort();
  }
}

export const evolutionService = new EvolutionService();
