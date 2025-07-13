// Pokemon Service for loading REAL Pokemon data from Dataverse
class PokemonService {
    
    // Check if we're in development mode (localhost)
    static isDevelopmentMode() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }
    
    // Get caught Pokemon from REAL Dataverse via DataverseProxy.cs
    static async getCaughtPokemon(email) {
        try {
            console.log('POKEMON-SERVICE: Loading caught Pokemon for:', email);
            
            // ALWAYS try to get real data first, regardless of development mode
            console.log('POKEMON-SERVICE: Attempting to load REAL data from Dataverse...');
            
            // First, get the user's contact ID from their email
            console.log('POKEMON-SERVICE: Looking up user contact ID for email:', email);
            const contactUrl = `https://pokemongame-functions-2025.azurewebsites.net/api/dataverse/contacts?$filter=emailaddress1 eq '${email}'&$select=contactid`;
            
            let userId;
            try {
                const contactResponse = await fetch(contactUrl);
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
            console.log('POKEMON-SERVICE: Making request to Dataverse...');
            const url = `https://pokemongame-functions-2025.azurewebsites.net/api/dataverse/pokemon_pokedexes?$filter=_pokemon_user_value eq '${userId}'`;
            console.log('POKEMON-SERVICE: URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('POKEMON-SERVICE: Got real Pokemon data from Dataverse:', data);
                
                // Map Dataverse field names to expected format
                const mappedPokemon = (data.value || []).map(p => ({
                    name: p.pokemon_name,
                    level: p.pokemon_level,
                    hp: p.pokemon_hp,
                    hpmax: p.pokemon_hpmax,
                    attack: p.pokemon_attack,
                    defence: p.pokemon_defence,
                    height: p.pokemon_height,
                    weight: p.pokemon_weight,
                    pokedexid: p.pokemon_pokedexid,
                    dateCaught: p.createdon,
                    userId: p._pokemon_user_value
                }));
                
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

    // Get all available Pokemon from the Pokemon master table
    static async getAllPokemon(offset = 0, limit = 20) {
        try {
            console.log('POKEMON-SERVICE: Loading Pokemon from Dataverse...');
            console.log('POKEMON-SERVICE: Using confirmed table name: pokemon_pokemons');
            console.log('POKEMON-SERVICE: Pagination - offset:', offset, 'limit:', limit);
            
            // HYBRID APPROACH: Since $skip causes 400 errors, use a workaround
            if (offset === 0) {
                // First page: Use only $top (which works)
                const url = `https://pokemongame-functions-2025.azurewebsites.net/api/dataverse/pokemon_pokemons?%24top=${limit}`;
                console.log('POKEMON-SERVICE: First page URL:', url);
                
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'omit'
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('POKEMON-SERVICE: Got first page from Dataverse:', data);
                    
                    const mappedPokemon = this.mapPokemonData(data.value || []);
                    
                    // For subsequent pages, we'll need to load all data and cache it
                    // So let's also make a request for all Pokemon to cache
                    this.loadAndCacheAllPokemon();
                    
                    const hasMore = data.value && data.value.length === limit;
                    console.log('POKEMON-SERVICE: First page - has more?', hasMore);
                    
                    return {
                        pokemon: mappedPokemon,
                        hasMore: hasMore,
                        tableName: 'pokemon_pokemons'
                    };
                } else {
                    console.error('POKEMON-SERVICE: HTTP ERROR - Status:', response.status);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } else {
                // Subsequent pages: Use cached data (since $skip doesn't work)
                console.log('POKEMON-SERVICE: Loading from cache for offset:', offset);
                
                if (!PokemonService._allPokemonCache) {
                    console.log('POKEMON-SERVICE: Cache not ready, loading all Pokemon...');
                    await this.loadAndCacheAllPokemon();
                }
                
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
                    tableName: 'pokemon_pokemons'
                };
            }
            
        } catch (error) {
            console.error('POKEMON-SERVICE: DETAILED ERROR loading all Pokemon:', error);
            console.error('POKEMON-SERVICE: Error type:', error.name);
            console.error('POKEMON-SERVICE: Error message:', error.message);
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
            // Load a large batch to get all Pokemon (Dataverse default max is usually 5000)
            const url = `https://pokemongame-functions-2025.azurewebsites.net/api/dataverse/pokemon_pokemons?%24top=1000`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('POKEMON-SERVICE: Loaded all Pokemon for cache:', data.value?.length || 0);
                
                PokemonService._allPokemonCache = this.mapPokemonData(data.value || []);
                console.log('POKEMON-SERVICE: Cached', PokemonService._allPokemonCache.length, 'Pokemon');
            } else {
                console.error('POKEMON-SERVICE: Failed to load all Pokemon for cache');
            }
        } catch (error) {
            console.error('POKEMON-SERVICE: Error caching Pokemon:', error);
        }
    }

    // Helper method to map Pokemon data consistently
    static mapPokemonData(rawPokemon) {
        return rawPokemon.map(p => {
            return {
                id: p.pokemon_id || p.pokemonid || p.id || 1,
                name: p.pokemon_name || p.pokemonname || p.name || 'Unknown',
                type1: p.pokemon_type1 || p.type1 || p.pokemontype1 || 'normal',
                type2: p.pokemon_type2 || p.type2 || p.pokemontype2 || null,
                baseHp: p.pokemon_basehp || p.basehp || p.pokemonbasehp || 50,
                baseAttack: p.pokemon_baseattack || p.baseattack || p.pokemonbaseattack || 50,
                baseDefence: p.pokemon_basedefence || p.basedefence || p.pokemonbasedefence || 50,
                baseSpeed: p.pokemon_basespeed || p.basespeed || p.pokemonbasespeed || 50,
                description: p.pokemon_description || p.description || p.pokemondescription || '',
                generation: p.pokemon_generation || p.generation || p.pokemongeneration || 1,
                legendary: p.pokemon_legendary || p.legendary || p.pokemonlegendary || false
            };
        });
    }
}

// Make it available globally
window.PokemonService = PokemonService;
