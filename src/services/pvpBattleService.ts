import { Pokemon } from '../types/pokemon';
import { UserPokemon } from './battleService';
import { updateUserPokemon } from './azureFunctionsDataverseService';

export interface BattleQueue {
  battleQueueId?: string;
  challengerId: string; // User who initiated the battle
  challengerPokemonId: string; // Pokemon used by challenger
  targetLevel?: number; // Optional level range for matchmaking
  preferredTypes?: string[]; // Optional type preferences
  battleType: 'random' | 'friend' | 'ranked';
  status: 'waiting' | 'matched' | 'completed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export interface BattleMatch {
  battleMatchId?: string;
  challengerId: string;
  challengeeId: string;
  challengerPokemonId: string;
  challengeePokemonId: string;
  battleData: string; // JSON of battle simulation
  winnerId?: string;
  battleResult: string; // JSON of detailed results
  status: 'pending' | 'challenger_ready' | 'challengee_ready' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

export interface AsyncBattleResult {
  battleId: string;
  isWinner: boolean;
  opponentName: string;
  opponentPokemon: string;
  experienceGained: number;
  newLevel?: number;
  canEvolve?: boolean;
  battleLog: string[];
}

class PvPBattleService {
  /**
   * Join the battle queue with a Pokemon
   */
  async joinBattleQueue(
    userId: string,
    userPokemon: UserPokemon,
    battleType: 'random' | 'friend' | 'ranked' = 'random',
    options?: {
      targetLevel?: number;
      preferredTypes?: string[];
    }
  ): Promise<{ queueId: string; estimatedWaitTime: number }> {
    try {
      // First, try to find an existing match
      const existingMatch = await this.findAvailableMatch(userId, userPokemon, battleType, options);
      
      if (existingMatch) {
        // Create battle match immediately
        const battleMatch = await this.createBattleMatch(
          existingMatch.challengerId,
          userId,
          existingMatch.challengerPokemonId,
          userPokemon.id
        );
        
        // Remove the original queue entry
        await this.removeFromQueue(existingMatch.battleQueueId!);
        
        return {
          queueId: battleMatch.battleMatchId!,
          estimatedWaitTime: 0 // Immediate match
        };
      }
      
      // No match found, add to queue
      const queueEntry: BattleQueue = {
        challengerId: userId,
        challengerPokemonId: userPokemon.id,
        targetLevel: options?.targetLevel,
        preferredTypes: options?.preferredTypes,
        battleType,
        status: 'waiting',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
      
      const result = await this.addToQueue(queueEntry);
      const estimatedWaitTime = await this.calculateEstimatedWaitTime(battleType);
      
      return {
        queueId: result.battleQueueId!,
        estimatedWaitTime
      };
      
    } catch (error) {
      console.error('Failed to join battle queue:', error);
      throw error;
    }
  }

  /**
   * Accept a battle match and simulate the battle
   */
  async acceptBattle(
    battleMatchId: string,
    userId: string,
    userPokemon: UserPokemon,
    allPokemon: Pokemon[]
  ): Promise<AsyncBattleResult> {
    try {
      // Get battle match details
      const battleMatch = await this.getBattleMatch(battleMatchId);
      if (!battleMatch) {
        throw new Error('Battle match not found');
      }
      
      // Verify user is part of this battle
      if (battleMatch.challengerId !== userId && battleMatch.challengeeId !== userId) {
        throw new Error('User not authorized for this battle');
      }
      
      // Get opponent's Pokemon
      const isChallenger = battleMatch.challengerId === userId;
      const opponentPokemonId = isChallenger ? 
        battleMatch.challengeePokemonId : 
        battleMatch.challengerPokemonId;
      
      const opponentPokemon = await this.getUserPokemon(opponentPokemonId);
      const opponentUserId = isChallenger ? battleMatch.challengeeId : battleMatch.challengerId;
      const opponentUser = await this.getUser(opponentUserId);
      
      // Simulate the battle
      const battleResult = this.simulateAsyncBattle(userPokemon, opponentPokemon, allPokemon);
      
      // Determine winner
      const userWon = battleResult.winner === (isChallenger ? 'challenger' : 'challengee');
      
      // Calculate rewards
      const experienceGained = this.calculatePvPExperience(userPokemon, opponentPokemon, userWon);
      const newLevel = this.calculateLevelFromExperience(userPokemon.experience + experienceGained);
      const leveledUp = newLevel > userPokemon.level;
      
      // Check evolution
      const canEvolve = leveledUp && this.checkEvolutionAvailable(userPokemon, newLevel, allPokemon);
      
      // Update Pokemon stats
      const updatedPokemon = {
        ...userPokemon,
        experience: userPokemon.experience + experienceGained,
        level: newLevel,
        battleStats: {
          ...userPokemon.battleStats,
          totalBattles: userPokemon.battleStats.totalBattles + 1,
          wins: userPokemon.battleStats.wins + (userWon ? 1 : 0),
          losses: userPokemon.battleStats.losses + (userWon ? 0 : 1)
        }
      };
      
      await updateUserPokemon(updatedPokemon);
      
      // Update battle match status
      await this.completeBattleMatch(battleMatchId, userWon ? userId : opponentUserId, battleResult);
      
      return {
        battleId: battleMatchId,
        isWinner: userWon,
        opponentName: opponentUser.name || 'Anonymous Trainer',
        opponentPokemon: this.getPokemonName(opponentPokemon, allPokemon),
        experienceGained,
        newLevel: leveledUp ? newLevel : undefined,
        canEvolve,
        battleLog: battleResult.log
      };
      
    } catch (error) {
      console.error('Failed to accept battle:', error);
      throw error;
    }
  }

  /**
   * Get pending battles for a user
   */
  async getPendingBattles(userId: string): Promise<BattleMatch[]> {
    try {
      // This would query Dataverse for battles where user is challenger or challengee
      // and status is 'pending' or 'challenger_ready' or 'challengee_ready'
      const response = await fetch('/api/dataverse/battle-matches', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending battles');
      }
      
      const battles = await response.json();
      return battles.filter((battle: BattleMatch) => 
        (battle.challengerId === userId || battle.challengeeId === userId) &&
        battle.status !== 'completed'
      );
    } catch (error) {
      console.error('Failed to get pending battles:', error);
      return [];
    }
  }

  /**
   * Get battle history for a user
   */
  async getBattleHistory(userId: string, limit: number = 20): Promise<AsyncBattleResult[]> {
    try {
      const response = await fetch(`/api/dataverse/battle-history?userId=${userId}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch battle history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get battle history:', error);
      return [];
    }
  }

  /**
   * Simulate battle between two user Pokemon
   */
  private simulateAsyncBattle(pokemon1: UserPokemon, pokemon2: UserPokemon, allPokemon: Pokemon[]) {
    const p1Data = allPokemon.find(p => p.id === pokemon1.pokemonId);
    const p2Data = allPokemon.find(p => p.id === pokemon2.pokemonId);
    
    if (!p1Data || !p2Data) {
      throw new Error('Pokemon data not found');
    }
    
    // Calculate battle power for both Pokemon
    const p1Power = this.calculateBattlePower(pokemon1.currentStats, pokemon1.level);
    const p2Power = this.calculateBattlePower(pokemon2.currentStats, pokemon2.level);
    
    // Add type effectiveness and some randomness
    const typeMultiplier1 = this.calculateTypeEffectiveness(p1Data.types, p2Data.types);
    const typeMultiplier2 = this.calculateTypeEffectiveness(p2Data.types, p1Data.types);
    
    const finalPower1 = p1Power * typeMultiplier1 * (0.8 + Math.random() * 0.4); // 80-120% random
    const finalPower2 = p2Power * typeMultiplier2 * (0.8 + Math.random() * 0.4);
    
    const winner = finalPower1 > finalPower2 ? 'challenger' : 'challengee';
    const winnerPokemon = winner === 'challenger' ? pokemon1 : pokemon2;
    const loserPokemon = winner === 'challenger' ? pokemon2 : pokemon1;
    
    const log = [
      `${p1Data.name} (Level ${pokemon1.level}) vs ${p2Data.name} (Level ${pokemon2.level})`,
      `Type effectiveness: ${p1Data.types.join('/')} vs ${p2Data.types.join('/')}`,
      `Battle Power: ${Math.round(finalPower1)} vs ${Math.round(finalPower2)}`,
      `${winner === 'challenger' ? p1Data.name : p2Data.name} wins!`,
      `Experience gained based on level difference and performance.`
    ];
    
    return {
      winner,
      winnerPokemon,
      loserPokemon,
      battleStats: { finalPower1, finalPower2, typeMultiplier1, typeMultiplier2 },
      log
    };
  }

  /**
   * Calculate type effectiveness multiplier
   */
  private calculateTypeEffectiveness(attackerTypes: string[], defenderTypes: string[]): number {
    // Simplified type chart - in a full implementation, this would be more comprehensive
    const typeChart: { [key: string]: { [key: string]: number } } = {
      fire: { grass: 2, ice: 2, bug: 2, steel: 2, water: 0.5, fire: 0.5, rock: 0.5, dragon: 0.5 },
      water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
      grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
      electric: { water: 2, flying: 2, ground: 0, grass: 0.5, electric: 0.5, dragon: 0.5 },
      // ... more type matchups would go here
    };
    
    let effectiveness = 1;
    
    for (const attackType of attackerTypes) {
      for (const defendType of defenderTypes) {
        if (typeChart[attackType] && typeChart[attackType][defendType] !== undefined) {
          effectiveness *= typeChart[attackType][defendType];
        }
      }
    }
    
    return Math.max(0.25, Math.min(4, effectiveness)); // Cap between 0.25x and 4x
  }

  /**
   * Calculate battle power from stats
   */
  private calculateBattlePower(stats: any, level: number): number {
    return (stats.attack + stats.defense + stats.specialAttack + stats.specialDefense + stats.speed) * level * 0.1;
  }

  /**
   * Calculate PvP experience based on opponent and result
   */
  private calculatePvPExperience(userPokemon: UserPokemon, opponentPokemon: UserPokemon, won: boolean): number {
    const baseExp = won ? 150 : 50; // More XP than wild Pokemon battles
    const levelDiff = opponentPokemon.level - userPokemon.level;
    const multiplier = Math.max(0.5, 1 + levelDiff * 0.1); // Bonus for beating higher level
    
    return Math.floor(baseExp * multiplier);
  }

  // Helper methods that would interact with Dataverse
  private async findAvailableMatch(userId: string, userPokemon: UserPokemon, battleType: string, options?: any): Promise<BattleQueue | null> {
    // Query Dataverse for compatible queue entries
    // This is a placeholder - would need actual Dataverse implementation
    return null;
  }

  private async addToQueue(queueEntry: BattleQueue): Promise<BattleQueue> {
    // Add to Dataverse battle queue table
    // Return the created entry with ID
    return { ...queueEntry, battleQueueId: 'mock-queue-id' };
  }

  private async removeFromQueue(queueId: string): Promise<void> {
    // Remove from Dataverse battle queue table
  }

  private async createBattleMatch(challengerId: string, challengeeId: string, challengerPokemonId: string, challengeePokemonId: string): Promise<BattleMatch> {
    // Create battle match in Dataverse
    return {
      battleMatchId: 'mock-match-id',
      challengerId,
      challengeeId,
      challengerPokemonId,
      challengeePokemonId,
      battleData: '',
      battleResult: '',
      status: 'pending',
      createdAt: new Date()
    };
  }

  private async getBattleMatch(battleMatchId: string): Promise<BattleMatch | null> {
    // Get battle match from Dataverse
    return null;
  }

  private async getUserPokemon(pokemonId: string): Promise<UserPokemon> {
    // Get user Pokemon from Dataverse
    throw new Error('Not implemented');
  }

  private async getUser(userId: string): Promise<any> {
    // Get user details from Dataverse
    return { name: 'Unknown Trainer' };
  }

  private async completeBattleMatch(battleMatchId: string, winnerId: string, battleResult: any): Promise<void> {
    // Update battle match in Dataverse with results
  }

  private calculateLevelFromExperience(experience: number): number {
    return Math.floor(experience / 100) + 1;
  }

  private checkEvolutionAvailable(pokemon: UserPokemon, newLevel: number, allPokemon: Pokemon[]): boolean {
    // Check if Pokemon can evolve at new level
    const pokemonData = allPokemon.find(p => p.id === pokemon.pokemonId);
    return pokemonData?.evolution?.can_evolve && 
           pokemonData.evolution.evolves_to.some(evo => 
             evo.requirement?.level && evo.requirement.level <= newLevel
           ) || false;
  }

  private getPokemonName(pokemon: UserPokemon, allPokemon: Pokemon[]): string {
    const pokemonData = allPokemon.find(p => p.id === pokemon.pokemonId);
    return pokemon.nickname || pokemonData?.name || 'Unknown Pokemon';
  }

  private async calculateEstimatedWaitTime(battleType: string): Promise<number> {
    // Calculate based on current queue size and historical data
    return Math.floor(Math.random() * 300) + 60; // 1-5 minutes mock
  }
}

export const pvpBattleService = new PvPBattleService();
