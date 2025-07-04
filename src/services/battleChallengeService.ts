// Battle Challenge Service for Pokemon Game
import { 
  StatusCodes, 
  StateCodes, 
  DataverseUtils 
} from '../constants/dataverseMappings';
import { 
  PokemonBattleRecord, 
  PokemonBattleSchema, 
  DataverseValidator, 
  DataverseQueryBuilder 
} from '../constants/dataverseSchema';
import { 
  CompleteBattleData, 
  BattlePokemon 
} from '../types/battleTypes';
import { BattleSimulationService } from './battleSimulationService';

// Basic battle record interface (for creation/updates)
export interface PokemonBattle extends PokemonBattleRecord {}

// Extended interface for battles with expanded lookup data (for display)
export interface PokemonBattleExpanded {
  // All base fields
  pokemon_battleid?: string;
  statuscode?: 1 | 895550001;
  statecode?: 0 | 1;
  pokemon_challengetype?: 1 | 2;
  createdon?: string;
  modifiedon?: string;
  pokemon_battleresult?: string;
  
  // Raw Dataverse _value fields (always present as GUIDs)
  _pokemon_player1_value?: string;
  _pokemon_player1pokemon_value?: string;
  _pokemon_player2_value?: string;
  _pokemon_player2pokemon_value?: string;
  
  // Expanded lookup objects (when using $expand) - using correct navigation property names
  // Pattern 2 works: pokemon_Player1 and pokemon_Player1Pokemon (with capital P)
  pokemon_Player1?: {
    firstname?: string;
  };
  pokemon_Player1Pokemon?: {
    pokemon_Pokemon?: {
      pokemon_name?: string;
    };
  };
}

// Legacy interface for backwards compatibility  
export interface BattleResult {
  battleSteps: any[];
  winner: string;
  battleLog: string[];
  finalState: any;
  // New field to store complete battle data
  completeBattleData?: CompleteBattleData;
}

export class BattleChallengeService {
  private static readonly API_BASE = '/api/dataverse';

  // Create a new battle challenge
  static async createChallenge(
    playerId: string, 
    pokemonId: string, 
    challengeType: 'open' | 'training' = 'open'
  ): Promise<{ success: boolean; battleId?: string; error?: string }> {
    try {
      const challengeTypeCode = DataverseUtils.getChallengeTypeCode(challengeType);
      const statusCode = DataverseUtils.getStatusCodeForNewChallenge(challengeTypeCode);

      const battle: Partial<PokemonBattle> = {
        pokemon_player1: playerId,
        pokemon_player1pokemon: pokemonId,
        pokemon_challengetype: challengeTypeCode,
        statuscode: statusCode,
        statecode: StateCodes.ACTIVE,
        createdon: new Date().toISOString()
      };

      // Validate before sending
      const validation = DataverseValidator.validatePokemonBattle(battle);
      if (!validation.valid) {
        return { 
          success: false, 
          error: `Validation failed: ${validation.errors.join(', ')}` 
        };
      }

      const response = await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(battle)
      });

