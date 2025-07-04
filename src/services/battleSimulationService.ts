// Battle Simulation Service - Handles async Pokemon battles
import { 
  CompleteBattleData, 
  BattlePokemon, 
  BattleTurn, 
  BattleAction, 
  TurnResult, 
  BattlefieldState, 
  BattleResult,
  BattleMetadata,
  BattleMove
} from '../types/battleTypes';

export class BattleSimulationService {
  private static readonly DEFAULT_MOVES: BattleMove[] = [
    { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'A physical attack in which the user charges and slams into the target.' },
    { name: 'Scratch', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'Hard, pointed, sharp claws rake the target to inflict damage.' },
    { name: 'Quick Attack', type: 'normal', power: 40, accuracy: 100, pp: 30, description: 'The user lunges at the target at a speed that makes it almost invisible.' },
    { name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, description: 'The target is attacked with small flames.' },
    { name: 'Water Gun', type: 'water', power: 40, accuracy: 100, pp: 25, description: 'The target is blasted with a forceful shot of water.' },
    { name: 'Thunder Shock', type: 'electric', power: 40, accuracy: 100, pp: 30, description: 'A jolt of electricity crashes down on the target.' },
    { name: 'Vine Whip', type: 'grass', power: 45, accuracy: 100, pp: 25, description: 'The target is struck with slender, whiplike vines.' },
    { name: 'Gust', type: 'flying', power: 40, accuracy: 100, pp: 35, description: 'A gust of wind is whipped up by wings and launched at the target.' }
  ];

