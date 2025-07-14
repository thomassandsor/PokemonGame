// Pokemon Catch Service - Handles adding Pokemon to user's Pokedex
class CatchPokemonService {
    static baseUrl = 'https://pokemongame-functions-2025.azurewebsites.net/api/dataverse';
    
    /**
     * Catch a Pokemon and add it to user's Pokedex
     * @param {number} pokemonNumber - Pokemon ID from QR code
     * @param {Object} options - Optional catch parameters
     * @returns {Promise<Object>} Result of catch operation
     */
    static async catchPokemon(pokemonNumber, options = {}) {
        try {
            console.log('🎯 CATCH-SERVICE: Starting catch process for Pokemon #' + pokemonNumber);
            
            // Get current user info
            const currentUser = AuthService.getCurrentUser();
            if (!currentUser || !currentUser.email) {
                throw new Error('User not authenticated');
            }
            
            console.log('🎯 CATCH-SERVICE: User authenticated:', currentUser.email);
            
            // Step 1: Get user's contact ID from Dataverse
            const userId = await this.getUserContactId(currentUser.email);
            if (!userId) {
                throw new Error('Unable to find user in system');
            }
            
            console.log('🎯 CATCH-SERVICE: Found user contact ID:', userId);
            
            // Step 2: Find the master Pokemon record
            const masterPokemon = await this.getMasterPokemon(pokemonNumber);
            if (!masterPokemon) {
                throw new Error(`Pokemon #${pokemonNumber} not found in master data`);
            }
            
            console.log('🎯 CATCH-SERVICE: Found master Pokemon:', masterPokemon.pokemon_name);
            
            // Step 3: Check if user already has this Pokemon
            const existingPokemon = await this.checkExistingPokemon(userId, masterPokemon.pokemon_pokemonid);
            if (existingPokemon) {
                throw new Error(`You already have ${masterPokemon.pokemon_name} in your collection!`);
            }
            
            // Step 4: Create Pokedex entry with smart defaults
            const pokedexEntry = this.createPokedexEntry(userId, masterPokemon, options);
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
            return {
                success: false,
                error: error.message
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
     * Create Pokedex entry with only required fields plus Pokemon name
     */
    static createPokedexEntry(userId, masterPokemon, options = {}) {
        return {
            // Required relationships - using direct lookup values
            "_pokemon_user_value": userId,
            "_pokemon_pokemon_value": masterPokemon.pokemon_pokemonid,
            
            // Pokemon name (extra field)
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
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            return await response.json();
            
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