      if (response.ok) {
        const result = await response.json();
        
        // If it's a training challenge, immediately simulate vs AI
        if (challengeType === 'training') {
          await this.simulateBattle(result.pokemon_battleid);
        }
        
        return { success: true, battleId: result.pokemon_battleid };
      } else {
        return { success: false, error: `Failed to create battle: ${response.statusText}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Error creating battle: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Get list of open battles (challenges) with expanded lookup data
  static async getOpenChallenges(): Promise<PokemonBattleExpanded[]> {
    try {
      // Use the correct expand pattern - pokemon_Pokemon (capital P) follows schema name
      const expandQuery = 'pokemon_Player1($select=firstname),pokemon_Player1Pokemon($expand=pokemon_Pokemon($select=pokemon_name))';
      const expandUrl = `${this.API_BASE}/${PokemonBattleSchema.tableName}?$filter=statuscode eq 1 and statecode eq 0&$expand=${expandQuery}&$orderby=createdon desc`;
      
      console.log('🔍 Fetching open challenges with expand:', expandUrl);
      
      const response = await fetch(expandUrl);
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Successfully fetched expanded challenges:', data);
        console.log('📊 First challenge structure:', data.value?.[0]);
        return data.value || [];
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch challenges:', errorText);
        
        // Fallback to basic query without expand
        console.log('🔄 Falling back to basic query...');
        const basicUrl = `${this.API_BASE}/${PokemonBattleSchema.tableName}?$filter=statuscode eq 1 and statecode eq 0&$orderby=createdon desc`;
        const basicResponse = await fetch(basicUrl);
        
        if (basicResponse.ok) {
          const basicData = await basicResponse.json();
          console.log('📊 Basic data retrieved:', basicData);
          return basicData.value || [];
        }
      }
      return [];
    } catch (error) {
      console.error('❌ Error fetching open battles:', error);
      return [];
    }
  }

  // Join an existing battle
  static async joinChallenge(
    battleId: string, 
    challengerId: string, 
    pokemonId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pokemon_player2: challengerId,
          pokemon_player2pokemon: pokemonId,
          statuscode: StatusCodes.COMPLETED, // Mark as completed when second player joins
          modifiedon: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Trigger battle simulation
        await this.simulateBattle(battleId);
        return { success: true };
      } else {
        return { success: false, error: `Failed to join battle: ${response.statusText}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Error joining battle: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Get battle result for viewing
  static async getBattleResult(battleId: string): Promise<BattleResult | null> {
    try {
      const response = await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`);
      
      if (response.ok) {
        const battle = await response.json();
        if (battle.pokemon_battleresult) {
          return JSON.parse(battle.pokemon_battleresult);
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching battle result:', error);
      return null;
    }
  }

  // Get user's battles (where they are player1 or player2)
  static async getUserChallenges(userId: string): Promise<PokemonBattle[]> {
    try {
      const response = await fetch(
        `${this.API_BASE}/${DataverseQueryBuilder.getUserBattles(userId)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.value || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching user battles:', error);
      return [];
    }
  }

  // Simulate battle (called after both players joined)
  private static async simulateBattle(battleId: string): Promise<void> {
    try {
      // Get battle details first
      const response = await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`);
      if (!response.ok) return;
      
      const battle = await response.json();
      
      // Mock player data - in real implementation, fetch from user tables
      const player1 = { id: battle.pokemon_player1 || 'player1', name: 'Trainer 1' };
      const player2 = { id: battle.pokemon_player2 || 'player2', name: 'Trainer 2' };
      
      // Mock Pokemon data - in real implementation, fetch from Pokemon tables
      const pokemon1: BattlePokemon = {
        id: battle.pokemon_player1pokemon || '1',
        pokemon_id: 25, // Pikachu
        name: 'Pikachu',
        level: 20,
        hp: 70,
        max_hp: 70,
        attack: 55,
        defense: 40,
        speed: 90,
        types: ['electric'],
        sprite_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
        moves: []
      };
      
      const pokemon2: BattlePokemon = {
        id: battle.pokemon_player2pokemon || '2',
        pokemon_id: 4, // Charmander
        name: 'Charmander',
        level: 18,
        hp: 65,
        max_hp: 65,
        attack: 52,
        defense: 43,
        speed: 65,
        types: ['fire'],
        sprite_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
        moves: []
      };
      
      // Simulate the battle
      const battleData = await BattleSimulationService.simulateBattle(
        player1,
        player2,
        pokemon1,
        pokemon2,
        'casual'
      );
      
      // Convert to legacy format for backwards compatibility
      const legacyResult: BattleResult = {
        battleSteps: battleData.battle_turns.map((turn, index) => ({
          stepNumber: index + 1,
          message: turn.turn_result.turn_summary
        })),
        winner: battleData.final_result.winner_name,
        battleLog: battleData.battle_log,
        finalState: {
          player1HP: battleData.battle_turns[battleData.battle_turns.length - 1]?.turn_result.player1_pokemon_hp || 0,
          player2HP: battleData.battle_turns[battleData.battle_turns.length - 1]?.turn_result.player2_pokemon_hp || 0
        },
        completeBattleData: battleData
      };
      
      // Store battle result in Dataverse
      await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pokemon_battleresult: JSON.stringify(legacyResult),
          modifiedon: new Date().toISOString()
        })
      });
      
    } catch (error) {
      console.error('Error simulating battle:', error);
    }
  }

  // Helper method to convert user Pokemon to BattlePokemon format
  static convertUserPokemonToBattle(userPokemon: any): BattlePokemon {
    return {
      id: userPokemon.id || userPokemon.pokemon_id?.toString() || '',
      pokemon_id: userPokemon.pokemon_id || userPokemon.id || 25,
      name: userPokemon.name || userPokemon.pokemon_name || 'Unknown',
      level: userPokemon.level || 5,
      hp: userPokemon.hp || userPokemon.current_hp || 50,
      max_hp: userPokemon.maxHp || userPokemon.max_hp || 50,
      attack: userPokemon.attack || 30,
      defense: userPokemon.defense || 25,
      speed: userPokemon.speed || 20,
      types: userPokemon.types || ['normal'],
      sprite_url: userPokemon.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${userPokemon.pokemon_id || userPokemon.id || 25}.png`,
      moves: userPokemon.moves || []
    };
  }
}
