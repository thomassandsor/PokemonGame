// Battle Challenge Service for Pokemon Game
import { 
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
  statuscode?: 1 | 895550002 | 895550001;
  statecode?: 0 | 1;
  pokemon_challengetype?: 1 | 2;
  createdon?: string;
  modifiedon?: string;
  pokemon_battleresultjson?: string;
  
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
          await this.simulateBattleWithRealData(result.pokemon_battleid);
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
    // Validate input
    if (!challengerId || !pokemonId) {
      return { success: false, error: 'Missing challengerId or pokemonId for joinChallenge.' };
    }
    try {
      const patchBody = {
        "pokemon_Player2@odata.bind": `/contacts(${challengerId})`,
        "pokemon_Player2Pokemon@odata.bind": `/pokemon_pokedexes(${pokemonId})`,
        statuscode: 895550002 // Hardcoded to correct Dataverse value for 'Battle Started'
      };
      console.log('PATCH joinChallenge body:', patchBody);
      const response = await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      });

      if (response.ok) {
        // Wait for Dataverse to persist the update
        const ready = await this.waitForBattleUpdate(battleId, challengerId, pokemonId);
        if (!ready) {
          return { success: false, error: 'Timed out waiting for battle update in Dataverse.' };
        }
        // Trigger battle simulation and wait for result to be written
        await this.simulateBattleWithRealData(battleId);
        // Wait for the battle result to be available in Dataverse
        const resultReady = await this.waitForBattleResult(battleId);
        if (!resultReady) {
          return { success: false, error: 'Timed out waiting for battle result in Dataverse.' };
        }
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

  // Start a battle (join and set status to BATTLE_STARTED)
  static async startBattle(
    battleId: string, 
    challengerId: string, 
    pokemonId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Validate input
    if (!challengerId || !pokemonId) {
      return { success: false, error: 'Missing challengerId or pokemonId for startBattle.' };
    }
    try {
      // Log the IDs before making the request
      console.log('startBattle - battleId:', battleId);
      console.log('startBattle - challengerId (Contact):', challengerId);
      console.log('startBattle - pokemonId:', pokemonId);
      const patchBody = {
        "pokemon_Player2@odata.bind": `/contacts(${challengerId})`,
        "pokemon_Player2Pokemon@odata.bind": `/pokemon_pokedexes(${pokemonId})`,
        statuscode: 895550002 // Hardcoded to correct Dataverse value for 'Battle Started'
      };
      // Log the PATCH body before sending
      console.log('PATCH startBattle body:', JSON.stringify(patchBody));
      const response = await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      });

      if (!response.ok) {
        return { success: false, error: `Failed to start battle: ${response.statusText}` };
      }

      // Wait for Dataverse to persist the update
      const ready = await this.waitForBattleUpdate(battleId, challengerId, pokemonId);
      if (!ready) {
        return { success: false, error: 'Timed out waiting for battle update in Dataverse.' };
      }
      // Simulate battle and wait for result to be written
      await this.simulateBattleWithRealData(battleId);
      // Wait for the battle result to be available in Dataverse
      const resultReady = await this.waitForBattleResult(battleId);
      if (!resultReady) {
        return { success: false, error: 'Timed out waiting for battle result in Dataverse.' };
      }
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Error starting battle: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Get battle result for viewing - now returns CompleteBattleData
  static async getBattleResult(battleId: string): Promise<CompleteBattleData | null> {
    try {
      console.log(`🔍 Fetching battle result for ID: ${battleId}`);
      const response = await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`);
      
      if (response.ok) {
        const battle = await response.json();
        console.log(`📊 Battle record retrieved:`, battle);
        console.log(`📄 Battle result field:`, battle.pokemon_battleresultjson ? 'Present' : 'Missing');
        
        if (battle.pokemon_battleresultjson) {
          try {
            const parsedResult = JSON.parse(battle.pokemon_battleresultjson);
            console.log(`✅ Successfully parsed battle result:`, parsedResult);
            return parsedResult;
          } catch (parseError) {
            console.error(`❌ Failed to parse battle result JSON:`, parseError);
            console.error(`📄 Raw JSON:`, battle.pokemon_battleresultjson);
            return null;
          }
        } else {
          console.log(`ℹ️ No battle result found - battle may not be completed yet`);
        }
      } else {
        console.error(`❌ Failed to fetch battle record:`, response.status, response.statusText);
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

  // Simulate battle with real Pokemon data from Dataverse
  private static async simulateBattleWithRealData(battleId: string): Promise<void> {
    try {
      console.log(`🎮 Starting battle simulation for battle ID: ${battleId}`);
      
      // Get battle details with expanded Pokemon and trainer data
      const battleResponse = await fetch(
        `${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})?$expand=pokemon_Player1($select=firstname),pokemon_Player1Pokemon($expand=pokemon_Pokemon($select=pokemon_name,pokemon_id)),pokemon_Player2($select=firstname),pokemon_Player2Pokemon($expand=pokemon_Pokemon($select=pokemon_name,pokemon_id))`
      );
      
      if (!battleResponse.ok) {
        console.error('Failed to fetch battle details for simulation');
        return;
      }
      
      const battle = await battleResponse.json();
      console.log('Battle data for simulation:', battle);
      
      // Extract trainer information
      const player1 = {
        id: battle._pokemon_player1_value || 'player1',
        name: battle.pokemon_Player1?.firstname || 'Trainer 1'
      };
      
      const player2 = {
        id: battle._pokemon_player2_value || 'player2', 
        name: battle.pokemon_Player2?.firstname || 'Trainer 2'
      };
      
      // Get Pokemon details from Pokedex entries
      const pokemon1Data = await this.fetchPokemonDetails(battle._pokemon_player1pokemon_value);
      const pokemon2Data = await this.fetchPokemonDetails(battle._pokemon_player2pokemon_value);
      
      if (!pokemon1Data || !pokemon2Data) {
        console.error('Failed to fetch Pokemon details for battle simulation');
        return;
      }
      
      console.log(`⚔️ Battle: ${player1.name}'s ${pokemon1Data.name} vs ${player2.name}'s ${pokemon2Data.name}`);
      
      // Simulate the battle using the advanced simulation service
      const battleData = await BattleSimulationService.simulateBattle(
        player1,
        player2,
        pokemon1Data,
        pokemon2Data,
        'casual'
      );
      
      console.log(`🏆 Battle result: ${battleData.final_result.winner_name} wins!`);
      
      // Store the complete battle result in the pokemon_battleresultjson field (correct field name, no modifiedon)
      const patchResultBody = {
        pokemon_battleresultjson: JSON.stringify(battleData),
        statuscode: 895550001 // Battle Completed
      };
      const patchUrl = `${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`;
      console.log('PATCH battle result URL:', patchUrl);
      console.log('PATCH battle result body:', patchResultBody);
      const patchResultResponse = await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchResultBody)
      });
      if (!patchResultResponse.ok) {
        const errorText = await patchResultResponse.text();
        console.error('❌ Failed to PATCH battle result:', patchResultResponse.status, patchResultResponse.statusText, errorText);
      } else {
        console.log(`✅ Battle simulation complete and saved to database`);
      }
      
    } catch (error) {
      console.error('Error in battle simulation:', error);
    }
  }

  // Fetch detailed Pokemon data from Pokedex entry
  private static async fetchPokemonDetails(pokedexEntryId: string): Promise<BattlePokemon | null> {
    try {
      const response = await fetch(
        `${this.API_BASE}/pokemon_pokedexes(${pokedexEntryId})?$expand=pokemon_Pokemon($select=pokemon_name,pokemon_id)`
      );
      
      if (!response.ok) return null;
      
      const pokedexEntry = await response.json();
      const pokemon = pokedexEntry.pokemon_Pokemon;
      
      if (!pokemon) return null;
      
      // Convert to BattlePokemon format with realistic stats based on level
      const level = pokedexEntry.pokemon_level || 5;
      const baseHp = Math.floor(50 + (level * 2.5));
      
      return {
        id: pokedexEntry.pokemon_pokedexid,
        pokemon_id: pokemon.pokemon_id || 1,
        name: pokedexEntry.pokemon_nickname || pokemon.pokemon_name || 'Unknown',
        level: level,
        hp: pokedexEntry.pokemon_current_hp || baseHp,
        max_hp: pokedexEntry.pokemon_max_hp || baseHp,
        attack: 30 + Math.floor(level * 1.5),
        defense: 25 + Math.floor(level * 1.2),
        speed: 20 + Math.floor(level * 1.8),
        types: this.getPokemonTypes(pokemon.pokemon_name || 'unknown'),
        sprite_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemon_id || 1}.png`,
        moves: []
      };
    } catch (error) {
      console.error('Error fetching Pokemon details:', error);
      return null;
    }
  }

  // Get Pokemon types based on name (in a real app, this would be from a database)
  private static getPokemonTypes(pokemonName: string): string[] {
    const typeMap: { [key: string]: string[] } = {
      'bulbasaur': ['grass', 'poison'],
      'ivysaur': ['grass', 'poison'],
      'venusaur': ['grass', 'poison'],
      'charmander': ['fire'],
      'charmeleon': ['fire'],
      'charizard': ['fire', 'flying'],
      'squirtle': ['water'],
      'wartortle': ['water'],
      'blastoise': ['water'],
      'pikachu': ['electric'],
      'raichu': ['electric'],
      'alakazam': ['psychic'],
      'machamp': ['fighting'],
      'gengar': ['ghost', 'poison'],
      'dragonite': ['dragon', 'flying'],
      'mewtwo': ['psychic'],
      'mew': ['psychic']
    };
    
    return typeMap[pokemonName.toLowerCase()] || ['normal'];
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

  // Wait for Dataverse to persist player2 and their Pokemon before simulating battle
  private static async waitForBattleUpdate(battleId: string, challengerId: string, pokemonId: string, maxAttempts = 10, delayMs = 800): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`);
        if (response.ok) {
          const battle = await response.json();
          if (
            battle._pokemon_player2_value === challengerId &&
            battle._pokemon_player2pokemon_value === pokemonId
          ) {
            return true;
          }
        }
      } catch (e) {
        // Ignore and retry
      }
      await new Promise(res => setTimeout(res, delayMs));
    }
    return false;
  }

  // Wait for battle record to have both player2 and their Pokemon (polling)
  private static async waitForBattlePlayers(battleId: string, requiredPlayers: number, timeoutMs: number = 10000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const response = await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`);
        if (response.ok) {
          const battle = await response.json();
          const hasPlayer2 = !!battle._pokemon_player2_value && !!battle._pokemon_player2pokemon_value;
          if (requiredPlayers === 2 && hasPlayer2) return true;
          if (requiredPlayers === 1) return true; // For future use
        }
      } catch {}
      await new Promise(res => setTimeout(res, 400)); // Wait 400ms before retry
    }
    return false;
  }

  // Wait for battle result to be available in Dataverse
  private static async waitForBattleResult(battleId: string, maxAttempts = 20, delayMs = 800): Promise<boolean> {
    console.log(`⏳ Waiting for battle result to be saved for battle ID: ${battleId}`);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.API_BASE}/${PokemonBattleSchema.tableName}(${battleId})`);
        if (response.ok) {
          const battle = await response.json();
          if (battle.pokemon_battleresultjson) {
            console.log(`✅ Battle result found after ${attempt + 1} attempts`);
            return true;
          } else {
            console.log(`⏳ Attempt ${attempt + 1}/${maxAttempts}: Battle result not yet available`);
          }
        }
      } catch (e) {
        console.log(`⚠️ Attempt ${attempt + 1}/${maxAttempts}: Error checking for battle result:`, e);
      }
      await new Promise(res => setTimeout(res, delayMs));
    }
    console.log(`❌ Timed out waiting for battle result after ${maxAttempts} attempts`);
    return false;
  }
}
