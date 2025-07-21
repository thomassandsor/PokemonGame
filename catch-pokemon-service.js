// Pokemon Catch Service - Handles adding Pokemon to user's Pokedex
class CatchPokemonService {
    static baseUrl = '/api/dataverse';
    
    /**
     * Catch a Pokemon and add it to user's Pokedex
     * @param {number} pokemonNumber - Pokemon ID from QR code
     * @param {Object} options - Optional catch parameters
     * @returns {Promise<Object>} Result of catch operation
     */
    static async catchPokemon(pokemonNumber, options = {}) {
        let currentStep = 'initialization';
        try {
            console.log('🎯 CATCH-SERVICE: Starting catch process for Pokemon #' + pokemonNumber);
            
            currentStep = 'authentication';
            // Get current user info
            const currentUser = AuthService.getCurrentUser();
            if (!currentUser || !currentUser.email) {
                throw new Error('User not authenticated');
            }
            
            console.log('🎯 CATCH-SERVICE: User authenticated:', currentUser.email);
            
            currentStep = 'user_lookup';
            // Step 1: Get user's contact ID from Dataverse
            const userId = await this.getUserContactId(currentUser.email);
            if (!userId) {
                throw new Error('Unable to find user in system');
            }
            
            console.log('🎯 CATCH-SERVICE: Found user contact ID:', userId);
            
            currentStep = 'pokemon_lookup';
            // Step 2: Find the master Pokemon record
            const masterPokemon = await this.getMasterPokemon(pokemonNumber);
            if (!masterPokemon) {
                throw new Error(`Pokemon #${pokemonNumber} not found in master data`);
            }
            
            console.log('🎯 CATCH-SERVICE: Found master Pokemon:', masterPokemon.pokemon_name);
            
            currentStep = 'duplicate_check';
            // Step 3: Check if user already has this Pokemon
            const existingPokemon = await this.checkExistingPokemon(userId, masterPokemon.pokemon_pokemonid);
            if (existingPokemon) {
                throw new Error(`You already have ${masterPokemon.pokemon_name} in your collection!`);
            }

            currentStep = 'pokeball_consumption';
            // Step 4: Consume a pokeball (check if user has pokeballs)
            const remainingPokeballs = await this.consumePokeball(currentUser.email);
            console.log('🎯 CATCH-SERVICE: Pokeball consumed. Remaining:', remainingPokeballs);
            
            currentStep = 'entry_creation';
            // Step 5: Create Pokedex entry with lookup relationships
            console.log('🎯 CATCH-SERVICE: Creating entry with userId:', userId, 'pokemonId:', masterPokemon.pokemon_pokemonid);
            const pokedexEntry = this.createPokedexEntry(userId, masterPokemon, options);
            console.log('🎯 CATCH-SERVICE: Pokedex entry:', JSON.stringify(pokedexEntry, null, 2));
            
            currentStep = 'database_insert';
            const result = await this.addToPokedex(pokedexEntry);
            
            console.log('🎯 CATCH-SERVICE: Successfully caught Pokemon!');
            
            return {
                success: true,
                pokemon: {
                    id: result.pokemon_pokedexid,
                    name: masterPokemon.pokemon_name,
                    number: pokemonNumber
                }
            };
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error catching Pokemon:', error);
            console.error('🎯 CATCH-SERVICE: Error details:', {
                pokemonNumber,
                currentStep,
                errorName: error.name,
                errorMessage: error.message,
                errorStack: error.stack,
                timestamp: new Date().toISOString()
            });
            return {
                success: false,
                error: `${error.message} (Failed at: ${currentStep})`,
                debug: {
                    step: currentStep,
                    pokemonNumber,
                    errorType: error.name,
                    timestamp: new Date().toISOString()
                }
            };
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
            console.error('🎯 CATCH-SERVICE: Error getting user contact ID:', error);
            throw error;
        }
    }

