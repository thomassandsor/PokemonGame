// My Pokemon page logic
document.addEventListener('DOMContentLoaded', async function() {
    console.log('MY-POKEMON: Page loaded, checking authentication...');
    console.log('MY-POKEMON: Current URL:', window.location.href);
    console.log('MY-POKEMON: Session storage auth:', sessionStorage.getItem('pokemonGame_authenticated'));
    console.log('MY-POKEMON: Session storage user:', sessionStorage.getItem('pokemonGame_user'));
    
    // Give a moment for auth service to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if user is authenticated
    const user = await AuthService.checkAuth();
    
    console.log('MY-POKEMON: Authentication check result:', user);
    console.log('MY-POKEMON: AuthService.isAuthenticated():', AuthService.isAuthenticated());
    
    if (!user) {
        console.log('MY-POKEMON: User not authenticated');
        
        // Check if there are auth parameters in the URL (redirect case)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const email = urlParams.get('email');
        const name = urlParams.get('name');
        
        console.log('MY-POKEMON: URL params - token:', !!token, 'email:', email, 'name:', name);
        
        if (token && email) {
            console.log('MY-POKEMON: Found auth params in URL, setting up user...');
            AuthService.setAuthenticatedUser({
                token: token,
                email: email,
                name: name || email
            });
            
            // Clean up URL and reload
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            window.location.reload();
            return;
        }
        
        console.log('MY-POKEMON: No authentication found, redirecting to login');
        alert('Please login first to view your Pokemon collection.');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('MY-POKEMON: User authenticated:', user.email);
    
    // Update trainer info
    document.getElementById('trainerName').textContent = `Welcome, ${user.name || user.email}!`;
    
    // Load Pokemon
    await loadMyPokemon();
});

async function loadMyPokemon() {
    console.log('MY-POKEMON: Loading Pokemon collection...');
    
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const pokemonGrid = document.getElementById('pokemonGrid');
    
    // Show loading
    loadingSpinner.style.display = 'block';
    errorMessage.style.display = 'none';
    pokemonGrid.innerHTML = '';
    
    try {
        const user = AuthService.getCurrentUser();
        console.log('MY-POKEMON: Getting Pokemon for user:', user.email);
        
        // Load real Pokemon from the database
        let caughtPokemon = await PokemonService.getCaughtPokemon(user.email);
        
        if (!caughtPokemon || caughtPokemon.length === 0) {
            console.log('MY-POKEMON: No Pokemon found in Dataverse for this user');
            caughtPokemon = [];
        }
        
        console.log('MY-POKEMON: Displaying Pokemon collection:', caughtPokemon);
        
        // Update Pokemon count
        document.getElementById('pokemonCount').textContent = caughtPokemon.length;
        
        // Display Pokemon
        await displayPokemon(caughtPokemon);
        
    } catch (error) {
        console.error('MY-POKEMON: Error loading Pokemon:', error);
        errorMessage.style.display = 'block';
        
        // Show the REAL error details to the user
        let errorText = `Failed to load Pokemon: ${error.message}`;
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            errorText = `CORS Error: Cannot connect to Azure Functions from localhost. 
                        This is a browser security restriction.
                        
                        Technical details: ${error.message}
                        
                        Options:
                        1. Deploy to Azure to test with real data
                        2. Use a CORS proxy for local development
                        3. Configure Azure Functions to allow localhost CORS`;
        }
        
        document.getElementById('errorText').innerHTML = errorText.replace(/\n/g, '<br>');
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

async function displayPokemon(pokemonList) {
    const pokemonGrid = document.getElementById('pokemonGrid');
    pokemonGrid.innerHTML = '';
    
    if (pokemonList.length === 0) {
        pokemonGrid.innerHTML = '<div class="no-pokemon">No Pokemon found. Start catching some!</div>';
        pokemonGrid.style.display = 'block';
        return;
    }
    
    // Show the Pokemon grid
    pokemonGrid.style.display = 'grid';
    
    for (const pokemon of pokemonList) {
        try {
            const pokemonCard = await createPokemonCard(pokemon);
            pokemonGrid.appendChild(pokemonCard);
        } catch (error) {
            console.error('MY-POKEMON: Error creating Pokemon card:', error);
        }
    }
}

async function createPokemonCard(pokemon) {
    console.log('MY-POKEMON: Creating card for Pokemon:', pokemon);
    
    // Get Pokemon details from PokeAPI
    let pokemonDetails = null;
    if (pokemon.name) {
        pokemonDetails = await PokemonService.getPokemonDetails(pokemon.name);
    }
    
    const card = document.createElement('div');
    card.className = `pokemon-card ${pokemon.isShiny ? 'shiny' : ''}`;
    
    const pokemonName = pokemon.name || 'Unknown';
    const pokemonLevel = pokemon.level || 1;
    const pokemonSprite = pokemonDetails?.sprite || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png';
    const pokemonTypes = pokemonDetails?.types || ['normal'];
    const dateCaught = pokemon.dateCaught || new Date().toLocaleDateString();
    
    card.innerHTML = `
        <div class="pokemon-image">
            <img src="${pokemonSprite}" alt="${pokemonName}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'">
            ${pokemon.isShiny ? '<div class="shiny-indicator">✨</div>' : ''}
        </div>
        <div class="pokemon-info">
            <h3 class="pokemon-name">${pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)}</h3>
            <div class="pokemon-level">Level ${pokemonLevel}</div>
            <div class="pokemon-types">
                ${pokemonTypes.map(type => `<span class="type-badge type-${type}">${type}</span>`).join('')}
            </div>
            <div class="pokemon-date">Caught: ${dateCaught}</div>
        </div>
        <div class="pokemon-actions">
            <button onclick="viewPokemonDetails('${pokemonName}')" class="action-btn">View Details</button>
        </div>
    `;
    
    return card;
}

function viewPokemonDetails(pokemonName) {
    console.log('MY-POKEMON: Viewing details for:', pokemonName);
    alert(`🔍 Pokemon Details\n\nName: ${pokemonName}\n\nDetailed view coming soon!`);
}

function goHome() {
    window.location.href = 'index.html';
}

function logout() {
    console.log('MY-POKEMON: Logging out...');
    AuthService.logout();
    window.location.href = 'index.html';
}
