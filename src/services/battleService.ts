// Battle service for Pokemon game

export interface BattlePokemon {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  types: string[];
  sprite: string;
  moves: string[];
}

export interface BattleResult {
  winner: 'player' | 'opponent';
  experience: number;
  levelUp?: boolean;
  newLevel?: number;
}

export class BattleService {
  // Calculate damage based on Pokemon stats
  static calculateDamage(attacker: BattlePokemon, defender: BattlePokemon, move: string): number {
    const baseDamage = Math.floor(attacker.attack * 0.4);
    const defense = defender.defense * 0.3;
    const randomFactor = Math.random() * 0.3 + 0.85; // 85% - 115%
    
    const damage = Math.max(1, Math.floor((baseDamage - defense) * randomFactor));
    return damage;
  }

  // Execute a battle turn
  static executeTurn(playerPokemon: BattlePokemon, opponentPokemon: BattlePokemon, playerMove: string): {
    playerDamage: number;
    opponentDamage: number;
    battleLog: string[];
  } {
    const log: string[] = [];
    let playerDamage = 0;
    let opponentDamage = 0;

    // Determine turn order based on speed
    const playerFirst = playerPokemon.speed >= opponentPokemon.speed;

    if (playerFirst) {
      // Player attacks first
      playerDamage = this.calculateDamage(playerPokemon, opponentPokemon, playerMove);
      log.push(`${playerPokemon.name} used ${playerMove} and dealt ${playerDamage} damage!`);
      
      // Check if opponent fainted
      if (opponentPokemon.hp - playerDamage > 0) {
        // Opponent counter-attacks
        const opponentMove = opponentPokemon.moves[Math.floor(Math.random() * opponentPokemon.moves.length)];
        opponentDamage = this.calculateDamage(opponentPokemon, playerPokemon, opponentMove);
        log.push(`${opponentPokemon.name} used ${opponentMove} and dealt ${opponentDamage} damage!`);
      }
    } else {
      // Opponent attacks first
      const opponentMove = opponentPokemon.moves[Math.floor(Math.random() * opponentPokemon.moves.length)];
      opponentDamage = this.calculateDamage(opponentPokemon, playerPokemon, opponentMove);
      log.push(`${opponentPokemon.name} used ${opponentMove} and dealt ${opponentDamage} damage!`);
      
      // Check if player fainted
      if (playerPokemon.hp - opponentDamage > 0) {
        // Player counter-attacks
        playerDamage = this.calculateDamage(playerPokemon, opponentPokemon, playerMove);
        log.push(`${playerPokemon.name} used ${playerMove} and dealt ${playerDamage} damage!`);
      }
    }

    return { playerDamage, opponentDamage, battleLog: log };
  }

  // Calculate experience gained from battle
  static calculateExperience(playerLevel: number, opponentLevel: number, isWinner: boolean): number {
    const baseExp = 50;
    const levelMultiplier = opponentLevel / playerLevel;
    const winMultiplier = isWinner ? 1.5 : 0.5;
    
    return Math.floor(baseExp * levelMultiplier * winMultiplier);
  }

  // Check if Pokemon should level up
  static checkLevelUp(currentLevel: number, experience: number): { levelUp: boolean; newLevel: number } {
    const experienceNeeded = currentLevel * 100; // Simple formula
    if (experience >= experienceNeeded) {
      return { levelUp: true, newLevel: currentLevel + 1 };
    }
    return { levelUp: false, newLevel: currentLevel };
  }

  // Generate wild Pokemon opponents
  static generateWildPokemon(playerLevel: number): BattlePokemon[] {
    const wildPokemon = [
      {
        id: '25',
        name: 'Wild Pikachu',
        types: ['electric'],
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
        moves: ['Thunderbolt', 'Quick Attack', 'Tail Whip', 'Thunder Wave']
      },
      {
        id: '4',
        name: 'Wild Charmander',
        types: ['fire'],
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
        moves: ['Ember', 'Scratch', 'Growl', 'Smokescreen']
      },
      {
        id: '1',
        name: 'Wild Bulbasaur',
        types: ['grass', 'poison'],
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
        moves: ['Vine Whip', 'Tackle', 'Growl', 'Leech Seed']
      },
      {
        id: '7',
        name: 'Wild Squirtle',
        types: ['water'],
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
        moves: ['Water Gun', 'Tackle', 'Tail Whip', 'Withdraw']
      }
    ];

    return wildPokemon.map(pokemon => {
      const level = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1); // ±1 level from player
      const baseStats = {
        hp: 30 + level * 2,
        attack: 20 + level * 1.5,
        defense: 20 + level * 1.2,
        speed: 25 + level * 1.3
      };

      return {
        ...pokemon,
        level,
        hp: baseStats.hp,
        maxHp: baseStats.hp,
        attack: Math.floor(baseStats.attack),
        defense: Math.floor(baseStats.defense),
        speed: Math.floor(baseStats.speed)
      };
    });
  }
}