    /**
     * Get user's pokeball count from contacts table
     */
    static async getUserPokeballCount(email) {
        try {
            const url = `${this.baseUrl}/contacts?$filter=emailaddress1 eq '${email}'&$select=pokemon_Pokeballs`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.value && data.value.length > 0) {
                const pokeballs = data.value[0].pokemon_Pokeballs;
                // 0 and NULL are the same (no pokeballs)
                return pokeballs || 0;
            }
            return 0;
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error getting user pokeball count:', error);
            return 0;
        }
    }

    /**
     * Consume a pokeball from user's inventory
     */
    static async consumePokeball(email) {
        try {
            // First get user's contact ID
            const userId = await this.getUserContactId(email);
            if (!userId) {
                throw new Error('User not found');
            }

            // Get current pokeball count
            const currentCount = await this.getUserPokeballCount(email);
            if (currentCount <= 0) {
                throw new Error('No pokeballs available');
            }

            // Update pokeball count (decrease by 1)
            const newCount = currentCount - 1;
            const updateData = {
                pokemon_Pokeballs: newCount
            };

            const url = `${this.baseUrl}/contacts(${userId})`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(`Failed to update pokeball count: ${response.status}`);
            }

            console.log(`🎯 CATCH-SERVICE: Consumed pokeball. New count: ${newCount}`);
            return newCount;
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error consuming pokeball:', error);
            throw error;
        }
    }

    /**
     * Add pokeballs to user's inventory (reward from minigame)
     */
    static async addPokeballs(email, count = 1) {
        try {
            // First get user's contact ID
            const userId = await this.getUserContactId(email);
            if (!userId) {
                throw new Error('User not found');
            }

            // Get current pokeball count
            const currentCount = await this.getUserPokeballCount(email);
            const newCount = currentCount + count;
            
            const updateData = {
                pokemon_Pokeballs: newCount
            };

            const url = `${this.baseUrl}/contacts(${userId})`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(`Failed to update pokeball count: ${response.status}`);
            }

            console.log(`🎯 CATCH-SERVICE: Added ${count} pokeball(s). New count: ${newCount}`);
            return newCount;
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error adding pokeballs:', error);
            throw error;
        }
    }
    
    /**
     * Get master Pokemon data by number
     */
    static async getMasterPokemon(pokemonNumber) {
        try {
            const url = `${this.baseUrl}/pokemon_pokemons?$filter=pokemon_id eq ${pokemonNumber}&$select=pokemon_pokemonid,pokemon_name,pokemon_id`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.value && data.value.length > 0 ? data.value[0] : null;
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error getting master Pokemon:', error);
            throw error;
        }
    }
    
    /**
     * Check if user already has this Pokemon
     */
    static async checkExistingPokemon(userId, masterPokemonId) {
        try {
            const url = `${this.baseUrl}/pokemon_pokedexes?$filter=_pokemon_user_value eq '${userId}' and _pokemon_pokemon_value eq '${masterPokemonId}'&$select=pokemon_pokedexid`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.value && data.value.length > 0;
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error checking existing Pokemon:', error);
            // Don't throw here - allow catching even if check fails
            return false;
        }
    }
    
    /**
     * Create Pokedex entry with lookup relationships using @odata.bind
     */
    static createPokedexEntry(userId, masterPokemon, options = {}) {
        // Clean GUIDs (remove braces if present)
        const cleanUserId = userId.replace(/[{}]/g, '');
        const cleanPokemonId = masterPokemon.pokemon_pokemonid.replace(/[{}]/g, '');
        
        return {
            // Associate with existing contact and pokemon using @odata.bind (trying Pascal case)
            "pokemon_User@odata.bind": `/contacts(${cleanUserId})`,
            "pokemon_Pokemon@odata.bind": `/pokemon_pokemons(${cleanPokemonId})`,
            
            // Pokemon name
            pokemon_name: masterPokemon.pokemon_name
        };
    }
    
    /**
     * Add Pokemon to Pokedex table
     */
    static async addToPokedex(pokedexEntry) {
        try {
            const url = `${this.baseUrl}/pokemon_pokedexes`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pokedexEntry)
            });
            
            console.log('🎯 CATCH-SERVICE: Response status:', response.status);
            console.log('🎯 CATCH-SERVICE: Response headers:', Object.fromEntries(response.headers.entries()));
            
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // Handle different success response types from Dataverse
            if (response.status === 204) {
                // 204 No Content - successful creation with no body
                console.log('🎯 CATCH-SERVICE: Pokemon created successfully (204 No Content)');
                
                // Extract ID from Location header if available
                const locationHeader = response.headers.get('Location') || response.headers.get('OData-EntityId');
                let createdId = null;
                
                if (locationHeader) {
                    // Extract GUID from URL like: .../pokemon_pokedexes(guid-here)
                    const match = locationHeader.match(/pokemon_pokedexes\(([^)]+)\)/);
                    if (match) {
                        createdId = match[1];
                    }
                }
                
                return {
                    pokemon_pokedexid: createdId || 'created-successfully',
                    success: true
                };
            } else {
                // Try to parse JSON response (201 Created, etc.)
                try {
                    return await response.json();
                } catch (jsonError) {
                    console.log('🎯 CATCH-SERVICE: Could not parse response as JSON, but creation was successful');
                    return {
                        pokemon_pokedexid: 'created-successfully',
                        success: true
                    };
                }
            }
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error adding to Pokedex:', error);
            throw error;
        }
    }
    
    /**
     * Get user's caught Pokemon count for stats
     */
    static async getUserPokemonCount(email) {
        try {
            const userId = await this.getUserContactId(email);
            if (!userId) return 0;
            
            const url = `${this.baseUrl}/pokemon_pokedexes?$filter=_pokemon_user_value eq '${userId}'&$count=true`;
            const response = await fetch(url);
            
            if (!response.ok) return 0;
            
            const data = await response.json();
            return data['@odata.count'] || data.value?.length || 0;
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error getting Pokemon count:', error);
            return 0;
        }
    }
    
    /**
     * Get user's Pokemon collection
     */
    static async getUserPokemon(email) {
        try {
            const userId = await this.getUserContactId(email);
            if (!userId) return [];
            
            const url = `${this.baseUrl}/pokemon_pokedexes?$filter=_pokemon_user_value eq '${userId}'&$expand=pokemon_pokemon($select=pokemon_name,pokemon_id)&$orderby=createdon desc`;
            const response = await fetch(url);
            
            if (!response.ok) return [];
            
            const data = await response.json();
            return data.value || [];
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error getting user Pokemon:', error);
            return [];
        }
    }
}
