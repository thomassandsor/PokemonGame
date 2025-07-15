// Pokemon Battle Service - Core battle mechanics and calculations
class BattleService {
    static baseUrl = 'https://pokemongame-functions-2025.azurewebsites.net/api/dataverse';
    
    // Default moves for Pokemon without specific movesets
    static DEFAULT_MOVES = [
        { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'A physical attack in which the user charges and slams into the target.' },
        { name: 'Scratch', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'Hard, pointed, sharp claws rake the target to inflict damage.' },
        { name: 'Quick Attack', type: 'normal', power: 40, accuracy: 100, pp: 30, description: 'The user lunges at the target at a speed that makes it almost invisible.' },
        { name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, description: 'The target is attacked with small flames.' },
        { name: 'Water Gun', type: 'water', power: 40, accuracy: 100, pp: 25, description: 'The target is blasted with a forceful shot of water.' },
        { name: 'Thunder Shock', type: 'electric', power: 40, accuracy: 100, pp: 30, description: 'A jolt of electricity crashes down on the target.' },
        { name: 'Vine Whip', type: 'grass', power: 45, accuracy: 100, pp: 25, description: 'The target is struck with slender, whiplike vines.' },
        { name: 'Gust', type: 'flying', power: 40, accuracy: 100, pp: 35, description: 'A gust of wind is whipped up by wings and launched at the target.' }
    ];

