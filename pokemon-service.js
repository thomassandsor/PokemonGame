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
            
            // For now, use your known user ID to bypass the email lookup CORS issue
            // TODO: Fix CORS for email lookup, but this gets you working immediately
            let userId;
            if (email === 'sandsor@outlook.com') {
                userId = '20c3f8e3-a455-f011-877b-7c1e525e5f72'; // Your actual user ID from Dataverse
                console.log('POKEMON-SERVICE: Using known user ID:', userId);
            } else {
                console.log('POKEMON-SERVICE: Unknown user, would need email lookup');
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
                return data.value || []; // Return actual Pokemon records from YOUR Dataverse
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
}

// Make it available globally
window.PokemonService = PokemonService;
