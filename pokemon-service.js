// Pokemon Service for loading REAL Pokemon data from Dataverse
class PokemonService {
    
    // Environment-aware base URL configuration
    static get baseUrl() {
        // Check if we're running in production (Azure Static Web Apps)
        if (window.location.hostname.includes('azurestaticapps.net')) {
            // Production: Use Azure Functions URL
            return 'https://pokemongame-functions-2025.azurewebsites.net/api/dataverse';
        }
        // Development: Use local Azure Functions server on port 7071
        return 'http://localhost:7071/api/dataverse';
    }
    
    // Check if we're in development mode (localhost)
    static isDevelopmentMode() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }
    
    // Get caught Pokemon from REAL Dataverse via DataverseProxy.cs
    static async getCaughtPokemon(email) {
        try {
            console.log('POKEMON-SERVICE: Loading caught Pokemon for:', email);
            
            // Get authentication token first
            const authUser = AuthService.getCurrentUser();
            if (!authUser || !authUser.token) {
                console.error('POKEMON-SERVICE: No authenticated user or token found');
                throw new Error('Authentication required to access Pokemon data');
            }
            
            // ALWAYS try to get real data first, regardless of development mode
            console.log('POKEMON-SERVICE: Attempting to load REAL data from Dataverse...');
            
            // First, get the user's contact ID from their email
            console.log('POKEMON-SERVICE: Looking up user contact ID for email:', email);
            
            
            const contactUrl = `${this.baseUrl}/contacts?$filter=emailaddress1 eq '${email}'&$select=contactid`;
            
            let userId;
            try {
                const contactResponse = await fetch(contactUrl, {
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Authorization': `Bearer ${authUser.token}`,
                        'Content-Type': 'application/json',
                        'X-User-Email': authUser.email  // Additional verification
                    }
                });
                if (!contactResponse.ok) {
                    console.error('POKEMON-SERVICE: Failed to lookup user contact:', contactResponse.status);
                    return [];
                }
                
                const contactData = await contactResponse.json();
                if (!contactData.value || contactData.value.length === 0) {
                    console.log('POKEMON-SERVICE: No contact found for email:', email);
                    return [];
                }
                
                userId = contactData.value[0].contactid;
                console.log('POKEMON-SERVICE: Found user contact ID:', userId);
            } catch (error) {
                console.error('POKEMON-SERVICE: Error looking up user contact:', error);
                return [];
            }

            // Get Pokemon from pokedex table - this will work in Azure deployment
            console.log('POKEMON-SERVICE: Making authenticated request to Dataverse...');
            
            const url = `${this.baseUrl}/pokemon_pokedexes?$filter=_pokemon_user_value eq '${userId}'`;
            console.log('POKEMON-SERVICE: URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                headers: {
                    'Authorization': `Bearer ${authUser.token}`,
                    'Content-Type': 'application/json',
                    'X-User-Email': authUser.email  // Additional verification
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('POKEMON-SERVICE: Got real Pokemon data from Dataverse:', data);
                console.log('POKEMON-SERVICE: Sample Pokemon fields:', data.value?.[0]);
                
                // Map Dataverse field names to expected format
                const mappedPokemon = (data.value || []).map(p => {
                    console.log('POKEMON-SERVICE: Mapping Pokemon:', p.pokemon_name, {
                        hp: p.pokemon_hp,
                        currentHP: p.pokemon_currenthp,
                        maxHP: p.pokemon_maxhp,
                        attack: p.pokemon_attack,
                        defense: p.pokemon_defense,
                        defence: p.pokemon_defence,
                        level: p.pokemon_level
                    });
                    
                    return {
                        name: p.pokemon_name,
                        level: p.pokemon_level,
                        hp: p.pokemon_hp,
                        currentHP: p.pokemon_currenthp || p.pokemon_hp, // Try both field names
                        maxHP: p.pokemon_maxhp || p.pokemon_hp, // Try both field names
                        attack: p.pokemon_attack,
                        defense: p.pokemon_defense || p.pokemon_defence, // Try both spellings
                        defence: p.pokemon_defence || p.pokemon_defense, // Keep both for compatibility
                        height: p.pokemon_height,
                        weight: p.pokemon_weight,
                        pokedexid: p.pokemon_pokedexid,
                        dateCaught: p.createdon,
                        userId: p._pokemon_user_value
                    };
                });
                
                console.log('POKEMON-SERVICE: Mapped Pokemon data:', mappedPokemon);
                return mappedPokemon;
            } else {
                console.error('POKEMON-SERVICE: HTTP ERROR - Status:', response.status, 'StatusText:', response.statusText);
                console.error('POKEMON-SERVICE: Failed URL was:', url);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('POKEMON-SERVICE: DETAILED ERROR loading Pokemon:', error);
            console.error('POKEMON-SERVICE: Error type:', error.name);
            console.error('POKEMON-SERVICE: Error message:', error.message);
            console.error('POKEMON-SERVICE: This is likely a CORS error preventing localhost from accessing Azure Functions');
            
            // Re-throw the error so the UI can show the real error to the user
            throw error;
        }
    }

    // Get Pokemon details from PokeAPI
    static async getPokemonDetails(pokemonNameOrId) {
        try {
            console.log('POKEMON-SERVICE: Getting Pokemon details for:', pokemonNameOrId);
            
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonNameOrId.toLowerCase()}`);
            
            if (response.ok) {
                const pokemon = await response.json();
                console.log('POKEMON-SERVICE: Got Pokemon details:', pokemon.name);
                
                return {
                    id: pokemon.id,
                    name: pokemon.name,
                    sprite: pokemon.sprites.front_default,
                    height: pokemon.height,
                    weight: pokemon.weight,
                    types: pokemon.types.map(type => type.type.name),
                    stats: pokemon.stats.map(stat => ({
                        name: stat.stat.name,
                        value: stat.base_stat
                    }))
                };
            } else {
                console.error('POKEMON-SERVICE: Failed to get Pokemon details:', response.status);
                return null;
            }
        } catch (error) {
            console.error('POKEMON-SERVICE: Error getting Pokemon details:', error);
            return null;
        }
    }

    // Get all available Pokemon from JSON file only
    static async getAllPokemon(offset = 0, limit = 20) {
        try {
            console.log('POKEMON-SERVICE: Loading Pokemon from JSON cache...');
            console.log('POKEMON-SERVICE: Pagination - offset:', offset, 'limit:', limit);
            
            // Ensure cache is loaded
            if (!PokemonService._allPokemonCache) {
                console.log('POKEMON-SERVICE: Cache not ready, loading all Pokemon...');
                await this.loadAndCacheAllPokemon();
            }
            
            // Return paginated results from cache
            const startIndex = offset;
            const endIndex = offset + limit;
            const pagePokemons = PokemonService._allPokemonCache.slice(startIndex, endIndex);
            const hasMore = endIndex < PokemonService._allPokemonCache.length;
            
            console.log('POKEMON-SERVICE: Returning cached page:', pagePokemons.length, 'Pokemon');
            console.log('POKEMON-SERVICE: Cache total:', PokemonService._allPokemonCache.length);
            console.log('POKEMON-SERVICE: Has more?', hasMore);
            
            return {
                pokemon: pagePokemons,
                hasMore: hasMore,
                tableName: 'json_cache'
            };
            
        } catch (error) {
            console.error('POKEMON-SERVICE: ERROR loading Pokemon:', error);
            throw error;
        }
    }

    // Helper method to load and cache all Pokemon data (background operation)
    static async loadAndCacheAllPokemon() {
        try {
            if (PokemonService._allPokemonCache) {
                console.log('POKEMON-SERVICE: Cache already exists, skipping load');
                return;
            }
            
            console.log('POKEMON-SERVICE: Loading ALL Pokemon for caching...');
            
            // Load from enhanced JSON file - NO FALLBACKS, fail fast if this doesn't work
            console.log('POKEMON-SERVICE: Loading from enhanced JSON file');
            const response = await fetch('/src/data/pokemon.json');
            
            if (!response.ok) {
                throw new Error(`Failed to load Pokemon JSON file: ${response.status} ${response.statusText}`);
            }
            
            const pokemonData = await response.json();
            console.log('POKEMON-SERVICE: Successfully loaded from JSON file:', pokemonData.length, 'Pokemon');
            
            // Map JSON data to our expected format with enhanced data support
            PokemonService._allPokemonCache = pokemonData.map(p => ({
                id: p.id,
                name: p.name,
                type1: p.types[0] || 'normal',
                type2: p.types[1] || null,
                types: p.types || ['normal'], // Keep original types array
                baseHp: p.stats?.find(s => s.name === 'hp')?.base_stat || 50,
                baseAttack: p.stats?.find(s => s.name === 'attack')?.base_stat || 50,
                baseDefence: p.stats?.find(s => s.name === 'defense')?.base_stat || 50,
                baseSpeed: p.stats?.find(s => s.name === 'speed')?.base_stat || 50,
                // Use enhanced data if available, otherwise fallback
                description: p.description || `${p.types.join('/')} type Pokemon`,
                generation: p.generation || (p.id <= 151 ? 1 : p.id <= 251 ? 2 : p.id <= 386 ? 3 : p.id <= 493 ? 4 : 5),
                legendary: p.legendary !== undefined ? p.legendary : false,
                mythical: p.mythical !== undefined ? p.mythical : false,
                height: p.height,
                weight: p.weight,
                abilities: p.abilities || [],
                sprites: p.sprites
            }));
            
            console.log('POKEMON-SERVICE: Successfully cached', PokemonService._allPokemonCache.length, 'Pokemon from JSON');
            console.log('POKEMON-SERVICE: Sample Pokemon data:', PokemonService._allPokemonCache[0]);
        } catch (error) {
            console.error('POKEMON-SERVICE: Error caching Pokemon:', error);
            throw error; // Re-throw so calling code knows it failed
        }
    }
}

// Make it available globally
window.PokemonService = PokemonService;