  private static readonly TYPE_EFFECTIVENESS: { [key: string]: { [key: string]: number } } = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, ice: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, water: 0.5, grass: 0.5, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, grass: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
  };

  /**
   * Simulates a complete Pokemon battle between two players
   */
  public static async simulateBattle(
    player1: { id: string, name: string },
    player2: { id: string, name: string },
    pokemon1: BattlePokemon,
    pokemon2: BattlePokemon,
    battleType: 'ranked' | 'casual' | 'training' = 'casual'
  ): Promise<CompleteBattleData> {
    
    const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date().toISOString();
    
    // Initialize battle metadata
    const metadata: BattleMetadata = {
      battle_id: battleId,
      player1_id: player1.id,
      player1_name: player1.name,
      player2_id: player2.id,
      player2_name: player2.name,
      battle_type: battleType,
      battle_format: 'single',
      battle_rules: {
        level_cap: 100,
        timer_per_turn: 30,
        items_allowed: false,
        switching_allowed: false
      },
      started_at: startTime
    };

    // Prepare Pokemon for battle
    const battlePokemon1 = this.preparePokemonForBattle(pokemon1);
    const battlePokemon2 = this.preparePokemonForBattle(pokemon2);
    
    // Initialize battle state
    let currentP1 = { ...battlePokemon1 };
    let currentP2 = { ...battlePokemon2 };
    
    const battleTurns: BattleTurn[] = [];
    const battleLog: string[] = [];
    let turnNumber = 1;
    let battleEnded = false;
    let winner: 'player1' | 'player2' | 'draw' = 'draw';
    
    battleLog.push(`⚔️ Battle begins between ${player1.name}'s ${currentP1.name} and ${player2.name}'s ${currentP2.name}!`);
    
    // Battle simulation loop
    while (!battleEnded && turnNumber <= 50) { // Max 50 turns to prevent infinite battles
      const turn = await this.simulateTurn(
        turnNumber,
        currentP1,
        currentP2,
        player1.name,
        player2.name
      );
      
      battleTurns.push(turn);
      
      // Update Pokemon HP based on turn results
      currentP1.hp = turn.turn_result.player1_pokemon_hp;
      currentP2.hp = turn.turn_result.player2_pokemon_hp;
      
      // Add turn log entries
      battleLog.push(`--- Turn ${turnNumber} ---`);
      battleLog.push(turn.player1_action.action_description);
      battleLog.push(turn.player2_action.action_description);
      battleLog.push(turn.turn_result.turn_summary);
      
      // Check if battle should end
      if (turn.turn_result.player1_pokemon_fainted && turn.turn_result.player2_pokemon_fainted) {
        winner = 'draw';
        battleEnded = true;
        battleLog.push('💥 Both Pokemon fainted! It\'s a draw!');
      } else if (turn.turn_result.player1_pokemon_fainted) {
        winner = 'player2';
        battleEnded = true;
        battleLog.push(`🏆 ${player2.name}'s ${currentP2.name} wins the battle!`);
      } else if (turn.turn_result.player2_pokemon_fainted) {
        winner = 'player1';
        battleEnded = true;
        battleLog.push(`🏆 ${player1.name}'s ${currentP1.name} wins the battle!`);
      }
      
      turnNumber++;
    }
    
    // If battle didn't end naturally, determine winner by remaining HP
    if (!battleEnded) {
      battleLog.push('⏰ Battle reached turn limit!');
      if (currentP1.hp > currentP2.hp) {
        winner = 'player1';
        battleLog.push(`🏆 ${player1.name} wins by having more HP remaining!`);
      } else if (currentP2.hp > currentP1.hp) {
        winner = 'player2';
        battleLog.push(`🏆 ${player2.name} wins by having more HP remaining!`);
      } else {
        winner = 'draw';
        battleLog.push('🤝 It\'s a draw! Both Pokemon have equal HP.');
      }
    }
    
    const endTime = new Date().toISOString();
    const duration = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
    
    // Calculate battle result
    const finalResult: BattleResult = {
      winner,
      winner_name: winner === 'player1' ? player1.name : winner === 'player2' ? player2.name : 'Draw',
      loser_name: winner === 'player1' ? player2.name : winner === 'player2' ? player1.name : 'Draw',
      victory_condition: battleEnded ? 'all_pokemon_fainted' : 'timeout',
      final_scores: {
        player1_pokemon_remaining: currentP1.hp > 0 ? 1 : 0,
        player2_pokemon_remaining: currentP2.hp > 0 ? 1 : 0,
        player1_total_damage_dealt: battlePokemon2.hp - currentP2.hp,
        player2_total_damage_dealt: battlePokemon1.hp - currentP1.hp
      },
      battle_summary: `${winner === 'player1' ? player1.name : winner === 'player2' ? player2.name : 'Both trainers'} emerged victorious after ${turnNumber - 1} intense turns!`,
      rewards: {
        experience_gained: Math.floor(Math.random() * 100) + 50,
        items_earned: [],
        achievements_unlocked: []
      }
    };
    
    // Build complete battle data
    const completeBattleData: CompleteBattleData = {
      metadata: {
        ...metadata,
        completed_at: endTime,
        duration_seconds: duration
      },
      pokemon_teams: {
        player1_team: [battlePokemon1],
        player2_team: [battlePokemon2]
      },
      battle_turns: battleTurns,
      final_result: finalResult,
      battle_log: battleLog,
      replay_data: {
        version: '1.0',
        compressed: false,
        animation_timings: battleTurns.map(() => 1500), // 1.5 seconds per turn
        special_effects: []
      }
    };
    
    return completeBattleData;
  }

  /**
   * Simulates a single turn of battle
   */
  private static async simulateTurn(
    turnNumber: number,
    pokemon1: BattlePokemon,
    pokemon2: BattlePokemon,
    player1Name: string,
    player2Name: string
  ): Promise<BattleTurn> {
    
    const timestamp = new Date().toISOString();
    
    // Determine turn order based on speed
    const p1Speed = pokemon1.speed + Math.random() * 10; // Add some randomness
    const p2Speed = pokemon2.speed + Math.random() * 10;
    
    let firstPokemon = p1Speed >= p2Speed ? pokemon1 : pokemon2;
    let secondPokemon = p1Speed >= p2Speed ? pokemon2 : pokemon1;
    let firstPlayer = p1Speed >= p2Speed ? player1Name : player2Name;
    let secondPlayer = p1Speed >= p2Speed ? player2Name : player1Name;
    let firstIsP1 = p1Speed >= p2Speed;
    
    // Simulate actions for both Pokemon
    const firstAction = this.simulateAction(firstPokemon, secondPokemon, firstPlayer);
    const secondAction = this.simulateAction(secondPokemon, firstPokemon, secondPlayer);
    
    // Apply damage and effects
    let p1HP = pokemon1.hp;
    let p2HP = pokemon2.hp;
    
    // First pokemon attacks
    if (firstAction.type === 'attack' && firstAction.damage_dealt) {
      if (firstIsP1) {
        p2HP = Math.max(0, p2HP - firstAction.damage_dealt);
      } else {
        p1HP = Math.max(0, p1HP - firstAction.damage_dealt);
      }
    }
    
    // Second pokemon attacks (if still alive)
    if (secondAction.type === 'attack' && secondAction.damage_dealt && 
        ((firstIsP1 && p2HP > 0) || (!firstIsP1 && p1HP > 0))) {
      if (firstIsP1) {
        p1HP = Math.max(0, p1HP - secondAction.damage_dealt);
      } else {
        p2HP = Math.max(0, p2HP - secondAction.damage_dealt);
      }
    }
    
    // Create turn result
    const turnResult: TurnResult = {
      player1_pokemon_hp: p1HP,
      player2_pokemon_hp: p2HP,
      player1_pokemon_fainted: p1HP <= 0,
      player2_pokemon_fainted: p2HP <= 0,
      turn_summary: this.generateTurnSummary(firstAction, secondAction, firstPlayer, secondPlayer, p1HP, p2HP)
    };
    
    // Create battlefield state
    const battlefieldState: BattlefieldState = {
      player1_active_pokemon: { ...pokemon1, hp: p1HP },
      player2_active_pokemon: { ...pokemon2, hp: p2HP }
    };
    
    return {
      turn_number: turnNumber,
      timestamp,
      player1_action: firstIsP1 ? firstAction : secondAction,
      player2_action: firstIsP1 ? secondAction : firstAction,
      turn_result: turnResult,
      battlefield_state: battlefieldState
    };
  }

  /**
   * Simulates an action for a Pokemon
   */
  private static simulateAction(attacker: BattlePokemon, defender: BattlePokemon, playerName: string): BattleAction {
    // For now, always attack with a random move
    const availableMoves = attacker.moves || this.getRandomMoves(attacker.types[0] || 'normal');
    const selectedMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
    
    // Calculate damage
    const baseDamage = selectedMove.power || 40;
    const attackStat = attacker.attack;
    const defenseStat = defender.defense;
    const level = attacker.level;
    
    // Pokemon damage formula (simplified)
    const levelMultiplier = (2 * level + 10) / 250;
    const attackDefenseRatio = attackStat / defenseStat;
    const damage = Math.floor((levelMultiplier * attackDefenseRatio * baseDamage + 2) * (Math.random() * 0.15 + 0.85));
    
    // Type effectiveness
    const effectiveness = this.getTypeEffectiveness(selectedMove.type, defender.types[0] || 'normal');
    const finalDamage = Math.floor(damage * effectiveness);
    
    // Critical hit chance (6.25%)
    const criticalHit = Math.random() < 0.0625;
    const actualDamage = criticalHit ? Math.floor(finalDamage * 1.5) : finalDamage;
    
    let effectivenessText = '';
    if (effectiveness > 1) effectivenessText = ' It\'s super effective!';
    else if (effectiveness < 1 && effectiveness > 0) effectivenessText = ' It\'s not very effective...';
    else if (effectiveness === 0) effectivenessText = ' It has no effect!';
    
    const critText = criticalHit ? ' Critical hit!' : '';
    
    return {
      type: 'attack',
      move_used: selectedMove.name,
      target: 'opponent',
      damage_dealt: Math.min(actualDamage, defender.hp), // Don't deal more damage than remaining HP
      effectiveness: effectiveness > 1 ? 'super_effective' : effectiveness < 1 ? 'not_very_effective' : 'normal',
      critical_hit: criticalHit,
      action_success: true,
      action_description: `${playerName}'s ${attacker.name} used ${selectedMove.name}!${effectivenessText}${critText} Dealt ${Math.min(actualDamage, defender.hp)} damage.`
    };
  }

  /**
   * Get type effectiveness multiplier
   */
  private static getTypeEffectiveness(attackType: string, defenseType: string): number {
    const typeChart = this.TYPE_EFFECTIVENESS[attackType.toLowerCase()];
    if (!typeChart) return 1;
    return typeChart[defenseType.toLowerCase()] || 1;
  }

  /**
   * Generate turn summary
   */
  private static generateTurnSummary(
    action1: BattleAction, 
    action2: BattleAction, 
    player1: string, 
    player2: string,
    p1HP: number,
    p2HP: number
  ): string {
    let summary = '';
    
    if (p1HP <= 0 && p2HP <= 0) {
      summary = 'Both Pokemon fainted simultaneously!';
    } else if (p1HP <= 0) {
      summary = `${player1}'s Pokemon fainted!`;
    } else if (p2HP <= 0) {
      summary = `${player2}'s Pokemon fainted!`;
    } else {
      summary = `Both Pokemon are still fighting! ${player1}: ${p1HP} HP, ${player2}: ${p2HP} HP`;
    }
    
    return summary;
  }

  /**
   * Prepare a Pokemon for battle by ensuring it has moves and proper stats
   */
  private static preparePokemonForBattle(pokemon: BattlePokemon): BattlePokemon {
    const battlePokemon = { ...pokemon };
    
    // Ensure Pokemon has moves
    if (!battlePokemon.moves || battlePokemon.moves.length === 0) {
      battlePokemon.moves = this.getRandomMoves(battlePokemon.types[0] || 'normal');
    }
    
    // Ensure Pokemon has proper stats
    if (!battlePokemon.attack) battlePokemon.attack = 30 + Math.floor(Math.random() * 20);
    if (!battlePokemon.defense) battlePokemon.defense = 25 + Math.floor(Math.random() * 20);
    if (!battlePokemon.speed) battlePokemon.speed = 20 + Math.floor(Math.random() * 20);
    
    return battlePokemon;
  }

  /**
   * Get random moves based on Pokemon type
   */
  private static getRandomMoves(primaryType: string): BattleMove[] {
    const typeMoves = this.DEFAULT_MOVES.filter(move => move.type === primaryType);
    const normalMoves = this.DEFAULT_MOVES.filter(move => move.type === 'normal');
    
    // Get 2 type moves and 2 normal moves, or 4 normal moves if no type moves available
    const moves: BattleMove[] = [];
    
    if (typeMoves.length > 0) {
      moves.push(...typeMoves.slice(0, 2));
      moves.push(...normalMoves.slice(0, 2));
    } else {
      moves.push(...normalMoves.slice(0, 4));
    }
    
    return moves;
  }
}
