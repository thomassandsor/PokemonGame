// Pokemon Catch Service - Handles adding Pokemon to user's Pokedex
class CatchPokemonService {
    // Environment-aware base URL configuration
    static get baseUrl() {
        // Check if we're running in production (Azure Static Web Apps)
        if (window.location.hostname.includes('azurestaticapps.net')) {
            // Production: Use Azure Functions URL
            return 'https://pokemongame-functions-2025.azurewebsites.net/api/dataverse';
        }
        // Development: Use local proxy
        return '/api/dataverse';
    }
    
    /**
     * Fetch with timeout and authentication for mobile reliability
     */
    static async fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
            console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
            console.log(`🌍 Environment: ${window.location.hostname.includes('azurestaticapps.net') ? 'Production' : 'Development'}`);
            
            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser || !authUser.token) {
                console.error('CATCH-SERVICE: No authenticated user or token found');
                throw new Error('Authentication required to access Pokemon data');
            }
            
            // Add authentication headers
            const secureOptions = {
                ...options,
                signal: controller.signal,
                mode: 'cors',
                credentials: 'omit',
                headers: {
                    'Authorization': `Bearer ${authUser.token}`,
                    'Content-Type': 'application/json',
                    'X-User-Email': authUser.email,
                    ...options.headers
                }
            };
            
            const response = await fetch(url, secureOptions);
            
            clearTimeout(timeoutId);
            
            console.log(`📡 API Response: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                // Log more details about the error for debugging
                let errorDetails = `HTTP ${response.status}`;
                try {
                    const errorText = await response.text();
                    console.error(`❌ API Error Details:`, errorText);
                    errorDetails += ` - ${errorText}`;
                } catch (e) {
                    console.error(`❌ API Error (no details available)`);
                }
                throw new Error(errorDetails);
            }
            
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out - please check your connection');
            }
            console.error(`🚨 Fetch error for ${url}:`, error);
            throw error;
        }
    }

    /**
     * Validate OData query URL for mobile compatibility
     */
    static validateODataQuery(url, description = 'Query') {
        if (url.length > 2048) {
            console.warn(`🎯 CATCH-SERVICE: ${description} URL too long (${url.length} chars), may fail on mobile`);
            return false;
        }
        
        // Check for problematic characters or syntax
        if (url.includes('undefined') || url.includes('null')) {
            console.error(`🎯 CATCH-SERVICE: ${description} contains undefined/null values`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Catch a Pokemon via minigame completion (no pokeball consumption)
     * @param {number} pokemonNumber - Pokemon ID from QR code
     * @param {Object} userData - Optional pre-fetched user data from getUserData()
     * @param {Object} pokemonJsonData - Full Pokemon JSON data with stats (optional)
     * @returns {Promise<Object>} Result of catch operation
     */
    static async catchPokemonViaMinigame(pokemonNumber, userData = null, pokemonJsonData = null) {
        let currentStep = 'initialization';
        console.time('🎮 MINIGAME-CATCH: Total catch time');
        try {
            console.log('🎮 MINIGAME-CATCH: Starting minigame catch for Pokemon #' + pokemonNumber);
            
            // Use pre-fetched user data if available, otherwise fetch it
            let userInfo = userData;
            if (!userInfo) {
                currentStep = 'user_data_fetch';
                userInfo = await this.getUserData();
                if (!userInfo || !userInfo.userId) {
                    throw new Error('Unable to get user information');
                }
            }
            
            console.log('🎮 MINIGAME-CATCH: Using user data:', userInfo.userId);
            
            currentStep = 'pokemon_lookup';
            // Find the master Pokemon record
            const masterPokemon = await this.getMasterPokemon(pokemonNumber);
            if (!masterPokemon) {
                throw new Error(`Pokemon #${pokemonNumber} not found in master data`);
            }
            
            console.log('🎮 MINIGAME-CATCH: Found master Pokemon:', masterPokemon.pokemon_name);
            
            // Skip pokeball check and consumption for minigame catches
            console.log('🎮 MINIGAME-CATCH: Skipping pokeball consumption - minigame reward');
            
            currentStep = 'entry_creation';
            // Create Pokedex entry with lookup relationships
            console.log('🎮 MINIGAME-CATCH: Creating entry with userId:', userInfo.userId, 'pokemonId:', masterPokemon.pokemon_pokemonid);
            const pokedexEntry = this.createPokedexEntry(userInfo.userId, masterPokemon, { minigame: true }, pokemonJsonData);
            console.log('🎮 MINIGAME-CATCH: Pokedex entry:', JSON.stringify(pokedexEntry, null, 2));
            
            currentStep = 'database_insert';
            console.time('🎮 MINIGAME-CATCH: Database insert timing');
            const result = await this.addToPokedex(pokedexEntry);
            console.timeEnd('🎮 MINIGAME-CATCH: Database insert timing');
            
            console.log('🎮 MINIGAME-CATCH: Successfully caught Pokemon via minigame!');
            console.timeEnd('🎮 MINIGAME-CATCH: Total catch time');
            
            return {
                success: true,
                pokemon: {
                    id: result.pokemon_pokedexid,
                    name: masterPokemon.pokemon_name,
                    number: pokemonNumber
                }
            };
            
        } catch (error) {
            console.error('🎮 MINIGAME-CATCH: Error catching Pokemon:', error);
            console.error('🎮 MINIGAME-CATCH: Error details:', {
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
     * Catch a Pokemon and add it to user's Pokedex - Optimized version
     * @param {number} pokemonNumber - Pokemon ID from QR code
     * @param {Object} userData - Pre-fetched user data from getUserData()
     * @param {Object} options - Optional catch parameters
     * @param {Object} pokemonJsonData - Full Pokemon JSON data with stats (optional)
     * @returns {Promise<Object>} Result of catch operation
     */
    static async catchPokemonOptimized(pokemonNumber, userData, options = {}, pokemonJsonData = null) {
        let currentStep = 'initialization';
        try {
            console.log('🎯 CATCH-SERVICE: Starting optimized catch process for Pokemon #' + pokemonNumber);
            
            // Skip user lookup and duplicate check - already done in QR detection
            console.log('🎯 CATCH-SERVICE: Using pre-fetched user data:', userData.userId);
            
            currentStep = 'pokemon_lookup';
            // Find the master Pokemon record
            const masterPokemon = await this.getMasterPokemon(pokemonNumber);
            if (!masterPokemon) {
                throw new Error(`Pokemon #${pokemonNumber} not found in master data`);
            }
            
            console.log('🎯 CATCH-SERVICE: Found master Pokemon:', masterPokemon.pokemon_name);
            
            currentStep = 'pokeball_consumption';
            // Use optimized method with pre-fetched data
            console.log('🎯 CATCH-SERVICE: User has', userData.pokeballCount, 'pokeballs, consuming 1...');
            await this.consumePokeballOptimized(userData.userId, userData.pokeballCount);
            
            currentStep = 'entry_creation';
            // Create Pokedex entry with lookup relationships
            console.log('🎯 CATCH-SERVICE: Creating entry with userId:', userData.userId, 'pokemonId:', masterPokemon.pokemon_pokemonid);
            const pokedexEntry = this.createPokedexEntry(userData.userId, masterPokemon, options, pokemonJsonData);
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

            currentStep = 'pokeball_check';
            // Step 4: Check if user has pokeballs and consume one (optimized)
            const pokeballCount = await this.getUserPokeballCount(currentUser.email);
            if (pokeballCount <= 0) {
                throw new Error('You need at least 1 Pokeball to catch a Pokemon!');
            }
            
            console.log('🎯 CATCH-SERVICE: User has', pokeballCount, 'pokeballs, consuming 1...');
            
            currentStep = 'pokeball_consumption';
            // Use optimized method that doesn't repeat database calls
            await this.consumePokeballOptimized(userId, pokeballCount);
            
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
     * Get comprehensive user data in one query (contact info + Pokemon collection)
     * @param {string} email - User's email address
     * @returns {Promise<Object>} User data including contactid, pokeballs, and owned Pokemon numbers
     */
    static async getUserData(email) {
        try {
            console.log('🎯 CATCH-SERVICE: Getting comprehensive user data for:', email);
            
            // First get user contact info with pokeball count
            const contactUrl = `${this.baseUrl}/contacts?$filter=emailaddress1 eq '${email}'&$select=contactid,pokemon_pokeballs`;
            console.log('🎯 CATCH-SERVICE: Contact URL:', contactUrl);
            
            const contactResponse = await this.fetchWithTimeout(contactUrl);
            console.log('🎯 CATCH-SERVICE: Contact response status:', contactResponse.status);
            
            if (!contactResponse.ok) {
                throw new Error(`HTTP ${contactResponse.status}: ${contactResponse.statusText}`);
            }
            
            console.log('🎯 CATCH-SERVICE: Parsing contact response as JSON...');
            let contactData;
            try {
                contactData = await contactResponse.json();
                console.log('🎯 CATCH-SERVICE: Contact data:', contactData);
            } catch (jsonError) {
                console.error('🎯 CATCH-SERVICE: Failed to parse contact response as JSON:', jsonError);
                throw new Error(`Failed to parse contact data response: ${jsonError.message}`);
            }
            
            if (!contactData.value || contactData.value.length === 0) {
                throw new Error('User not found');
            }
            
            const contact = contactData.value[0];
            const userId = contact.contactid;
            const pokeballCount = contact.pokemon_pokeballs || 0;
            
            console.log('🎯 CATCH-SERVICE: User basic info:', { userId, pokeballCount });
            
            // Get user's Pokemon collection using simple approach without $expand
            console.log('🎯 CATCH-SERVICE: Fetching user Pokemon collection...');
            
            let ownedPokemonNumbers = [];
            try {
                // Query user's pokedex entries with Pokemon lookup field
                const pokemonUrl = `${this.baseUrl}/pokemon_pokedexes?$filter=_pokemon_user_value eq '${userId}'&$select=_pokemon_pokemon_value`;
                console.log('🎯 CATCH-SERVICE: Pokemon collection URL:', pokemonUrl);
                
                // Validate the OData query
                if (!this.validateODataQuery(pokemonUrl, 'Pokemon collection')) {
                    throw new Error('Invalid OData query format');
                }
                
                const pokemonResponse = await this.fetchWithTimeout(pokemonUrl);
                console.log('🎯 CATCH-SERVICE: Pokemon response status:', pokemonResponse.status);
                
                if (!pokemonResponse.ok) {
                    throw new Error(`Pokemon query failed: HTTP ${pokemonResponse.status}: ${pokemonResponse.statusText}`);
                }
                
                console.log('🎯 CATCH-SERVICE: Parsing Pokemon response as JSON...');
                let pokemonData;
                try {
                    pokemonData = await pokemonResponse.json();
                    console.log('🎯 CATCH-SERVICE: Pokemon collection raw data:', pokemonData);
                } catch (jsonError) {
                    console.error('🎯 CATCH-SERVICE: Failed to parse Pokemon response as JSON:', jsonError);
                    throw new Error(`Failed to parse Pokemon collection response: ${jsonError.message}`);
                }
                
                if (pokemonData.value && pokemonData.value.length > 0) {
                    // Get the master Pokemon IDs that user owns
                    const ownedMasterIds = pokemonData.value.map(entry => entry._pokemon_pokemon_value).filter(id => id);
                    console.log('🎯 CATCH-SERVICE: Owned master Pokemon IDs:', ownedMasterIds);
                    
                    // Now get the Pokemon numbers for these master IDs
                    if (ownedMasterIds.length > 0) {
                        const masterIdsFilter = ownedMasterIds.map(id => `pokemon_pokemonid eq '${id}'`).join(' or ');
                        const masterUrl = `${this.baseUrl}/pokemon_pokemons?$filter=${masterIdsFilter}&$select=pokemon_id,pokemon_pokemonid`;
                        
                        // Validate OData query before attempting
                        if (!this.validateODataQuery(masterUrl, 'Master Pokemon lookup')) {
                            console.warn('🎯 CATCH-SERVICE: OData query invalid, falling back to simplified approach');
                            ownedPokemonNumbers = []; // Skip duplicate check rather than risk mobile failure
                        } else {
                            console.log('🎯 CATCH-SERVICE: Master Pokemon lookup URL:', masterUrl);
                            
                            const masterResponse = await this.fetchWithTimeout(masterUrl);
                            console.log('🎯 CATCH-SERVICE: Master response status:', masterResponse.status);
                            
                            if (masterResponse.ok) {
                                console.log('🎯 CATCH-SERVICE: Parsing master response as JSON...');
                                let masterData;
                                try {
                                    masterData = await masterResponse.json();
                                    console.log('🎯 CATCH-SERVICE: Master data:', masterData);
                                } catch (jsonError) {
                                    console.error('🎯 CATCH-SERVICE: Failed to parse master response as JSON:', jsonError);
                                    console.warn('🎯 CATCH-SERVICE: Master Pokemon lookup failed due to JSON parse error, duplicate check may not work');
                                    ownedPokemonNumbers = [];
                                    return; // Exit this block and continue
                                }
                                ownedPokemonNumbers = masterData.value.map(pokemon => pokemon.pokemon_id).filter(id => id);
                                console.log('🎯 CATCH-SERVICE: Owned Pokemon numbers:', ownedPokemonNumbers);
                            } else {
                                console.warn('🎯 CATCH-SERVICE: Master Pokemon lookup failed, duplicate check may not work');
                                ownedPokemonNumbers = [];
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('🎯 CATCH-SERVICE: Error fetching Pokemon collection:', error);
                console.log('🎯 CATCH-SERVICE: Duplicate checking will happen during actual catch process');
                ownedPokemonNumbers = []; // Fall back to empty array
            }
            
            const result = {
                userId,
                email,
                pokeballCount,
                ownedPokemonNumbers
            };
            
            console.log('🎯 CATCH-SERVICE: Final user data result:', result);
            
            return result;
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error getting user data:', error);
            console.error('🎯 CATCH-SERVICE: Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                email: email
            });
            throw new Error(`Failed to get user data for ${email}: ${error.message}`);
        }
    }

    /**
     * Get user's contact ID from email
     */
    static async getUserContactId(email) {
        try {
            const url = `${this.baseUrl}/contacts?$filter=emailaddress1 eq '${email}'&$select=contactid`;
            const response = await this.fetchWithTimeout(url);
            
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
     * Check if a Pokemon can be caught by the user
     * @param {number} pokemonNumber - Pokemon ID from QR code
     * @param {Object} userData - Pre-fetched user data from getUserData()
     * @returns {Object} Result with canCatch boolean and reason if not
     */
    static canCatchPokemon(pokemonNumber, userData) {
        // Check if user already has this Pokemon (only if we have the data)
        if (userData.ownedPokemonNumbers && userData.ownedPokemonNumbers.length > 0) {
            if (userData.ownedPokemonNumbers.includes(pokemonNumber)) {
                return {
                    canCatch: false,
                    reason: 'duplicate',
                    message: `You already have Pokemon #${pokemonNumber} in your collection!`
                };
            }
        } else {
            console.warn('🎯 CATCH-SERVICE: No Pokemon collection data available, skipping duplicate check');
        }
        
        return {
            canCatch: true,
            reason: null,
            message: null
        };
    }

    /**
     * Check if a Pokemon can be caught with pokeballs
     * @param {number} pokemonNumber - Pokemon ID from QR code  
     * @param {Object} userData - Pre-fetched user data from getUserData()
     * @returns {Object} Result with canCatch boolean and reason if not
     */
    static canCatchWithPokeball(pokemonNumber, userData) {
        // First check if Pokemon can be caught at all
        const basicCheck = this.canCatchPokemon(pokemonNumber, userData);
        if (!basicCheck.canCatch) {
            return basicCheck;
        }
        
        // Check if user has pokeballs
        if (userData.pokeballCount <= 0) {
            return {
                canCatch: false,
                reason: 'no_pokeballs',
                message: 'You need at least 1 Pokeball to catch a Pokemon!'
            };
        }
        
        return {
            canCatch: true,
            reason: null,
            message: null
        };
    }

    /**
     * Get user's pokeball count from contacts table
     */
    static async getUserPokeballCount(email) {
        try {
            const url = `${this.baseUrl}/contacts?$filter=emailaddress1 eq '${email}'&$select=pokemon_pokeballs`;
            const response = await this.fetchWithTimeout(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Debug: Log the raw response text before parsing
            const responseText = await response.text();
            console.log(`🎯 CATCH-SERVICE: Raw response text:`, responseText.substring(0, 200) + '...');
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('🎯 CATCH-SERVICE: JSON parse error:', parseError);
                console.error('🎯 CATCH-SERVICE: Response text:', responseText);
                throw new Error('Invalid JSON response from server');
            }
            
            if (data.value && data.value.length > 0) {
                const contact = data.value[0];
                const pokeballs = contact.pokemon_pokeballs || 0;
                
                console.log(`🎯 CATCH-SERVICE: Found pokeball count: ${pokeballs}`);
                return pokeballs;
            }
            
            // User not found
            throw new Error('User not found');
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error getting user pokeball count:', error);
            console.log('🎯 CATCH-SERVICE: Defaulting to 0 pokeballs due to error');
            return 0; // Default to 0 on any error
        }
    }

    /**
     * Consume a pokeball from user's inventory
     */
    static async consumePokeball(email) {
        try {
            // We already have userId and currentCount from the main catch function
            // This is inefficient - let's optimize by passing these values instead
            console.log('🎯 CATCH-SERVICE: consumePokeball() called - this method should be optimized');
            
            // For now, get the data again (but this is a performance issue)
            const userId = await this.getUserContactId(email);
            if (!userId) {
                throw new Error('User not found');
            }

            // Get current pokeball count
            const currentCount = await this.getUserPokeballCount(email);
            if (currentCount <= 0) {
                throw new Error('No pokeballs available');
            }

            // Update pokeball count (decrease by 1) using correct PATCH method
            const newCount = currentCount - 1;
            const updateData = { pokemon_pokeballs: newCount };
            const url = `${this.baseUrl}/contacts(${userId})`;
            
            console.log(`🎯 CATCH-SERVICE: Attempting to update pokeball count from ${currentCount} to ${newCount}`);
            console.log(`🎯 CATCH-SERVICE: Update URL: ${url}`);
            console.log(`🎯 CATCH-SERVICE: Update data:`, updateData);
            
            // Use PATCH method as per Microsoft Dataverse documentation
            const response = await this.fetchWithTimeout(url, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'If-Match': '*' // Ensures we don't accidentally create a new record
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                console.error(`🎯 CATCH-SERVICE: PATCH failed with status ${response.status}`);
                const errorText = await response.text();
                console.error(`🎯 CATCH-SERVICE: Error details: ${errorText}`);
                
                // If PATCH fails, let's just log the consumption but not update the database
                console.log(`🎯 CATCH-SERVICE: Cannot update database, but allowing Pokemon catch to proceed`);
                console.log(`🎯 CATCH-SERVICE: Virtual pokeball consumed. Would be: ${newCount}`);
                return newCount;
            }

            console.log(`🎯 CATCH-SERVICE: Successfully consumed pokeball. New count: ${newCount}`);
            return newCount;
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error consuming pokeball:', error);
            
            // Don't throw error - just log it and allow catch to proceed
            console.log('🎯 CATCH-SERVICE: Allowing catch to proceed despite pokeball update failure');
            return 0; // Return 0 to indicate pokeball was "consumed" but not updated in DB
        }
    }

    /**
     * Optimized version that accepts pre-fetched data
     */
    static async consumePokeballOptimized(userId, currentCount) {
        try {
            if (currentCount <= 0) {
                throw new Error('No pokeballs available');
            }

            const newCount = currentCount - 1;
            const updateData = { pokemon_pokeballs: newCount };
            const url = `${this.baseUrl}/contacts(${userId})`;
            
            console.log(`🎯 CATCH-SERVICE: [OPTIMIZED] Updating pokeball count from ${currentCount} to ${newCount}`);
            
            const response = await this.fetchWithTimeout(url, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'If-Match': '*'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`🎯 CATCH-SERVICE: PATCH failed with status ${response.status}: ${errorText}`);
                return currentCount; // Return original count if update fails
            }

            console.log(`🎯 CATCH-SERVICE: [OPTIMIZED] Successfully consumed pokeball. New count: ${newCount}`);
            return newCount;
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error in optimized pokeball consumption:', error);
            return currentCount; // Return original count on error
        }
    }

    /**
     * Get master Pokemon data by number
     */
    static async getMasterPokemon(pokemonNumber) {
        try {
            const url = `${this.baseUrl}/pokemon_pokemons?$filter=pokemon_id eq ${pokemonNumber}&$select=pokemon_pokemonid,pokemon_name,pokemon_id`;
            const response = await this.fetchWithTimeout(url);
            
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
            const response = await this.fetchWithTimeout(url);
            
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
    static createPokedexEntry(userId, masterPokemon, options = {}, pokemonJsonData = null) {
        // Clean GUIDs (remove braces if present)
        const cleanUserId = userId.replace(/[{}]/g, '');
        const cleanPokemonId = masterPokemon.pokemon_pokemonid.replace(/[{}]/g, '');
        
        const entry = {
            // Associate with existing contact and pokemon using @odata.bind (trying Pascal case)
            "pokemon_User@odata.bind": `/contacts(${cleanUserId})`,
            "pokemon_Pokemon@odata.bind": `/pokemon_pokemons(${cleanPokemonId})`,
            
            // Pokemon name
            pokemon_name: masterPokemon.pokemon_name,
            
            // Set level to 1 as requested
            pokemon_level: 1
        };

        // Extract and add stats from Pokemon JSON data if available
        if (pokemonJsonData && pokemonJsonData.stats) {
            // Add stats back now that basic entry works
            console.log('🎯 CATCH-SERVICE: Pokemon JSON data available, adding all stats');
            
            // Find HP stat
            const hpStat = pokemonJsonData.stats.find(s => s.name === 'hp');
            if (hpStat) {
                entry.pokemon_hp = hpStat.base_stat; // Current HP
                entry.pokemon_hpmax = hpStat.base_stat; // Max HP
            }

            // Find attack stat
            const attackStat = pokemonJsonData.stats.find(s => s.name === 'attack');
            if (attackStat) {
                entry.pokemon_attack = attackStat.base_stat;
            }

            // Find defense stat
            const defenseStat = pokemonJsonData.stats.find(s => s.name === 'defense');
            if (defenseStat) {
                entry.pokemon_defence = defenseStat.base_stat; // British spelling used in Dataverse
            }

            console.log('🎯 CATCH-SERVICE: Added Pokemon stats - HP:', entry.pokemon_hp, 'Max HP:', entry.pokemon_hpmax, 'Attack:', entry.pokemon_attack, 'Defence:', entry.pokemon_defence);
        } else {
            console.log('🎯 CATCH-SERVICE: No Pokemon JSON data provided, skipping stats');
        }

        return entry;
    }
    
    /**
     * Add Pokemon to Pokedex table
     */
    static async addToPokedex(pokedexEntry) {
        try {
            const url = `${this.baseUrl}/pokemon_pokedexes`;
            console.time('🎯 CATCH-SERVICE: Dataverse POST request');
            const response = await this.fetchWithTimeout(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pokedexEntry)
            });
            console.timeEnd('🎯 CATCH-SERVICE: Dataverse POST request');
            
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
            const response = await this.fetchWithTimeout(url);
            
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
            const response = await this.fetchWithTimeout(url);
            
            if (!response.ok) return [];
            
            const data = await response.json();
            return data.value || [];
            
        } catch (error) {
            console.error('🎯 CATCH-SERVICE: Error getting user Pokemon:', error);
            return [];
        }
    }
}
