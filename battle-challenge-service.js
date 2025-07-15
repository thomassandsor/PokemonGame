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
            
            const challengeData = {
                pokemon_player1: playerId,
                pokemon_player1pokemon: pokemonId,
                pokemon_challengetype: challengeTypeCode,
                statuscode: 1, // Open
                statecode: 0,  // Active
                createdon: new Date().toISOString()
            };

            const response = await fetch(`${this.baseUrl}/pokemon_battles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(challengeData)
            });

            if (!response.ok) {
                const errorText = await response.text();
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

            const updateData = {
                pokemon_player2: playerId,
                pokemon_player2pokemon: pokemonId,
                statuscode: 895550002, // In Progress
                modifiedon: new Date().toISOString()
            };

            const response = await fetch(`${this.baseUrl}/pokemon_battles(${battleId})`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorText = await response.text();
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
            
            const response = await fetch(url);

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
            
            const response = await fetch(url);

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
     * Get battle details by ID
     */
    static async getBattleDetails(battleId) {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Loading battle details', battleId);

            const url = `${this.baseUrl}/pokemon_battles(${battleId})?$expand=pokemon_Player1($select=firstname),pokemon_Player2($select=firstname),pokemon_Player1Pokemon($expand=pokemon_Pokemon($select=pokemon_name,pokemon_id)),pokemon_Player2Pokemon($expand=pokemon_Pokemon($select=pokemon_name,pokemon_id))`;
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load battle details: ${response.statusText}`);
            }

            const battle = await response.json();

            console.log('✅ CHALLENGE-SERVICE: Loaded battle details');
            return battle;

        } catch (error) {
            console.error('❌ CHALLENGE-SERVICE: Error loading battle details:', error);
            throw error;
        }
    }

    /**
     * Complete a battle with results
     */
    static async completeBattle(battleId, battleResult) {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Completing battle', battleId);

            const updateData = {
                statuscode: 895550001, // Completed
                statecode: 1,          // Inactive
                pokemon_battleresultjson: JSON.stringify(battleResult),
                modifiedon: new Date().toISOString()
            };

            const response = await fetch(`${this.baseUrl}/pokemon_battles(${battleId})`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

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
     * Delete/Cancel a battle challenge
     */
    static async cancelChallenge(battleId) {
        try {
            console.log('🎯 CHALLENGE-SERVICE: Cancelling challenge', battleId);

            const response = await fetch(`${this.baseUrl}/pokemon_battles(${battleId})`, {
                method: 'DELETE'
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

            const url = `${this.baseUrl}/pokemon_pokedexes?$filter=_pokemon_user_value eq '${trainerId}'&$expand=pokemon_Pokemon($select=pokemon_name,pokemon_id)&$orderby=createdon desc`;
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load Pokemon: ${response.statusText}`);
            }

            const data = await response.json();
            const pokemon = data.value || [];

            console.log('✅ CHALLENGE-SERVICE: Loaded caught Pokemon', pokemon.length);
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
            const url = `${this.baseUrl}/contacts?$filter=emailaddress1 eq '${email}'&$select=contactid`;
            const response = await fetch(url);
            
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
}
