import { Pokemon } from '../types/pokemon';
import { updateUserPokemon } from './azureFunctionsDataverseService';

export interface UserPokemon {
  id: string; // Dataverse entity ID
  pokemonId: number; // Reference to Pokemon master data
  nickname?: string;
  level: number;
  experience: number;
  experienceToNext: number;
  caughtDate: Date;
  battleStats: {
    wins: number;
    losses: number;
    totalBattles: number;
  };
  currentStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
}

export interface BattleResult {
  won: boolean;
  experienceGained: number;
  newLevel?: number;
  canEvolve?: boolean;
  evolutionOptions?: Array<{
    id: number;
    name: string;
    requirement: any;
  }>;
}

export interface WildPokemon {
  pokemonId: number;
  level: number;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
}

class BattleService {
  /**
   * Calculate Pokemon stats based on level and base stats
   */
  private calculateStatsForLevel(pokemon: Pokemon, level: number) {
    const baseStats = pokemon.stats.reduce((acc, stat) => {
      acc[stat.name.replace('-', '')] = stat.base_stat;
      return acc;
    }, {} as any);

    // Simplified stat calculation (you can make this more complex)
    const statMultiplier = 1 + (level - 1) * 0.1; // 10% increase per level
    
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
   * Generate a wild Pokemon for battle
   */
  generateWildPokemon(pokemon: Pokemon, level?: number): WildPokemon {
    const wildLevel = level || Math.floor(Math.random() * 20) + 1; // Level 1-20
    const stats = this.calculateStatsForLevel(pokemon, wildLevel);

    return {
      pokemonId: pokemon.id,
      level: wildLevel,
      stats
    };
  }

  /**
   * Simulate a battle between user Pokemon and wild Pokemon
   */
  simulateBattle(userPokemon: UserPokemon, wildPokemon: WildPokemon, allPokemon: Pokemon[]): BattleResult {
    // Get user Pokemon base data
    const userPokemonData = allPokemon.find(p => p.id === userPokemon.pokemonId);
    if (!userPokemonData) {
      throw new Error('User Pokemon data not found');
    }

    // Calculate battle outcome based on stats and level
    const userPower = this.calculateBattlePower(userPokemon.currentStats, userPokemon.level);
    const wildPower = this.calculateBattlePower(wildPokemon.stats, wildPokemon.level);
    
    // Add some randomness (70% stats influence, 30% random)
    const randomFactor = Math.random() * 0.3 + 0.85; // 0.85 - 1.15
    const userChance = (userPower * randomFactor) / (userPower * randomFactor + wildPower);
    
    const won = Math.random() < userChance;
    
    // Calculate experience gained
    const baseExperience = won ? 100 : 25; // More XP for winning
    const levelDifference = wildPokemon.level - userPokemon.level;
    const experienceMultiplier = Math.max(0.5, 1 + levelDifference * 0.1); // Bonus for beating higher level Pokemon
    
    const experienceGained = Math.floor(baseExperience * experienceMultiplier);
    
    // Check if Pokemon levels up
    const newExperience = userPokemon.experience + experienceGained;
    const newLevel = this.calculateLevelFromExperience(newExperience);
    const leveledUp = newLevel > userPokemon.level;
    
    // Check if Pokemon can evolve
    let canEvolve = false;
    let evolutionOptions: any[] = [];
    
    if (leveledUp && userPokemonData.evolution?.can_evolve) {
      evolutionOptions = userPokemonData.evolution.evolves_to.filter(evolution => {
        const req = evolution.requirement;
        if (!req) return true;
        
        // Check level requirement
        if (req.level && newLevel >= req.level) {
          return true;
        }
        
        // Add other evolution requirement checks here (items, happiness, etc.)
        return false;
      });
      
      canEvolve = evolutionOptions.length > 0;
    }

    return {
      won,
      experienceGained,
      newLevel: leveledUp ? newLevel : undefined,
      canEvolve,
      evolutionOptions: canEvolve ? evolutionOptions : undefined
    };
  }

  /**
   * Calculate battle power from stats
   */
  private calculateBattlePower(stats: any, level: number): number {
    return (stats.attack + stats.defense + stats.specialAttack + stats.specialDefense + stats.speed) * level;
  }

  /**
   * Calculate level from total experience
   */
  private calculateLevelFromExperience(experience: number): number {
    // Simple level calculation: 100 XP per level
    return Math.floor(experience / 100) + 1;
  }

  /**
   * Calculate experience needed for next level
   */
  private calculateExperienceToNext(level: number): number {
    return level * 100;
  }

  /**
   * Update user Pokemon after battle
   */
  async updatePokemonAfterBattle(
    userPokemon: UserPokemon, 
    battleResult: BattleResult,
    allPokemon: Pokemon[]
  ): Promise<UserPokemon> {
    const updatedPokemon = { ...userPokemon };
    
    // Update experience and level
    updatedPokemon.experience += battleResult.experienceGained;
    if (battleResult.newLevel) {
      updatedPokemon.level = battleResult.newLevel;
      
      // Recalculate stats for new level
      const pokemonData = allPokemon.find(p => p.id === userPokemon.pokemonId);
      if (pokemonData) {
        updatedPokemon.currentStats = this.calculateStatsForLevel(pokemonData, battleResult.newLevel);
      }
    }
    
    updatedPokemon.experienceToNext = this.calculateExperienceToNext(updatedPokemon.level) - (updatedPokemon.experience % 100);
    
    // Update battle stats
    updatedPokemon.battleStats.totalBattles++;
    if (battleResult.won) {
      updatedPokemon.battleStats.wins++;
    } else {
      updatedPokemon.battleStats.losses++;
    }

    // Save to Dataverse
    try {
      await updateUserPokemon(updatedPokemon);
    } catch (error) {
      console.error('Failed to update Pokemon in Dataverse:', error);
      // Continue with local update even if Dataverse fails
    }

    return updatedPokemon;
  }

  /**
   * Get random wild Pokemon for encounter
   */
  getRandomWildPokemon(allPokemon: Pokemon[]): { pokemon: Pokemon; wild: WildPokemon } {
    const randomIndex = Math.floor(Math.random() * allPokemon.length);
    const pokemon = allPokemon[randomIndex];
    const wildPokemon = this.generateWildPokemon(pokemon);
    
    return { pokemon, wild: wildPokemon };
  }

  /**
   * Create initial user Pokemon from caught Pokemon
   */
  createUserPokemon(pokemon: Pokemon, nickname?: string): Omit<UserPokemon, 'id'> {
    const level = 1;
    const currentStats = this.calculateStatsForLevel(pokemon, level);
    
    return {
      pokemonId: pokemon.id,
      nickname,
      level,
      experience: 0,
      experienceToNext: 100,
      caughtDate: new Date(),
      battleStats: {
        wins: 0,
        losses: 0,
        totalBattles: 0
      },
      currentStats
    };
  }
}

export const battleService = new BattleService();
