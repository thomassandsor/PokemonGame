// Battle Simulation Service - Creates turn-by-turn battle JSON structure
class BattleSimulationService {
    
    /**
     * Generate a complete battle simulation with turn-by-turn data
     * @param {Object} player1 - Player 1 info
     * @param {Object} player2 - Player 2 info  
     * @param {Object} pokemon1 - Player 1's Pokemon
     * @param {Object} pokemon2 - Player 2's Pokemon
     * @param {number} maxTurns - Maximum number of turns (default 20)
     * @returns {Promise<Object>} Complete battle data with turns
     */
    static async simulateComplexBattle(player1, player2, pokemon1, pokemon2, maxTurns = 20) {
        console.log('🎮 Starting complex battle simulation...');
        
        const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = new Date().toISOString();
        
        // Initialize battle metadata
        const metadata = {
            battle_id: battleId,
            player1_id: player1.id,
            player1_name: player1.name,
            player2_id: player2.id,
            player2_name: player2.name,
            battle_type: 'casual',
            battle_format: 'single',
            battle_rules: {
                level_cap: 100,
                timer_per_turn: 30,
                items_allowed: false,
                switching_allowed: false
            },
            started_at: startTime
        };

        // Prepare Pokemon for battle with realistic stats
        const battlePokemon1 = this.prepareBattlePokemon(pokemon1, player1.name);
        const battlePokemon2 = this.prepareBattlePokemon(pokemon2, player2.name);
        
        // Initialize battle state
        let currentP1 = { ...battlePokemon1 };
        let currentP2 = { ...battlePokemon2 };
        
        const battleTurns = [];
        const battleLog = [];
        let turnNumber = 1;
        let battleEnded = false;
        let winner = 'draw';
        
        battleLog.push(`⚔️ Battle begins between ${player1.name}'s ${currentP1.name} (${currentP1.hp}/${currentP1.max_hp} HP) and ${player2.name}'s ${currentP2.name} (${currentP2.hp}/${currentP2.max_hp} HP)!`);
        
        // Check if any Pokemon are already fainted before battle starts
        if (currentP1.hp <= 0 && currentP2.hp <= 0) {
            battleLog.push('💥 Both Pokemon are already fainted! Battle cannot proceed.');
            winner = Math.random() < 0.5 ? 'player1' : 'player2';
            const winnerName = winner === 'player1' ? player1.name : player2.name;
            battleLog.push(`🎲 ${winnerName} wins by default!`);
            battleEnded = true;
        } else if (currentP1.hp <= 0) {
            battleLog.push(`💀 ${player1.name}'s ${currentP1.name} is already fainted!`);
            winner = 'player2';
            battleLog.push(`🏆 ${player2.name} wins by default!`);
            battleEnded = true;
        } else if (currentP2.hp <= 0) {
            battleLog.push(`💀 ${player2.name}'s ${currentP2.name} is already fainted!`);
            winner = 'player1';
            battleLog.push(`🏆 ${player1.name} wins by default!`);
            battleEnded = true;
        }
        
        // Battle simulation loop
        while (!battleEnded && turnNumber <= maxTurns) {
            const turn = this.simulateTurn(
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
                // Both fainted - determine winner by total damage dealt
                const p1TotalDamage = this.calculateTotalDamage(battleTurns, 'player1');
                const p2TotalDamage = this.calculateTotalDamage(battleTurns, 'player2');
                
                if (p1TotalDamage > p2TotalDamage) {
                    winner = 'player1';
                    battleLog.push(`💥 Both Pokemon fainted! ${player1.name} wins by dealing more damage (${p1TotalDamage} vs ${p2TotalDamage})!`);
                } else if (p2TotalDamage > p1TotalDamage) {
                    winner = 'player2';
                    battleLog.push(`💥 Both Pokemon fainted! ${player2.name} wins by dealing more damage (${p2TotalDamage} vs ${p1TotalDamage})!`);
                } else {
                    // Exact tie - use Pokemon level as tiebreaker
                    if (battlePokemon1.level > battlePokemon2.level) {
                        winner = 'player1';
                        battleLog.push(`💥 Both Pokemon fainted with equal damage! ${player1.name} wins with higher level Pokemon!`);
                    } else if (battlePokemon2.level > battlePokemon1.level) {
                        winner = 'player2';
                        battleLog.push(`💥 Both Pokemon fainted with equal damage! ${player2.name} wins with higher level Pokemon!`);
                    } else {
                        // Still tied - random winner
                        winner = Math.random() < 0.5 ? 'player1' : 'player2';
                        const winnerName = winner === 'player1' ? player1.name : player2.name;
                        battleLog.push(`💥 Perfect tie! ${winnerName} wins by luck of the draw!`);
                    }
                }
                battleEnded = true;
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
                battleLog.push(`🏆 ${player1.name} wins by having more HP remaining (${currentP1.hp} vs ${currentP2.hp})!`);
            } else if (currentP2.hp > currentP1.hp) {
                winner = 'player2';
                battleLog.push(`🏆 ${player2.name} wins by having more HP remaining (${currentP2.hp} vs ${currentP1.hp})!`);
            } else {
                // Equal HP - use total damage as tiebreaker
                const p1TotalDamage = this.calculateTotalDamage(battleTurns, 'player1');
                const p2TotalDamage = this.calculateTotalDamage(battleTurns, 'player2');
                
                if (p1TotalDamage > p2TotalDamage) {
                    winner = 'player1';
                    battleLog.push(`🤝 Equal HP! ${player1.name} wins by dealing more damage (${p1TotalDamage} vs ${p2TotalDamage})!`);
                } else if (p2TotalDamage > p1TotalDamage) {
                    winner = 'player2';
                    battleLog.push(`🤝 Equal HP! ${player2.name} wins by dealing more damage (${p2TotalDamage} vs ${p1TotalDamage})!`);
                } else {
                    // Still tied - use Pokemon level as final tiebreaker
                    if (battlePokemon1.level >= battlePokemon2.level) {
                        winner = 'player1';
                        battleLog.push(`🤝 Perfect tie! ${player1.name} wins with higher/equal level Pokemon!`);
                    } else {
                        winner = 'player2';
                        battleLog.push(`🤝 Perfect tie! ${player2.name} wins with higher level Pokemon!`);
                    }
                }
            }
        }
        
        const endTime = new Date().toISOString();
        const duration = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
        
        // Calculate battle result
        const finalResult = {
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
            // Store both starting and final HP values
            player1_starting_hp: battlePokemon1.hp, // HP when battle started
            player2_starting_hp: battlePokemon2.hp, // HP when battle started
            player1_final_hp: currentP1.hp,
            player2_final_hp: currentP2.hp,
            // Add Pokemon pokedex IDs for HP updates
            player1_pokemon_pokedexid: pokemon1.pokemon_pokedexid || pokemon1.id,
            player2_pokemon_pokedexid: pokemon2.pokemon_pokedexid || pokemon2.id,
            player1_max_hp: battlePokemon1.max_hp,
            player2_max_hp: battlePokemon2.max_hp,
            rewards: {
                experience_gained: Math.floor(Math.random() * 100) + 50,
                items_earned: [],
                achievements_unlocked: []
            }
        };
        
        // Build complete battle data matching the React structure
        const completeBattleData = {
            metadata: {
                ...metadata,
                completed_at: endTime,
                duration_seconds: duration
            },
            pokemon_teams: {
                // Store Pokemon data with STARTING HP values (not final HP)
                player1_team: [{
                    ...battlePokemon1,
                    hp: battlePokemon1.hp, // This is the starting HP
                    final_hp: currentP1.hp  // This is the ending HP after battle
                }],
                player2_team: [{
                    ...battlePokemon2,
                    hp: battlePokemon2.hp, // This is the starting HP
                    final_hp: currentP2.hp  // This is the ending HP after battle
                }]
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
        
        console.log(`🏆 Battle simulation complete: ${finalResult.winner_name} wins after ${turnNumber - 1} turns!`);
        return completeBattleData;
    }
    
    /**
     * Prepare a Pokemon for battle with actual HP from Dataverse
     */
    static prepareBattlePokemon(pokemon, trainerName) {
        // Get level from pokemon data or default to 5
        const level = pokemon.pokemon_level || 5;
        
        // Use REAL HP values from Dataverse pokemon_pokedex table
        const currentHp = pokemon.pokemon_hp;
        const maxHp = pokemon.pokemon_hpmax;
        
        console.log(`🏥 Pokemon ${pokemon.pokemon_name}: Real HP = ${currentHp}/${maxHp} (Level ${level})`);
        console.log(`🔍 Raw Pokemon data:`, {
            pokemon_hp: pokemon.pokemon_hp,
            pokemon_hpmax: pokemon.pokemon_hpmax
        });
        
        return {
            id: pokemon.pokemon_id || pokemon.id || '1',
            pokemon_id: parseInt(pokemon.pokemon_id || pokemon.id || '1'),
            name: pokemon.pokemon_name || pokemon.name || 'Unknown Pokemon',
            level: level,
            hp: currentHp,  // Use actual current HP from pokemon_pokedex.pokemon_hp
            max_hp: maxHp,  // Use actual max HP from pokemon_pokedex.pokemon_hpmax
            // Level-based stats (similar to React version)
            attack: 30 + Math.floor(level * 1.5) + Math.floor(Math.random() * 10),
            defense: 25 + Math.floor(level * 1.2) + Math.floor(Math.random() * 10),
            speed: 20 + Math.floor(level * 1.8) + Math.floor(Math.random() * 10),
            types: this.getPokemonTypes(pokemon.pokemon_name || 'unknown'),
            sprite_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemon_id || pokemon.id || '1'}.png`,
            moves: this.getMovesForPokemon(this.getPokemonTypes(pokemon.pokemon_name || 'unknown')),
            trainer: trainerName
        };
    }
    
    /**
     * Simulate a single turn of battle
     */
    static simulateTurn(turnNumber, pokemon1, pokemon2, player1Name, player2Name) {
        const timestamp = new Date().toISOString();
        
        // Determine turn order based on speed
        const p1Speed = pokemon1.speed + Math.random() * 10;
        const p2Speed = pokemon2.speed + Math.random() * 10;
        
        let firstPokemon = p1Speed >= p2Speed ? pokemon1 : pokemon2;
        let secondPokemon = p1Speed >= p2Speed ? pokemon2 : pokemon1;
        let firstPlayer = p1Speed >= p2Speed ? player1Name : player2Name;
        let secondPlayer = p1Speed >= p2Speed ? player2Name : player1Name;
        let firstIsP1 = p1Speed >= p2Speed;
        
        // Simulate actions for both Pokemon
        const firstAction = this.simulateAction(firstPokemon, secondPokemon, firstPlayer);
        const secondAction = this.simulateAction(secondPokemon, firstPokemon, secondPlayer);
        
        // Apply damage
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
        
        // Build turn result
        const turnResult = {
            player1_pokemon_hp: p1HP,
            player2_pokemon_hp: p2HP,
            player1_pokemon_fainted: p1HP <= 0,
            player2_pokemon_fainted: p2HP <= 0,
            weather_effect: null,
            special_events: [],
            turn_summary: `Turn ${turnNumber}: ${firstAction.action_description} ${secondAction.action_description}`
        };
        
        // Build battlefield state
        const battlefieldState = {
            weather: null,
            terrain: 'normal',
            field_effects: [],
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
     * Simulate a single Pokemon action with proper Pokemon battle formula
     */
    static simulateAction(attacker, defender, trainerName) {
        const moves = attacker.moves;
        const selectedMove = moves[Math.floor(Math.random() * moves.length)];
        
        // Pokemon damage formula (from React version)
        const level = attacker.level || 50;
        const moveBasePower = selectedMove.power || 40;
        
        // Level multiplier: (2 * level + 10) / 250
        const levelMultiplier = (2 * level + 10) / 250;
        
        // Attack to Defense ratio
        const attackDefenseRatio = attacker.attack / defender.defense;
        
        // Base damage calculation
        const baseDamage = Math.floor((levelMultiplier * attackDefenseRatio * moveBasePower + 2) * (Math.random() * 0.15 + 0.85));
        
        // Type effectiveness
        const defenderPrimaryType = defender.types[0] || 'normal';
        const effectiveness = this.getTypeEffectiveness(selectedMove.type, defenderPrimaryType);
        const typeEffectiveDamage = Math.floor(baseDamage * effectiveness);
        
        // Critical hit check (6.25% chance like in Pokemon)
        const criticalHit = Math.random() < 0.0625;
        const finalDamage = criticalHit ? Math.floor(typeEffectiveDamage * 1.5) : typeEffectiveDamage;
        
        // Ensure minimum damage
        const actualDamage = Math.max(1, finalDamage);
        
        // Determine effectiveness text
        let effectivenessText = 'normal';
        if (effectiveness > 1.0) effectivenessText = 'super_effective';
        else if (effectiveness < 1.0) effectivenessText = 'not_very_effective';
        else if (effectiveness === 0.0) effectivenessText = 'no_effect';
        
        return {
            type: 'attack',
            move_used: selectedMove.name,
            move_type: selectedMove.type,
            target: 'opponent',
            damage_dealt: actualDamage,
            effectiveness: effectivenessText,
            effectiveness_multiplier: effectiveness,
            critical_hit: criticalHit,
            action_success: effectiveness > 0.0,
            action_description: `${trainerName}'s ${attacker.name} used ${selectedMove.name}${criticalHit ? ' (Critical Hit!)' : ''}${effectiveness > 1.0 ? ' (Super effective!)' : effectiveness < 1.0 && effectiveness > 0.0 ? ' (Not very effective...)' : effectiveness === 0.0 ? ' (It had no effect!)' : ''} and dealt ${actualDamage} damage!`
        };
    }
    
    /**
     * Get Pokemon types based on name (simplified lookup)
     */
    static getPokemonTypes(pokemonName) {
        const typeMap = {
            'pikachu': ['electric'],
            'charizard': ['fire', 'flying'],
            'blastoise': ['water'],
            'venusaur': ['grass', 'poison'],
            'alakazam': ['psychic'],
            'machamp': ['fighting'],
            'golem': ['rock', 'ground'],
            'gengar': ['ghost', 'poison'],
            'lapras': ['water', 'ice'],
            'snorlax': ['normal'],
            'articuno': ['ice', 'flying'],
            'zapdos': ['electric', 'flying'],
            'moltres': ['fire', 'flying'],
            'dragonite': ['dragon', 'flying'],
            'mewtwo': ['psychic'],
            'mew': ['psychic']
        };
        
        const name = pokemonName.toLowerCase();
        return typeMap[name] || ['normal'];
    }

    /**
     * Get type effectiveness multiplier (Pokemon battle formula)
     */
    static getTypeEffectiveness(attackType, defenderType) {
        const effectiveness = {
            'fire': { 'grass': 2.0, 'ice': 2.0, 'bug': 2.0, 'steel': 2.0, 'water': 0.5, 'fire': 0.5, 'rock': 0.5, 'dragon': 0.5 },
            'water': { 'fire': 2.0, 'ground': 2.0, 'rock': 2.0, 'grass': 0.5, 'water': 0.5, 'dragon': 0.5 },
            'grass': { 'water': 2.0, 'ground': 2.0, 'rock': 2.0, 'fire': 0.5, 'grass': 0.5, 'poison': 0.5, 'flying': 0.5, 'bug': 0.5, 'dragon': 0.5, 'steel': 0.5 },
            'electric': { 'water': 2.0, 'flying': 2.0, 'grass': 0.5, 'electric': 0.5, 'dragon': 0.5, 'ground': 0.0 },
            'psychic': { 'fighting': 2.0, 'poison': 2.0, 'psychic': 0.5, 'steel': 0.5, 'dark': 0.0 },
            'ice': { 'grass': 2.0, 'ground': 2.0, 'flying': 2.0, 'dragon': 2.0, 'fire': 0.5, 'water': 0.5, 'ice': 0.5, 'steel': 0.5 },
            'dragon': { 'dragon': 2.0, 'steel': 0.5, 'fairy': 0.0 },
            'dark': { 'psychic': 2.0, 'ghost': 2.0, 'fighting': 0.5, 'dark': 0.5, 'fairy': 0.5 },
            'fairy': { 'fighting': 2.0, 'dragon': 2.0, 'dark': 2.0, 'fire': 0.5, 'poison': 0.5, 'steel': 0.5 }
        };
        
        if (effectiveness[attackType] && effectiveness[attackType][defenderType] !== undefined) {
            return effectiveness[attackType][defenderType];
        }
        
        return 1.0; // Normal effectiveness
    }

    /**
     * Get moves for Pokemon based on types
     */
    static getMovesForPokemon(types) {
        const movesByType = {
            'fire': [
                { name: 'Flamethrower', type: 'fire', power: 90, accuracy: 100, pp: 15, description: 'The target is scorched with an intense blast of fire.' },
                { name: 'Fire Blast', type: 'fire', power: 110, accuracy: 85, pp: 5, description: 'The target is attacked with an intense blast of all-consuming fire.' },
                { name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, description: 'The target is attacked with small flames.' },
                { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'A physical attack.' }
            ],
            'water': [
                { name: 'Surf', type: 'water', power: 90, accuracy: 100, pp: 15, description: 'The user attacks everything around it by swamping its surroundings with a giant wave.' },
                { name: 'Hydro Pump', type: 'water', power: 110, accuracy: 80, pp: 5, description: 'The target is blasted by a huge volume of water launched under great pressure.' },
                { name: 'Water Gun', type: 'water', power: 40, accuracy: 100, pp: 25, description: 'The target is blasted with a forceful shot of water.' },
                { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'A physical attack.' }
            ],
            'electric': [
                { name: 'Thunderbolt', type: 'electric', power: 90, accuracy: 100, pp: 15, description: 'A strong electric blast crashes down on the target.' },
                { name: 'Thunder', type: 'electric', power: 110, accuracy: 70, pp: 10, description: 'A wicked thunderbolt is dropped on the target.' },
                { name: 'Thunder Shock', type: 'electric', power: 40, accuracy: 100, pp: 30, description: 'A jolt of electricity crashes down on the target.' },
                { name: 'Quick Attack', type: 'normal', power: 40, accuracy: 100, pp: 30, description: 'The user lunges at a speed that makes it almost invisible.' }
            ],
            'grass': [
                { name: 'Solar Beam', type: 'grass', power: 120, accuracy: 100, pp: 10, description: 'A two-turn attack where energy is absorbed on the first turn.' },
                { name: 'Petal Dance', type: 'grass', power: 90, accuracy: 100, pp: 10, description: 'The user attacks the target by scattering petals for two to three turns.' },
                { name: 'Vine Whip', type: 'grass', power: 45, accuracy: 100, pp: 25, description: 'The target is struck with slender whiplike vines.' },
                { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'A physical attack.' }
            ],
            'psychic': [
                { name: 'Psychic', type: 'psychic', power: 90, accuracy: 100, pp: 10, description: 'The target is hit by a strong telekinetic force.' },
                { name: 'Psybeam', type: 'psychic', power: 65, accuracy: 100, pp: 20, description: 'The target is attacked with a peculiar ray.' },
                { name: 'Confusion', type: 'psychic', power: 50, accuracy: 100, pp: 25, description: 'The target is hit by a weak telekinetic force.' },
                { name: 'Swift', type: 'normal', power: 60, accuracy: 100, pp: 20, description: 'Star-shaped rays are shot at the opposing team.' }
            ],
            'normal': [
                { name: 'Body Slam', type: 'normal', power: 85, accuracy: 100, pp: 15, description: 'The user drops onto the target with its full body weight.' },
                { name: 'Hyper Beam', type: 'normal', power: 150, accuracy: 90, pp: 5, description: 'The target is attacked with a powerful beam.' },
                { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'A physical attack in which the user charges and slams into the target.' },
                { name: 'Scratch', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'Hard, pointed, and sharp claws rake the target.' }
            ]
        };
        
        const primaryType = types[0] || 'normal';
        return movesByType[primaryType] || movesByType['normal'];
    }

    /**
     * Get default Pokemon moves (fallback)
     */
    static getDefaultMoves() {
        return [
            { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, description: 'A physical attack in which the user charges and slams into the target.' },
            { name: 'Quick Attack', type: 'normal', power: 40, accuracy: 100, pp: 30, description: 'The user lunges at the target at a speed that makes it almost invisible.' },
            { name: 'Thunder Shock', type: 'electric', power: 40, accuracy: 100, pp: 30, description: 'A jolt of electricity crashes down on the target.' },
            { name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, description: 'The target is attacked with small flames.' }
        ];
    }
    
    /**
     * Get max turns from portal settings (with fallback)
     */
    static async getMaxTurns() {
        try {
            // Check if PortalSettingsService is available
            if (typeof PortalSettingsService !== 'undefined') {
                console.log('📊 Fetching battle_turns from portal settings...');
                const turns = await PortalSettingsService.getBattleTurns();
                return turns;
            } else {
                console.warn('⚠️ PortalSettingsService not loaded, using default battle turns: 20');
                return 20;
            }
        } catch (error) {
            console.warn('Could not fetch max turns setting, using default:', error);
            return 20;
        }
    }

    /**
     * Calculate total damage dealt by a player across all turns
     * @param {Array} battleTurns - Array of battle turns
     * @param {string} player - 'player1' or 'player2'
     * @returns {number} Total damage dealt
     */
    static calculateTotalDamage(battleTurns, player) {
        return battleTurns.reduce((total, turn) => {
            const action = turn[`${player}_action`];
            return total + (action.damage_dealt || 0);
        }, 0);
    }
}

// Make it available globally
window.BattleSimulationService = BattleSimulationService;