    // Type effectiveness chart
    static TYPE_EFFECTIVENESS = {
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
     * Calculate damage dealt in an attack
     */
    static calculateDamage(attacker, defender, move) {
        console.log('🎯 BATTLE-SERVICE: Calculating damage', { attacker: attacker.name, defender: defender.name, move: move.name });
        
        // Base damage calculation
        const level = attacker.level || 50;
        const attack = attacker.attack || 50;
        const defense = defender.defense || 50;
        const power = move.power || 40;
        
        // Critical hit calculation (6.25% chance)
        const isCritical = Math.random() < 0.0625;
        const criticalMultiplier = isCritical ? 1.5 : 1;
        
        // Type effectiveness
        const attackerTypes = Array.isArray(attacker.types) ? attacker.types : [attacker.types || 'normal'];
        const defenderTypes = Array.isArray(defender.types) ? defender.types : [defender.types || 'normal'];
        
        let stab = 1; // Same Type Attack Bonus
        if (attackerTypes.includes(move.type)) {
            stab = 1.5;
        }
        
        // Calculate type effectiveness
        let typeEffectiveness = 1;
        const moveType = move.type || 'normal';
        
        defenderTypes.forEach(defType => {
            if (this.TYPE_EFFECTIVENESS[moveType] && this.TYPE_EFFECTIVENESS[moveType][defType] !== undefined) {
                typeEffectiveness *= this.TYPE_EFFECTIVENESS[moveType][defType];
            }
        });
        
        // Random factor (0.85 to 1.0)
        const randomFactor = 0.85 + (Math.random() * 0.15);
        
        // Damage formula based on Pokemon games
        const baseDamage = ((((2 * level / 5 + 2) * power * attack / defense) / 50) + 2);
        const finalDamage = Math.floor(baseDamage * stab * typeEffectiveness * criticalMultiplier * randomFactor);
        
        // Ensure minimum 1 damage
        const damage = Math.max(1, finalDamage);
        
        console.log('🎯 BATTLE-SERVICE: Damage calculated', {
            baseDamage,
            finalDamage: damage,
            isCritical,
            stab,
            typeEffectiveness,
            effectiveness: this.getEffectivenessText(typeEffectiveness)
        });
        
        return {
            damage,
            isCritical,
            typeEffectiveness,
            effectiveness: this.getEffectivenessText(typeEffectiveness)
        };
    }

    /**
     * Get effectiveness text for UI display
     */
    static getEffectivenessText(multiplier) {
        if (multiplier === 0) return 'no_effect';
        if (multiplier < 1) return 'not_very_effective';
        if (multiplier > 1) return 'super_effective';
        return 'normal';
    }

    /**
     * Execute a single battle turn
     */
    static executeTurn(playerPokemon, opponentPokemon, playerMoveIndex = 0) {
        console.log('🎯 BATTLE-SERVICE: Executing turn', {
            player: playerPokemon.name,
            opponent: opponentPokemon.name
        });
        
        const battleLog = [];
        let playerDamageDealt = 0;
        let opponentDamageDealt = 0;
        
        // Get moves
        const playerMove = playerPokemon.moves && playerPokemon.moves[playerMoveIndex] 
            ? playerPokemon.moves[playerMoveIndex] 
            : this.DEFAULT_MOVES[0];
        
        const opponentMove = opponentPokemon.moves && opponentPokemon.moves.length > 0
            ? opponentPokemon.moves[Math.floor(Math.random() * opponentPokemon.moves.length)]
            : this.DEFAULT_MOVES[Math.floor(Math.random() * this.DEFAULT_MOVES.length)];
        
        // Determine turn order based on speed
        const playerSpeed = playerPokemon.speed || 50;
        const opponentSpeed = opponentPokemon.speed || 50;
        const playerFirst = playerSpeed >= opponentSpeed;
        
        if (playerFirst) {
            // Player attacks first
            const playerAttack = this.calculateDamage(playerPokemon, opponentPokemon, playerMove);
            playerDamageDealt = playerAttack.damage;
            
            let message = `${playerPokemon.name} used ${playerMove.name}!`;
            if (playerAttack.isCritical) message += ' Critical hit!';
            if (playerAttack.effectiveness !== 'normal') {
                message += ` It's ${playerAttack.effectiveness.replace('_', ' ')}!`;
            }
            battleLog.push(message);
            
            // Apply damage
            opponentPokemon.hp = Math.max(0, opponentPokemon.hp - playerDamageDealt);
            
            // Check if opponent fainted
            if (opponentPokemon.hp > 0) {
                // Opponent counter-attacks
                const opponentAttack = this.calculateDamage(opponentPokemon, playerPokemon, opponentMove);
                opponentDamageDealt = opponentAttack.damage;
                
                let opponentMessage = `${opponentPokemon.name} used ${opponentMove.name}!`;
                if (opponentAttack.isCritical) opponentMessage += ' Critical hit!';
                if (opponentAttack.effectiveness !== 'normal') {
                    opponentMessage += ` It's ${opponentAttack.effectiveness.replace('_', ' ')}!`;
                }
                battleLog.push(opponentMessage);
                
                // Apply damage
                playerPokemon.hp = Math.max(0, playerPokemon.hp - opponentDamageDealt);
            } else {
                battleLog.push(`${opponentPokemon.name} fainted!`);
            }
        } else {
            // Opponent attacks first
            const opponentAttack = this.calculateDamage(opponentPokemon, playerPokemon, opponentMove);
            opponentDamageDealt = opponentAttack.damage;
            
            let opponentMessage = `${opponentPokemon.name} used ${opponentMove.name}!`;
            if (opponentAttack.isCritical) opponentMessage += ' Critical hit!';
            if (opponentAttack.effectiveness !== 'normal') {
                opponentMessage += ` It's ${opponentAttack.effectiveness.replace('_', ' ')}!`;
            }
            battleLog.push(opponentMessage);
            
            // Apply damage
            playerPokemon.hp = Math.max(0, playerPokemon.hp - opponentDamageDealt);
            
            // Check if player fainted
            if (playerPokemon.hp > 0) {
                // Player counter-attacks
                const playerAttack = this.calculateDamage(playerPokemon, opponentPokemon, playerMove);
                playerDamageDealt = playerAttack.damage;
                
                let message = `${playerPokemon.name} used ${playerMove.name}!`;
                if (playerAttack.isCritical) message += ' Critical hit!';
                if (playerAttack.effectiveness !== 'normal') {
                    message += ` It's ${playerAttack.effectiveness.replace('_', ' ')}!`;
                }
                battleLog.push(message);
                
                // Apply damage
                opponentPokemon.hp = Math.max(0, opponentPokemon.hp - playerDamageDealt);
                
                if (opponentPokemon.hp <= 0) {
                    battleLog.push(`${opponentPokemon.name} fainted!`);
                }
            } else {
                battleLog.push(`${playerPokemon.name} fainted!`);
            }
        }
        
        return {
            playerDamageDealt,
            opponentDamageDealt,
            battleLog,
            playerMove: playerMove.name,
            opponentMove: opponentMove.name,
            playerFirst
        };
    }

    /**
     * Calculate experience gained from battle
     */
    static calculateExperience(playerLevel, opponentLevel, isWinner) {
        const baseExp = 50;
        const levelMultiplier = Math.max(0.5, opponentLevel / playerLevel);
        const winMultiplier = isWinner ? 1.5 : 0.5;
        
        return Math.floor(baseExp * levelMultiplier * winMultiplier);
    }

    /**
     * Check if Pokemon should level up
     */
    static checkLevelUp(currentLevel, experience) {
        const experienceNeeded = currentLevel * 100; // Simple formula
        if (experience >= experienceNeeded) {
            return { levelUp: true, newLevel: currentLevel + 1 };
        }
        return { levelUp: false, newLevel: currentLevel };
    }

    /**
     * Generate a wild Pokemon opponent for training battles
     */
    static generateWildPokemon(playerLevel = 5) {
        const wildPokemonTemplates = [
            { id: 25, name: 'Wild Pikachu', types: ['electric'], baseStats: { hp: 35, attack: 55, defense: 40, speed: 90 } },
            { id: 4, name: 'Wild Charmander', types: ['fire'], baseStats: { hp: 39, attack: 52, defense: 43, speed: 65 } },
            { id: 1, name: 'Wild Bulbasaur', types: ['grass', 'poison'], baseStats: { hp: 45, attack: 49, defense: 49, speed: 45 } },
            { id: 7, name: 'Wild Squirtle', types: ['water'], baseStats: { hp: 44, attack: 48, defense: 65, speed: 43 } },
            { id: 19, name: 'Wild Rattata', types: ['normal'], baseStats: { hp: 30, attack: 56, defense: 35, speed: 72 } },
            { id: 16, name: 'Wild Pidgey', types: ['normal', 'flying'], baseStats: { hp: 40, attack: 45, defense: 40, speed: 56 } }
        ];

        const template = wildPokemonTemplates[Math.floor(Math.random() * wildPokemonTemplates.length)];
        const level = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1); // ±1 level from player
        
        // Calculate stats based on level
        const hp = Math.floor(template.baseStats.hp + (level * 2));
        const attack = Math.floor(template.baseStats.attack + (level * 1.5));
        const defense = Math.floor(template.baseStats.defense + (level * 1.2));
        const speed = Math.floor(template.baseStats.speed + (level * 1.3));
        
        // Assign moves based on type
        const moves = this.getMovesForTypes(template.types);
        
        return {
            id: template.id.toString(),
            pokemon_id: template.id,
            name: template.name,
            level,
            hp,
            max_hp: hp,
            attack,
            defense,
            speed,
            types: template.types,
            sprite_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${template.id}.png`,
            moves: moves.slice(0, 4) // Limit to 4 moves
        };
    }

    /**
     * Get appropriate moves for Pokemon types
     */
    static getMovesForTypes(types) {
        const typeBasedMoves = {
            fire: [
                { name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, description: 'The target is attacked with small flames.' },
                { name: 'Flame Wheel', type: 'fire', power: 60, accuracy: 100, pp: 25, description: 'The user cloaks itself in fire and charges at the target.' }
            ],
            water: [
                { name: 'Water Gun', type: 'water', power: 40, accuracy: 100, pp: 25, description: 'The target is blasted with a forceful shot of water.' },
                { name: 'Bubble Beam', type: 'water', power: 65, accuracy: 100, pp: 20, description: 'A spray of bubbles is forcefully ejected at the target.' }
            ],
            electric: [
                { name: 'Thunder Shock', type: 'electric', power: 40, accuracy: 100, pp: 30, description: 'A jolt of electricity crashes down on the target.' },
                { name: 'Thunderbolt', type: 'electric', power: 90, accuracy: 100, pp: 15, description: 'A strong electric blast crashes down on the target.' }
            ],
            grass: [
                { name: 'Vine Whip', type: 'grass', power: 45, accuracy: 100, pp: 25, description: 'The target is struck with slender, whiplike vines.' },
                { name: 'Razor Leaf', type: 'grass', power: 55, accuracy: 95, pp: 25, description: 'Sharp-edged leaves are launched to slash at the target.' }
            ],
            normal: [
                { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'A physical attack in which the user charges and slams into the target.' },
                { name: 'Quick Attack', type: 'normal', power: 40, accuracy: 100, pp: 30, description: 'The user lunges at the target at a speed that makes it almost invisible.' }
            ],
            flying: [
                { name: 'Gust', type: 'flying', power: 40, accuracy: 100, pp: 35, description: 'A gust of wind is whipped up by wings and launched at the target.' },
                { name: 'Wing Attack', type: 'flying', power: 60, accuracy: 100, pp: 35, description: 'The target is struck with large, imposing wings spread wide.' }
            ],
            poison: [
                { name: 'Poison Sting', type: 'poison', power: 15, accuracy: 100, pp: 35, description: 'The user stabs the target with a poisonous stinger.' },
                { name: 'Sludge Bomb', type: 'poison', power: 90, accuracy: 100, pp: 10, description: 'Unsanitary sludge is hurled at the target.' }
            ]
        };

        let moves = [];
        
        // Add type-based moves
        types.forEach(type => {
            if (typeBasedMoves[type]) {
                moves = moves.concat(typeBasedMoves[type]);
            }
        });
        
        // Add some normal moves if needed
        if (moves.length < 2) {
            moves = moves.concat(typeBasedMoves.normal);
        }
        
        // Add default moves if still not enough
        if (moves.length < 2) {
            moves = moves.concat(this.DEFAULT_MOVES);
        }
        
        return moves;
    }

    /**
     * Prepare a caught Pokemon for battle (add stats if missing)
     */
    static preparePokemonForBattle(caughtPokemon) {
        const pokemon = { ...caughtPokemon };
        
        // Ensure required stats exist
        pokemon.level = pokemon.pokemon_level || pokemon.level || 5;
        pokemon.hp = pokemon.pokemon_current_hp || pokemon.pokemon_max_hp || pokemon.hp || (30 + pokemon.level * 2);
        pokemon.max_hp = pokemon.pokemon_max_hp || pokemon.max_hp || pokemon.hp;
        pokemon.attack = pokemon.pokemon_attack || pokemon.attack || (20 + pokemon.level * 1.5);
        pokemon.defense = pokemon.pokemon_defense || pokemon.defense || (20 + pokemon.level * 1.2);
        pokemon.speed = pokemon.pokemon_speed || pokemon.speed || (25 + pokemon.level * 1.3);
        
        // Ensure name and types
        pokemon.name = pokemon.pokemon_nickname || pokemon.pokemon_Pokemon?.pokemon_name || pokemon.name || 'Unknown Pokemon';
        pokemon.pokemon_id = pokemon.pokemon_Pokemon?.pokemon_id || pokemon.pokemon_id || 1;
        pokemon.types = pokemon.pokemon_types || pokemon.types || ['normal'];
        
        // Ensure moves exist
        if (!pokemon.moves || pokemon.moves.length === 0) {
            pokemon.moves = this.getMovesForTypes(pokemon.types).slice(0, 4);
        }
        
        return pokemon;
    }
}
