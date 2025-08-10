// Pokemon Battle Challenge Service - Handles battle challenges and management
class BattleChallengeService {
    static baseUrl = 'https://pokemongame-functions-2025.azurewebsites.net/api/dataverse';

    /**
     * Create a new battle challenge
     */
    static async createChallenge(playerId, pokemonId, challengeType = 'open') {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Creating challenge', { playerId, pokemonId, challengeType });

            const challengeTypeCode = challengeType === 'open' ? 1 : 2; // 1 = Open, 2 = Training
            
            // For Dataverse POST operations, lookup fields can use simple format or @odata.bind
            const challengeData = {
                "pokemon_Player1@odata.bind": `/contacts(${playerId})`,
                "pokemon_Player1Pokemon@odata.bind": `/pokemon_pokedexes(${pokemonId})`,
                pokemon_challengetype: challengeTypeCode,
                statuscode: 1, // Open
                statecode: 0,  // Active
                createdon: new Date().toISOString()
            };
            
            console.log('🔍 CHALLENGE-SERVICE: Challenge data:', challengeData);

            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            const response = await fetch(`${this.baseUrl}/pokemon_battles`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'Content-Type': 'application/json',
                    'X-User-Email': authUser.email
                },
                body: JSON.stringify(challengeData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('🔍 CHALLENGE-SERVICE: POST failed with status:', response.status);
                console.error('🔍 CHALLENGE-SERVICE: Error response:', errorText);
                throw new Error(`Failed to create challenge: ${response.status} ${errorText}`);
            }

            // Handle different response types
            let result;
            if (response.status === 204) {
                // Extract ID from Location header
                const locationHeader = response.headers.get('Location') || response.headers.get('OData-EntityId');
                let createdId = 'created-successfully';
                
                if (locationHeader) {
                    const match = locationHeader.match(/pokemon_battles\(([^)]+)\)/);
                    if (match) {
                        createdId = match[1];
                    }
                }
                
                result = { pokemon_battleid: createdId };
            } else {
                try {
                    result = await response.json();
                } catch (jsonError) {
                    result = { pokemon_battleid: 'created-successfully' };
                }
            }

