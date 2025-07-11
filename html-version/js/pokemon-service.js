// Pokemon Service - Real API calls to your Azure Functions
class PokemonService {
    constructor() {
        this.baseURL = 'https://pokemongame-functions-2025.azurewebsites.net/api';
        this.cache = new Map();
    }

    // Get user's caught Pokemon from your real backend
    async getCaughtPokemon(contactId) {
        console.log('POKEMON API: Loading caught Pokemon for contact:', contactId);
        
        try {
            const response = await fetch(`${this.baseURL}/dataverse-proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    query: 'pokemon',
                    action: 'getCaughtPokemon',
                    contactId: contactId
                })
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('POKEMON API: Received Pokemon data:', data);
            
            return data || [];
            
        } catch (error) {
            console.error('POKEMON API: Error loading caught Pokemon:', error);
            throw error;
        }
    }

    // Get Pokemon details from PokeAPI
    async getPokemonDetails(pokemonId) {
        console.log('POKEMON API: Loading Pokemon details for ID:', pokemonId);
        
        const cacheKey = `pokemon_${pokemonId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            
            if (!response.ok) {
                throw new Error(`PokeAPI call failed: ${response.status}`);
            }
            
            const pokemonData = await response.json();
            this.cache.set(cacheKey, pokemonData);
            
            console.log('POKEMON API: Loaded Pokemon details:', pokemonData.name);
            return pokemonData;
            
        } catch (error) {
            console.error('POKEMON API: Error loading Pokemon details:', error);
            return null;
        }
    }
}

// Global Pokemon service instance
window.pokemonService = new PokemonService();
