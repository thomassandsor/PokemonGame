// MY POKEMON - REAL LOGIN ONLY
document.addEventListener('DOMContentLoaded', async function() {
    console.log('MY POKEMON: Page loading...');
    
    // Give auth service a moment to restore from session
    setTimeout(async () => {
        // Check if user is actually logged in
        const isAuthenticated = authService.isAuthenticated() || await authService.checkAuth();
        
        if (!isAuthenticated) {
            console.log('MY POKEMON: Not authenticated, redirecting to login');
            window.location.href = 'index.html';
            return;
        }
        
        console.log('MY POKEMON: User authenticated, loading page...');
        await loadMyPokemon();
    }, 100);
});

async function loadMyPokemon() {
    console.log('MY POKEMON: Loading REAL Pokemon data...');
    
    const user = authService.getUser();
    console.log('MY POKEMON: User data:', user);
    
    // Update trainer name
    const trainerName = document.getElementById('trainerName');
    if (trainerName) {
        trainerName.textContent = `Welcome, ${user?.name || 'Trainer'}!`;
    }
    
    // Show loading state
    const pokemonGrid = document.getElementById('pokemonGrid');
    if (pokemonGrid) {
        pokemonGrid.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2>🔄 Loading Your Real Pokemon Collection</h2>
                <p>Connecting to Azure Functions API...</p>
                <p>User: ${user?.name || 'Unknown'}</p>
                <p>Email: ${user?.email || 'Unknown'}</p>
                <div style="margin: 20px 0; font-size: 24px;">⏳</div>
            </div>
        `;
        pokemonGrid.style.display = 'block';
    }
    
    // Hide loading spinner
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    
    // Load REAL Pokemon data from your Azure Functions
    try {
        console.log('MY POKEMON: Calling real Pokemon API...');
        
        // Use email as contact ID for now (you can adjust this based on your data structure)
        const contactId = user?.email || user?.contactId || 'unknown-contact';
        console.log('MY POKEMON: Using contact ID:', contactId);
        
        // Call your real Pokemon API
        const caughtPokemon = await pokemonService.getCaughtPokemon(contactId);
        console.log('MY POKEMON: Loaded Pokemon from API:', caughtPokemon);
        
        if (caughtPokemon && caughtPokemon.length > 0) {
            await displayRealPokemon(caughtPokemon);
            
            // Update Pokemon count
            const pokemonCount = document.getElementById('pokemonCount');
            if (pokemonCount) {
                pokemonCount.textContent = caughtPokemon.length;
            }
        } else {
            showNoPokemon();
        }
        
    } catch (error) {
        console.error('MY POKEMON: Error loading real Pokemon:', error);
        showError(`Failed to load Pokemon: ${error.message}`);
    }
}

async function displayRealPokemon(pokemonList) {
    console.log('MY POKEMON: Displaying real Pokemon collection:', pokemonList);
    
    const pokemonGrid = document.getElementById('pokemonGrid');
    if (!pokemonGrid) return;
    
    pokemonGrid.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <h2>🎮 Your Real Pokemon Collection</h2>
            <p>Loaded from Azure Functions API</p>
        </div>
        <div id="pokemonCards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div style="text-align: center; padding: 20px;">Loading Pokemon details...</div>
        </div>
    `;
    
    const pokemonCards = document.getElementById('pokemonCards');
    pokemonCards.innerHTML = '';
    
    // Load each Pokemon with details
    for (const pokemon of pokemonList) {
        console.log('MY POKEMON: Processing Pokemon:', pokemon);
        
        try {
            // Get Pokemon details from PokeAPI if we have an ID
            let pokemonDetails = null;
            if (pokemon.pokemonId || pokemon.pokedexId) {
                const id = pokemon.pokemonId || pokemon.pokedexId;
                pokemonDetails = await pokemonService.getPokemonDetails(id);
            }
            
            const card = createRealPokemonCard(pokemon, pokemonDetails);
            pokemonCards.appendChild(card);
            
        } catch (error) {
            console.error('MY POKEMON: Error loading Pokemon details:', error);
            const errorCard = createErrorCard(pokemon);
            pokemonCards.appendChild(errorCard);
        }
    }
}

function createRealPokemonCard(pokemon, details) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.style.cssText = `
        border: 2px solid #ddd;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        background: white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        cursor: pointer;
    `;
    
    const imageUrl = details?.sprites?.other?.['official-artwork']?.front_default || 
                     details?.sprites?.front_default || 
                     `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemonId || pokemon.pokedexId || '1'}.png`;
    
    const pokemonName = details?.name || pokemon.name || pokemon.pokemonName || 'Unknown Pokemon';
    const pokemonNumber = details?.id || pokemon.pokemonId || pokemon.pokedexId || '???';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${pokemonName}" 
             style="width: 120px; height: 120px; object-fit: contain;"
             onerror="this.src='https://via.placeholder.com/120x120?text=Pokemon'">
        <h3 style="margin: 10px 0; text-transform: capitalize;">${pokemonName}</h3>
        <p style="color: #666; margin: 5px 0;">#${pokemonNumber.toString().padStart(3, '0')}</p>
        ${pokemon.level ? `<p style="font-weight: bold; color: #4CAF50;">Level ${pokemon.level}</p>` : ''}
        ${pokemon.caughtDate ? `<p style="font-size: 12px; color: #888;">Caught: ${new Date(pokemon.caughtDate).toLocaleDateString()}</p>` : ''}
        ${details?.types ? `
            <div style="margin-top: 10px;">
                ${details.types.map(typeInfo => 
                    `<span style="background: #${getTypeColor(typeInfo.type.name)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin: 2px;">${typeInfo.type.name}</span>`
                ).join('')}
            </div>
        ` : ''}
    `;
    
    return card;
}

function createErrorCard(pokemon) {
    const card = document.createElement('div');
    card.style.cssText = `
        border: 2px solid #f44336;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        background: #ffebee;
    `;
    
    card.innerHTML = `
        <div style="font-size: 48px;">❌</div>
        <h3>Error Loading Pokemon</h3>
        <p>ID: ${pokemon.pokemonId || pokemon.pokedexId || 'Unknown'}</p>
        <p>Name: ${pokemon.name || pokemon.pokemonName || 'Unknown'}</p>
    `;
    
    return card;
}

function getTypeColor(type) {
    const typeColors = {
        fire: 'f44336', water: '2196F3', grass: '4CAF50', electric: 'FFEB3B',
        psychic: 'E91E63', ice: '00BCD4', dragon: '3F51B5', dark: '424242',
        fairy: 'F8BBD9', poison: '9C27B0', ground: 'FF9800', flying: '607D8B',
        bug: '8BC34A', rock: '795548', ghost: '673AB7', steel: '9E9E9E',
        fighting: 'FF5722', normal: '9E9E9E'
    };
    return typeColors[type] || '9E9E9E';
}

function showNoPokemon() {
    const pokemonGrid = document.getElementById('pokemonGrid');
    if (pokemonGrid) {
        pokemonGrid.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2>📱 No Pokemon Found</h2>
                <p>You haven't caught any Pokemon yet!</p>
                <p>Start your adventure to catch your first Pokemon.</p>
                <div style="margin-top: 20px;">
                    <button onclick="window.location.href='pokemon-browser.html'" 
                            style="padding: 12px 24px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Browse Pokemon
                    </button>
                </div>
            </div>
        `;
    }
}

function showError(message) {
    const pokemonGrid = document.getElementById('pokemonGrid');
    if (pokemonGrid) {
        pokemonGrid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f44336;">
                <h2>❌ Error Loading Pokemon</h2>
                <p>${message}</p>
                <button onclick="location.reload()" 
                        style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                    Try Again
                </button>
            </div>
        `;
    }
}