            console.log('✅ CHALLENGE-SERVICE: Challenge created successfully', result);
            return { success: true, battleId: result.pokemon_battleid };

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error creating challenge:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Join an existing battle challenge
     */
    static async joinChallenge(battleId, playerId, pokemonId) {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Joining challenge', { battleId, playerId, pokemonId });

            // For Dataverse PATCH operations, lookup fields need specific formatting
            const updateData = {
                "pokemon_Player2@odata.bind": `/contacts(${playerId})`,
                "pokemon_Player2Pokemon@odata.bind": `/pokemon_pokedexes(${pokemonId})`,
                statuscode: 895550002, // In Progress
                modifiedon: new Date().toISOString()
            };
            
            console.log('🔍 CHALLENGE-SERVICE: Update data:', updateData);
            console.log('🔍 CHALLENGE-SERVICE: URL:', `${this.baseUrl}/pokemon_battles(${battleId})`);

            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            const response = await fetch(`${this.baseUrl}/pokemon_battles(${battleId})`, {
                method: 'PATCH',
                mode: 'cors',
                credentials: 'omit',
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'Content-Type': 'application/json',
                    'X-User-Email': authUser.email
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('🔍 CHALLENGE-SERVICE: PATCH failed with status:', response.status);
                console.error('🔍 CHALLENGE-SERVICE: Error response:', errorText);
                throw new Error(`Failed to join challenge: ${response.status} ${errorText}`);
            }

            console.log('✅ CHALLENGE-SERVICE: Successfully joined challenge');
            return { success: true };

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error joining challenge:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get open challenges
     */
    static async getOpenChallenges() {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Loading open challenges');

            const url = `${this.baseUrl}/pokemon_battles?$filter=statuscode eq 1 and statecode eq 0&$expand=pokemon_Player1($select=firstname),pokemon_Player1Pokemon($expand=pokemon_Pokemon($select=pokemon_name,pokemon_id))&$orderby=createdon desc`;
            
            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            const response = await fetch(url, {
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'X-User-Email': authUser.email
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load challenges: ${response.statusText}`);
            }

            const data = await response.json();
            const challenges = data.value || [];

            console.log('✅ CHALLENGE-SERVICE: Loaded challenges', challenges.length);
            return challenges;

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error loading challenges:', error);
            throw error;
        }
    }

    /**
     * Get user's battle challenges (created by user)
     */
    static async getUserChallenges(userId) {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Loading user challenges', userId);

            const url = `${this.baseUrl}/pokemon_battles?$filter=(_pokemon_player1_value eq '${userId}' or _pokemon_player2_value eq '${userId}') and statuscode ne 1&$expand=pokemon_Player1($select=firstname),pokemon_Player2($select=firstname),pokemon_Player1Pokemon($expand=pokemon_Pokemon($select=pokemon_name,pokemon_id)),pokemon_Player2Pokemon($expand=pokemon_Pokemon($select=pokemon_name,pokemon_id))&$orderby=modifiedon desc`;
            
            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            const response = await fetch(url, {
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'X-User-Email': authUser.email
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load user battles: ${response.statusText}`);
            }

            const data = await response.json();
            const battles = data.value || [];

            console.log('✅ CHALLENGE-SERVICE: Loaded user battles', battles.length);
            return battles;

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error loading user battles:', error);
            throw error;
        }
    }

    /**
     * Get battle details by ID with current Pokemon data
     */
    static async getBattleDetails(battleId) {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Loading battle details', battleId);

            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            // Use token or accessToken, prefer token
            const token = authUser.token || authUser.accessToken;
            if (!token) {
                throw new Error('No authentication token available');
            }

            // Get battle data with expanded Pokemon information including current HP and levels
            const url = `${this.baseUrl}/pokemon_battles(${battleId})?$expand=pokemon_Player1($select=firstname),pokemon_Player2($select=firstname),pokemon_Player1Pokemon($select=pokemon_pokedexid,pokemon_name,pokemon_level,pokemon_hp,pokemon_hpmax),pokemon_Player2Pokemon($select=pokemon_pokedexid,pokemon_name,pokemon_level,pokemon_hp,pokemon_hpmax)`;
            
            console.log('🌐 CHALLENGE-SERVICE: Request URL:', url);

            const headers = { 
                'Authorization': `Bearer ${token}`,
                'X-User-Email': authUser.email
            };

            console.log('📤 CHALLENGE-SERVICE: Request headers:', {
                Authorization: `Bearer ${token?.substring(0, 20)}...`,
                'X-User-Email': authUser.email
            });

            const response = await fetch(url, {
                headers: headers
            });

            console.log('📡 CHALLENGE-SERVICE: Response status:', response.status);
            console.log('📡 CHALLENGE-SERVICE: Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('🔍 CHALLENGE-SERVICE: Error response body:', errorText);
                throw new Error(`Failed to load battle details: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const battle = await response.json();

            console.log('✅ CHALLENGE-SERVICE: Loaded battle details with Pokemon data');
            console.log('🔍 CHALLENGE-SERVICE: Player 1 Pokemon:', battle.pokemon_Player1Pokemon);
            console.log('🔍 CHALLENGE-SERVICE: Player 2 Pokemon:', battle.pokemon_Player2Pokemon);
            
            return battle;
        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error loading battle details:', error);
            throw error;
        }
    }

    /**
     * Get battle by ID (alias for getBattleDetails for compatibility)
     */
    static async getBattleById(battleId) {
        return this.getBattleDetails(battleId);
    }

    /**
     * Complete a battle with results
     */
    static async completeBattle(battleId, battleResult) {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Completing battle', battleId);

            // Store the full battle result for rich replay experience
            const detailedResult = {
                metadata: battleResult.metadata,
                final_result: battleResult.final_result,
                battle_turns: battleResult.battle_turns?.map(turn => ({
                    turn_number: turn.turn_number,
                    player1_action: {
                        action_description: turn.player1_action?.action_description || `${turn.player1_action?.move_used || 'Unknown move'}`,
                        move_used: turn.player1_action?.move_used,
                        damage_dealt: turn.player1_action?.damage_dealt,
                        critical_hit: turn.player1_action?.critical_hit,
                        type_effectiveness: turn.player1_action?.type_effectiveness
                    },
                    player2_action: {
                        action_description: turn.player2_action?.action_description || `${turn.player2_action?.move_used || 'Unknown move'}`,
                        move_used: turn.player2_action?.move_used,
                        damage_dealt: turn.player2_action?.damage_dealt,
                        critical_hit: turn.player2_action?.critical_hit,
                        type_effectiveness: turn.player2_action?.type_effectiveness
                    },
                    turn_result: {
                        player1_pokemon_hp: turn.turn_result.player1_pokemon_hp,
                        player2_pokemon_hp: turn.turn_result.player2_pokemon_hp,
                        turn_summary: turn.turn_result.turn_summary || `Turn ${turn.turn_number} completed`,
                        player1_pokemon_fainted: turn.turn_result.player1_pokemon_fainted,
                        player2_pokemon_fainted: turn.turn_result.player2_pokemon_fainted,
                        winner: turn.turn_result.winner
                    }
                })) || [],
                pokemon_teams: {
                    player1_team: [{
                        name: battleResult.pokemon_teams?.player1_team?.[0]?.name,
                        max_hp: battleResult.final_result?.player1_max_hp || battleResult.pokemon_teams?.player1_team?.[0]?.max_hp,
                        final_hp: battleResult.final_result?.player1_final_hp,
                        level: battleResult.pokemon_teams?.player1_team?.[0]?.level,
                        types: battleResult.pokemon_teams?.player1_team?.[0]?.types,
                        sprite_url: battleResult.pokemon_teams?.player1_team?.[0]?.sprite_url
                    }],
                    player2_team: [{
                        name: battleResult.pokemon_teams?.player2_team?.[0]?.name,
                        max_hp: battleResult.final_result?.player2_max_hp || battleResult.pokemon_teams?.player2_team?.[0]?.max_hp,
                        final_hp: battleResult.final_result?.player2_final_hp,
                        level: battleResult.pokemon_teams?.player2_team?.[0]?.level,
                        types: battleResult.pokemon_teams?.player2_team?.[0]?.types,
                        sprite_url: battleResult.pokemon_teams?.player2_team?.[0]?.sprite_url
                    }]
                }
            };

            const battleResultJson = JSON.stringify(detailedResult);
            console.log('📊 Simplified battle result JSON size:', battleResultJson.length, 'characters');
            console.log('📊 Battle result preview:', battleResultJson.substring(0, 500) + '...');

            const updateData = {
                statuscode: 895550001, // Completed
                statecode: 0,          // Active
                pokemon_battleresultjson: battleResultJson,
                modifiedon: new Date().toISOString()
            };

            console.log('📤 Sending update data:', {
                ...updateData,
                pokemon_battleresultjson: `[JSON string of ${battleResultJson.length} chars]`
            });

            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            console.log('🔐 Auth user details:', {
                email: authUser.email,
                tokenLength: authUser.token?.length,
                tokenStart: authUser.token?.substring(0, 20) + '...'
            });

            const requestUrl = `${this.baseUrl}/pokemon_battles(${battleId})`;
            console.log('🌐 Request URL:', requestUrl);

            const response = await fetch(requestUrl, {
                method: 'PATCH', // Back to PATCH - same as joinChallenge
                mode: 'cors',
                credentials: 'omit',
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'Content-Type': 'application/json',
                    'X-User-Email': authUser.email
                },
                body: JSON.stringify(updateData)
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to complete battle: ${response.status} ${errorText}`);
            }

            console.log('✅ CHALLENGE-SERVICE: Battle completed successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error completing battle:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update Pokemon HP after battle
     */
    static async updatePokemonHP(pokemonPokedexId, newCurrentHP) {
        try {
            console.log(`🏥 CHALLENGE-SERVICE: Updating Pokemon HP - ID: ${pokemonPokedexId}, New HP: ${newCurrentHP}`);

            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            const updateData = {
                pokemon_hp: newCurrentHP, // Use pokemon_hp as the correct field name
                modifiedon: new Date().toISOString()
            };

            const response = await fetch(`${this.baseUrl}/pokemon_pokedexes(${pokemonPokedexId})`, {
                method: 'PATCH',
                mode: 'cors',
                credentials: 'omit',
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'Content-Type': 'application/json',
                    'X-User-Email': authUser.email
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update Pokemon HP: ${response.status} ${errorText}`);
            }

            console.log(`✅ CHALLENGE-SERVICE: Pokemon HP updated successfully - ID: ${pokemonPokedexId}, HP: ${newCurrentHP}`);
            return { success: true };

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error updating Pokemon HP:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update both Pokemon HP after battle completion
     */
    static async updateBattlePokemonHP(battleResult) {
        try {
            console.log('🏥 CHALLENGE-SERVICE: Updating Pokemon HP after battle...');
            console.log('🏥 Battle result keys:', Object.keys(battleResult));
            console.log('🏥 Looking for Pokemon HP data:', {
                player1_final_hp: battleResult.player1_final_hp,
                player2_final_hp: battleResult.player2_final_hp,
                player1_pokemon_pokedexid: battleResult.player1_pokemon_pokedexid,
                player2_pokemon_pokedexid: battleResult.player2_pokemon_pokedexid
            });

            const results = [];

            // Update Player 1 Pokemon HP
            if (battleResult.player1_final_hp !== undefined && battleResult.player1_pokemon_pokedexid) {
                console.log(`🔄 Player 1 Pokemon HP update: ${battleResult.player1_pokemon_pokedexid} -> ${battleResult.player1_final_hp} HP`);
                const p1Result = await this.updatePokemonHP(
                    battleResult.player1_pokemon_pokedexid, 
                    Math.max(0, battleResult.player1_final_hp)
                );
                results.push({ player: 1, pokemon_id: battleResult.player1_pokemon_pokedexid, final_hp: battleResult.player1_final_hp, ...p1Result });
            } else {
                console.warn('⚠️ Player 1 Pokemon HP update skipped - missing data:', {
                    final_hp: battleResult.player1_final_hp,
                    pokemon_id: battleResult.player1_pokemon_pokedexid
                });
            }

            // Update Player 2 Pokemon HP
            if (battleResult.player2_final_hp !== undefined && battleResult.player2_pokemon_pokedexid) {
                console.log(`🔄 Player 2 Pokemon HP update: ${battleResult.player2_pokemon_pokedexid} -> ${battleResult.player2_final_hp} HP`);
                const p2Result = await this.updatePokemonHP(
                    battleResult.player2_pokemon_pokedexid, 
                    Math.max(0, battleResult.player2_final_hp)
                );
                results.push({ player: 2, pokemon_id: battleResult.player2_pokemon_pokedexid, final_hp: battleResult.player2_final_hp, ...p2Result });
            } else {
                console.warn('⚠️ Player 2 Pokemon HP update skipped - missing data:', {
                    final_hp: battleResult.player2_final_hp,
                    pokemon_id: battleResult.player2_pokemon_pokedexid
                });
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`✅ CHALLENGE-SERVICE: Updated HP for ${successCount}/${results.length} Pokemon`);
            console.log('📊 HP Update Summary:', results.map(r => `Player ${r.player}: ${r.pokemon_id} -> ${r.final_hp} HP (${r.success ? 'SUCCESS' : 'FAILED'})`));

            return { 
                success: successCount === results.length, 
                results: results,
                updated_count: successCount
            };

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error updating battle Pokemon HP:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete/Cancel a battle challenge
     */
    static async cancelChallenge(battleId) {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Cancelling challenge', battleId);

            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            const response = await fetch(`${this.baseUrl}/pokemon_battles(${battleId})`, {
                method: 'DELETE',
                mode: 'cors',
                credentials: 'omit',
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'X-User-Email': authUser.email
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to cancel challenge: ${response.statusText}`);
            }

            console.log('✅ CHALLENGE-SERVICE: Challenge cancelled successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error cancelling challenge:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Simulate a training battle against AI
     */
    static async simulateTrainingBattle(battleId, playerPokemon) {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Starting training battle simulation');

            // Generate AI opponent
            const aiPokemon = BattleService.generateWildPokemon(playerPokemon.level || 5);
            
            // Prepare Pokemon for battle
            const player = BattleService.preparePokemonForBattle(playerPokemon);
            const opponent = { ...aiPokemon };

            // Battle simulation
            const battleSteps = [];
            const battleLog = [];
            let turnNumber = 1;
            const maxTurns = 50; // Prevent infinite battles

            battleLog.push(`🤖 A wild ${opponent.name} appears!`);
            battleLog.push(`⚔️ Battle begins! ${player.name} vs ${opponent.name}`);

            while (player.hp > 0 && opponent.hp > 0 && turnNumber <= maxTurns) {
                console.log(`🎯 BATTLE-SERVICE: Turn ${turnNumber}`);

                // Execute turn
                const turnResult = BattleService.executeTurn(player, opponent, 0);
                
                // Record battle step
                const step = {
                    stepNumber: turnNumber,
                    playerHP: player.hp,
                    opponentHP: opponent.hp,
                    playerMove: turnResult.playerMove,
                    opponentMove: turnResult.opponentMove,
                    playerDamage: turnResult.playerDamageDealt,
                    opponentDamage: turnResult.opponentDamageDealt,
                    battleLog: turnResult.battleLog
                };
                
                battleSteps.push(step);
                battleLog.push(...turnResult.battleLog);

                // Check for battle end
                if (player.hp <= 0 || opponent.hp <= 0) {
                    break;
                }

                turnNumber++;
            }

            // Determine winner
            let winner, experience;
            if (player.hp > 0 && opponent.hp <= 0) {
                winner = 'player';
                experience = BattleService.calculateExperience(player.level, opponent.level, true);
                battleLog.push(`🏆 ${player.name} wins the battle!`);
            } else if (opponent.hp > 0 && player.hp <= 0) {
                winner = 'opponent';
                experience = BattleService.calculateExperience(player.level, opponent.level, false);
                battleLog.push(`💀 ${player.name} was defeated!`);
            } else {
                winner = 'draw';
                experience = BattleService.calculateExperience(player.level, opponent.level, false);
                battleLog.push(`⏰ Battle ended in a draw!`);
            }

            battleLog.push(`✨ ${player.name} gained ${experience} experience!`);

            // Create battle result
            const battleResult = {
                battleId,
                winner,
                battleSteps,
                battleLog,
                finalState: {
                    player: { ...player },
                    opponent: { ...opponent }
                },
                experience,
                metadata: {
                    battleType: 'training',
                    totalTurns: turnNumber - 1,
                    completedAt: new Date().toISOString()
                }
            };

            console.log('✅ CHALLENGE-SERVICE: Training battle simulation completed', {
                winner,
                turns: turnNumber - 1,
                experience
            });

            return battleResult;

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error simulating training battle:', error);
            throw error;
        }
    }

    /**
     * Get caught Pokemon for a trainer
     */
    static async getCaughtPokemon(trainerId) {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Loading caught Pokemon', trainerId);

            // Get full Pokemon data including HP, level, types, and Pokemon details
            // The key is to properly expand the pokemon_Pokemon relationship to get the master Pokemon data
            const url = `${this.baseUrl}/pokemon_pokedexes?$filter=_pokemon_user_value eq '${trainerId}'&$expand=pokemon_Pokemon($select=pokemon_id,pokemon_name,pokemon_type1,pokemon_type2,pokemon_sprite_url)&$select=pokemon_pokedexid,pokemon_name,pokemon_level,pokemon_hp,pokemon_hpmax,pokemon_current_hp,pokemon_max_hp,pokemon_nickname,pokemon_attack,pokemon_defense,pokemon_defence,createdon,_pokemon_pokemon_value&$orderby=createdon desc`;
            
            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            const response = await fetch(url, {
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'X-User-Email': authUser.email
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load Pokemon: ${response.statusText}`);
            }

            const data = await response.json();
            const pokemon = data.value || [];

            console.log('✅ CHALLENGE-SERVICE: Loaded caught Pokemon', pokemon.length);
            console.log('🔍 CHALLENGE-SERVICE: Sample Pokemon data:', pokemon[0]);
            console.log('🔍 CHALLENGE-SERVICE: Sample expanded Pokemon:', pokemon[0]?.pokemon_Pokemon);
            
            return pokemon;

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error loading caught Pokemon:', error);
            throw error;
        }
    }

    /**
     * Get user's contact ID from email
     */
    static async getUserContactId(email) {
        try {
            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            const url = `${this.baseUrl}/contacts?$filter=emailaddress1 eq '${email}'&$select=contactid`;
            const response = await fetch(url, {
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'X-User-Email': authUser.email
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.value && data.value.length > 0 ? data.value[0].contactid : null;
            
        } catch (error) {
            console.error('🎯 CHALLENGE-SERVICE: Error getting user contact ID:', error);
            throw error;
        }
    }

    /**
     * CLEAN Training simulation - NO BATTLE RECORDS - Just stat updates
     */
    static async simulateFixedTrainingBattle(battleId, playerPokemon) {
        try {
            console.log('🎯 TRAINING: Starting training session (no battle record)', { sessions: playerPokemon.pokemon_trainingsessions || 0 });

            // Check training session limit
            const currentSessions = playerPokemon.pokemon_trainingsessions || 0;
            if (currentSessions >= 5) {
                throw new Error('Pokemon has reached maximum training sessions (5/5). Your Pokemon has mastered its training!');
            }
            
            const currentHP = playerPokemon.pokemon_hp || playerPokemon.hp || 50;
            const maxHP = playerPokemon.pokemon_hpmax || playerPokemon.maxHP || 50;
            
            // Calculate HP loss and stat gains
            const hpLoss = Math.floor(maxHP * (0.1 + Math.random() * 0.15));
            const newCurrentHP = Math.max(1, currentHP - hpLoss);
            
            const statGains = {
                attack: Math.floor(1 + Math.random() * 3),
                defense: Math.floor(1 + Math.random() * 3),
                hp: Math.floor(2 + Math.random() * 4)
            };

            const newMaxHP = maxHP + statGains.hp;
            const newTrainingSessions = currentSessions + 1;

            // LEVEL UP LOGIC - NO FALLBACKS, USE EXACT DATABASE VALUES
            let levelUp = false;
            let newLevel = playerPokemon.pokemon_level || playerPokemon.level; // Check both field names
            
            console.log(`🔍 LEVEL CHECK: ${currentSessions} → ${newTrainingSessions} sessions, current level: ${newLevel}`);
            console.log(`🔍 POKEMON DATA:`, {
                name: playerPokemon.pokemon_name || playerPokemon.name,
                id: playerPokemon.pokemon_pokedexid || playerPokemon.id,
                level_pokemon_level: playerPokemon.pokemon_level,
                level_level: playerPokemon.level,
                final_level: newLevel,
                sessions: playerPokemon.pokemon_trainingsessions
            });
            
            // DEBUG: Log the actual Pokemon level value and type
            console.log(`🔍 RAW LEVEL DATA:`, {
                pokemon_level_field: playerPokemon.pokemon_level,
                level_field: playerPokemon.level,
                level_type: typeof newLevel,
                exact_value: newLevel
            });
            
            // Level up at session milestones: 3 sessions and 5 sessions
            if (newTrainingSessions === 3 && currentSessions === 2) {
                newLevel += 1; // INCREMENT current level
                levelUp = true;
                console.log(`🎉 LEVEL UP: Level ${playerPokemon.pokemon_level || playerPokemon.level} → ${newLevel} (reached 3 sessions)`);
            } else if (newTrainingSessions === 5 && currentSessions === 4) {
                newLevel += 1; // INCREMENT current level
                levelUp = true;
                console.log(`🎉 LEVEL UP: Level ${playerPokemon.pokemon_level || playerPokemon.level} → ${newLevel} (reached 5 sessions)`);
            } else {
                console.log(`📊 NO LEVEL UP: Current milestone - need 2→3 sessions or 4→5 sessions for level up`);
            }

            // Calculate new stats
            const originalAttack = playerPokemon.pokemon_attack || playerPokemon.attack || 20;
            const originalDefense = playerPokemon.pokemon_defence || playerPokemon.defence || playerPokemon.defense || 15;
            
            const newAttack = originalAttack + statGains.attack;
            const newDefense = originalDefense + statGains.defense;

            // Create updated Pokemon object with CORRECT FIELD NAMES
            const updatedPokemon = {
                ...playerPokemon,
                pokemon_attack: newAttack,
                pokemon_defence: newDefense,  // CORRECT: pokemon_defence with 'c'
                pokemon_hpmax: newMaxHP,
                pokemon_hp: newCurrentHP,
                pokemon_level: newLevel,
                pokemon_trainingsessions: newTrainingSessions
            };

            console.log(`📊 RESULT: Level ${playerPokemon.pokemon_level || 1}→${newLevel}, Sessions ${currentSessions}→${newTrainingSessions}, Level Up: ${levelUp}`);
            
            console.log('🔍 TRAINING: Before database update - Pokemon data:', {
                pokemonId: playerPokemon.pokemon_pokedexid || playerPokemon.id,
                originalLevel: playerPokemon.pokemon_level,
                newLevel: newLevel,
                originalSessions: currentSessions,
                newSessions: newTrainingSessions,
                levelUpOccurred: levelUp
            });

            // Debug Pokemon object structure
            console.log('🔍 TRAINING: Pokemon object keys:', Object.keys(playerPokemon));
            console.log('🔍 TRAINING: Pokemon ID fields:', {
                pokemon_pokedexid: playerPokemon.pokemon_pokedexid,
                pokemon_id: playerPokemon.pokemon_id,
                id: playerPokemon.id
            });

            // Save to database
            await this.updatePokemonStats(updatedPokemon);

            // Return training result (NO BATTLE DATA)
            return {
                battleId: 'training-session', // Dummy ID for compatibility
                winner: 'training',
                battleSteps: [],
                battleLog: [
                    `🥊 Training completed! (Session ${newTrainingSessions}/5)`,
                    `💪 Stat Gains: +${statGains.attack} ATK, +${statGains.defense} DEF, +${statGains.hp} Max HP`,
                    `😤 Training Fatigue: -${hpLoss} current HP (${newCurrentHP}/${newMaxHP})`,
                    ...(levelUp ? [
                        `🎉 LEVEL UP! ${playerPokemon.pokemon_level || 1} → ${newLevel}!`,
                        `⭐ Level-up milestone reached at ${newTrainingSessions} training sessions!`
                    ] : [
                        `📈 Progress: ${newTrainingSessions < 3 ? `${newTrainingSessions}/3 sessions until next level` : newTrainingSessions < 5 ? `${newTrainingSessions}/5 sessions until next level` : 'Training mastered!'}`
                    ])
                ],
                finalState: {
                    player: { hp: newCurrentHP, maxHp: newMaxHP },
                    opponent: { 
                        name: 'Training Bot', 
                        level: newLevel, 
                        pokemonId: 25, // Pikachu for training
                        hp: 1,
                        maxHp: 50
                    }
                },
                experience: 20,
                statGains,
                hpLoss,
                newTrainingSessions,
                levelUp,
                newLevel,
                updatedPokemon,
                metadata: { battleType: 'training', isTrainingOnly: true }
            };

        } catch (error) {
            console.error('❌ TRAINING ERROR:', error);
            throw error;
        }
    }

    /**
     * Pure training function - no battle records, just Pokemon stat updates
     */
    static async trainPokemon(playerPokemon) {
        // Alias for simulateFixedTrainingBattle but without requiring battleId
        return this.simulateFixedTrainingBattle('training-session', playerPokemon);
    }

    /**
     * Update Pokemon stats in the database
     */
    static async updatePokemonStats(pokemon) {
        try {
            const authUser = AuthService.getCurrentUser();
            if (!authUser?.token && !authUser?.accessToken) {
                throw new Error('Authentication required');
            }

            // Use token or accessToken, prefer token for consistency with other methods
            const token = authUser.token || authUser.accessToken;
            
            // Find the correct Pokemon ID field
            const pokemonId = pokemon.pokemon_pokedexid || pokemon.pokemon_id || pokemon.id;
            
            if (!pokemonId) {
                console.error('❌ TRAINING: No Pokemon ID found', pokemon);
                throw new Error('Pokemon ID is required for database update');
            }
            
            const url = `${this.baseUrl}/pokemon_pokedexes(${pokemonId})`;

            const updateData = {
                pokemon_attack: pokemon.pokemon_attack,
                pokemon_defence: pokemon.pokemon_defence,  // CORRECT: pokemon_defence with 'c'
                pokemon_hp: pokemon.pokemon_hp,
                pokemon_hpmax: pokemon.pokemon_hpmax,
                pokemon_level: pokemon.pokemon_level,
                pokemon_trainingsessions: pokemon.pokemon_trainingsessions
            };

            console.log('🔄 TRAINING: Database update details:', { 
                pokemonId, 
                url,
                originalPokemon: {
                    level: pokemon.pokemon_level,
                    sessions: pokemon.pokemon_trainingsessions,
                    attack: pokemon.pokemon_attack,
                    defence: pokemon.pokemon_defence
                },
                updateData 
            });

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-User-Email': authUser.email,
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ TRAINING: Database update failed', { status: response.status, error: errorText, url, updateData });
                throw new Error(`Failed to update Pokemon stats: ${response.status} - ${errorText}`);
            }

            console.log('✅ TRAINING: Pokemon stats updated successfully');
            return true;

        } catch (error) {
            console.error('❌ TRAINING: Error updating Pokemon stats:', error);
            throw error;
        }
    }
}
