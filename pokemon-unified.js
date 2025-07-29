// Unified Pokemon Collection page logic
let currentView = 'all'; // 'all' or 'my'
let currentOffset = 0;
const pokemonPerPage = 20;
let allPokemon = [];
let myPokemon = [];
let filteredPokemon = [];
let isLoading = false;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('POKEMON-UNIFIED: Page loaded, checking authentication...');
    
    // Check URL parameters for initial view
    const urlParams = new URLSearchParams(window.location.search);
    const initialView = urlParams.get('view');
    if (initialView === 'my') {
        currentView = 'my';
    }
    
    // Check if user is authenticated
    const user = await AuthService.checkAuth();
    
    if (!user) {
        console.log('POKEMON-UNIFIED: User not authenticated, redirecting to login');
        alert('Please login first to view your Pokemon collection.');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('POKEMON-UNIFIED: User authenticated, loading Pokemon...');
    
    // Update trainer info
    await updateTrainerInfo();
    
    // Load both datasets
    await loadMyPokemon();
    currentOffset = 0; // Reset offset before loading all Pokemon
    await loadAllPokemon();
    
    // Setup event listeners
    setupEventListeners();
    
    // Set initial view based on URL parameter or default to 'all'
    switchView(currentView);
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    
    searchInput.addEventListener('input', debounce(filterAndRender, 300));
    typeFilter.addEventListener('change', filterAndRender);
}

async function updateTrainerInfo() {
    const user = AuthService.getCurrentUser();
    const trainerNameElement = document.getElementById('trainerName');
    const myPokemonCountElement = document.getElementById('myPokemonCount');
    const trainerLevelElement = document.getElementById('trainerLevel');
    
    if (user && trainerNameElement) {
        trainerNameElement.textContent = `Welcome, ${user.name || user.email}!`;
    }
    
    // Update Pokemon count (will be updated when myPokemon loads)
    if (myPokemonCountElement) {
        myPokemonCountElement.textContent = myPokemon.length;
    }
    
    // Calculate trainer level based on Pokemon count
    const trainerLevel = Math.floor(myPokemon.length / 3) + 1;
    if (trainerLevelElement) {
        trainerLevelElement.textContent = trainerLevel;
    }
}

async function loadMyPokemon() {
    try {
        console.log('POKEMON-UNIFIED: Loading user Pokemon...');
        const user = AuthService.getCurrentUser();
        
        if (!user || !user.email) {
            console.error('POKEMON-UNIFIED: No user email found');
            return;
        }
        
        console.log('POKEMON-UNIFIED: Getting Pokemon for user:', user.email);
        
        // Use PokemonService like the original my-pokemon page
        myPokemon = await PokemonService.getCaughtPokemon(user.email);
        
        if (!myPokemon || myPokemon.length === 0) {
            console.log('POKEMON-UNIFIED: No Pokemon found in Dataverse for this user');
            myPokemon = [];
        }
        
        console.log('POKEMON-UNIFIED: Successfully loaded', myPokemon.length, 'user Pokemon');
        await updateTrainerInfo();
        
    } catch (error) {
        console.error('POKEMON-UNIFIED: Error loading user Pokemon:', error);
        myPokemon = [];
        
        // Show detailed error like the original my-pokemon page
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
        showError(errorText);
    }
}

async function loadAllPokemon() {
    if (isLoading) return;
    
    isLoading = true;
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        console.log('POKEMON-UNIFIED: Loading ALL Pokemon from Dataverse...');
        
        if (currentView === 'all') {
            loadingSpinner.style.display = 'block';
            errorMessage.style.display = 'none';
            
            // Update loading message
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.textContent = 'Loading all Pokemon...';
            }
        }
        
        // Always load ALL Pokemon for proper search/filter functionality
        console.log('POKEMON-UNIFIED: Loading ALL Pokemon at once for full search capability');
        
        // Use the cache loading method to get all Pokemon
        await PokemonService.loadAndCacheAllPokemon();
        
        // Get all cached Pokemon
        if (PokemonService._allPokemonCache && PokemonService._allPokemonCache.length > 0) {
            allPokemon = [...PokemonService._allPokemonCache];
            
            // Debug: Log first Pokemon to see data structure
            if (allPokemon.length > 0) {
                console.log('POKEMON-UNIFIED: Sample Pokemon data:', allPokemon[0]);
            }
            
            // Ensure all Pokemon have a types array (handle both JSON and Dataverse formats)
            allPokemon = allPokemon.map(pokemon => {
                if (pokemon.types && Array.isArray(pokemon.types)) {
                    // Already has types array (from JSON file)
                    return pokemon;
                } else {
                    // Convert type1/type2 to types array (from Dataverse)
                    return {
                        ...pokemon,
                        types: [pokemon.type1, pokemon.type2].filter(type => type && type !== 'null' && type.trim() !== '')
                    };
                }
            });
            
            // Debug: Log first Pokemon after type normalization
            if (allPokemon.length > 0) {
                console.log('POKEMON-UNIFIED: Sample Pokemon after type normalization:', allPokemon[0]);
            }
            
            filteredPokemon = [...allPokemon];
            console.log('POKEMON-UNIFIED: Loaded ALL', allPokemon.length, 'Pokemon from cache');
        } else {
            // Fallback to regular loading if cache fails
            const result = await PokemonService.getAllPokemon(0, 1000); // Load large batch
            allPokemon = result.pokemon || [];
            
            // Debug: Log first Pokemon to see data structure
            if (allPokemon.length > 0) {
                console.log('POKEMON-UNIFIED: Sample Pokemon data from fallback:', allPokemon[0]);
            }
            
            // Ensure all Pokemon have a types array
            allPokemon = allPokemon.map(pokemon => {
                if (pokemon.types && Array.isArray(pokemon.types)) {
                    return pokemon;
                } else {
                    return {
                        ...pokemon,
                        types: [pokemon.type1, pokemon.type2].filter(type => type && type !== 'null' && type.trim() !== '')
                    };
                }
            });
            
            filteredPokemon = [...allPokemon];
            console.log('POKEMON-UNIFIED: Loaded', allPokemon.length, 'Pokemon via fallback');
        }
        
    } catch (error) {
        console.error('POKEMON-UNIFIED: Error loading Pokemon:', error);
        
        // Show detailed error like the original pokemon-browser page
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
        showError(errorText);
    } finally {
        isLoading = false;
        if (currentView === 'all') {
            loadingSpinner.style.display = 'none';
        }
    }
}

function switchView(view) {
    console.log('POKEMON-UNIFIED: Switching to view:', view);
    
    currentView = view;
    
    // Update toggle buttons
    const allBtn = document.getElementById('allPokemonBtn');
    const myBtn = document.getElementById('myPokemonBtn');
    const searchFilterSection = document.getElementById('searchFilterSection');
    
    if (view === 'all') {
        allBtn.classList.add('active');
        myBtn.classList.remove('active');
        searchFilterSection.style.display = 'block';
    } else {
        myBtn.classList.add('active');
        allBtn.classList.remove('active');
        searchFilterSection.style.display = 'none';
    }
    
    renderCurrentView();
}

function renderCurrentView() {
    const pokemonGrid = document.getElementById('pokemonGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const emptyState = document.getElementById('emptyState');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    // Hide all states initially
    pokemonGrid.style.display = 'none';
    loadingSpinner.style.display = 'none';
    errorMessage.style.display = 'none';
    emptyState.style.display = 'none';
    loadMoreContainer.style.display = 'none';
    
    if (currentView === 'my') {
        if (myPokemon.length === 0) {
            emptyState.style.display = 'block';
        } else {
            renderMyPokemon();
        }
    } else {
        if (filteredPokemon.length === 0 && !isLoading) {
            loadingSpinner.style.display = 'block';
        } else {
            filterAndRender();
        }
    }
}

async function renderMyPokemon() {
    const pokemonGrid = document.getElementById('pokemonGrid');
    pokemonGrid.innerHTML = '';
    pokemonGrid.style.display = 'grid';
    
    console.log('POKEMON-UNIFIED: Rendering', myPokemon.length, 'user Pokemon');
    
    for (const pokemon of myPokemon) {
        const card = await createMyPokemonCard(pokemon);
        pokemonGrid.appendChild(card);
    }
}

function filterAndRender() {
    if (currentView !== 'all') return;
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedType = document.getElementById('typeFilter').value.toLowerCase();
    
    filteredPokemon = allPokemon.filter(pokemon => {
        const matchesSearch = !searchTerm || 
            pokemon.name.toLowerCase().includes(searchTerm) ||
            pokemon.id.toString().includes(searchTerm);
            
        const matchesType = !selectedType || 
            pokemon.types.some(type => type.toLowerCase() === selectedType);
            
        return matchesSearch && matchesType;
    });
    
    renderAllPokemon();
}

function renderAllPokemon() {
    const pokemonGrid = document.getElementById('pokemonGrid');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if (filteredPokemon.length === 0) {
        pokemonGrid.innerHTML = '<div class="pokemon-text-center">No Pokemon found matching your criteria.</div>';
        pokemonGrid.style.display = 'block';
        loadMoreContainer.style.display = 'none';
        return;
    }
    
    pokemonGrid.innerHTML = '';
    pokemonGrid.style.display = 'grid';
    
    // Always show all filtered Pokemon at once (no pagination)
    console.log('POKEMON-UNIFIED: Rendering all', filteredPokemon.length, 'Pokemon');
    
    filteredPokemon.forEach(pokemon => {
        const card = createAllPokemonCard(pokemon);
        pokemonGrid.appendChild(card);
    });
    
    // Never show load more button since we load all Pokemon
    loadMoreContainer.style.display = 'none';
}

function createAllPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.onclick = () => showPokemonDetails(pokemon);
    
    // Check if this Pokemon is caught
    const isCaught = myPokemon.some(myP => 
        myP.name && myP.name.toLowerCase() === pokemon.name.toLowerCase()
    );
    
    // Get Pokemon sprite from PokeAPI
    const pokemonSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
    
    // Get types - handle both the new types array and legacy type1/type2 properties
    let types = pokemon.types || [];
    if (types.length === 0 && pokemon.type1) {
        types = [pokemon.type1, pokemon.type2].filter(type => type && type !== 'null' && type.trim() !== '');
    }
    if (types.length === 0) {
        types = ['normal']; // fallback
    }
    
    // Format Pokemon number with leading zeros
    const formattedNumber = `#${pokemon.id.toString().padStart(3, '0')}`;
    
    card.innerHTML = `
        <div class="pokemon-card-image">
            <img src="${pokemonSprite}" alt="${pokemon.name}" onerror="this.style.display='none'; this.parentNode.textContent='?';">
            ${isCaught ? '<div class="caught-indicator">✓</div>' : ''}
        </div>
        <div class="pokemon-card-info">
            <div class="pokemon-card-number">${formattedNumber}</div>
            <div class="pokemon-card-name">${pokemon.name}${isCaught ? ' (Caught)' : ''}</div>
            <div class="pokemon-card-types">
                ${types.map(type => `<span class="pokemon-type-badge pokemon-type-${type.toLowerCase()}">${type}</span>`).join('')}
            </div>
        </div>
    `;
    
    if (isCaught) {
        card.classList.add('caught');
    }
    
    return card;
}

async function createMyPokemonCard(pokemon) {
    console.log('POKEMON-UNIFIED: Creating card for user Pokemon:', pokemon);
    
    // Get Pokemon details from PokeAPI
    let pokemonDetails = null;
    if (pokemon.name) {
        pokemonDetails = await PokemonService.getPokemonDetails(pokemon.name);
    }
    
    const card = document.createElement('div');
    card.className = `pokemon-card my-pokemon-card ${pokemon.isShiny ? 'shiny' : ''}`;
    
    const pokemonName = pokemon.name || 'Unknown';
    const pokemonLevel = pokemon.level || 1;
    const pokemonSprite = pokemonDetails?.sprite || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png';
    const pokemonTypes = pokemonDetails?.types || ['normal'];
    const dateCaught = pokemon.dateCaught || new Date().toLocaleDateString();
    const hp = pokemon.hp || 50;
    const attack = pokemon.attack || 25;
    const defense = pokemon.defense || 25;
    
    card.innerHTML = `
        <div class="pokemon-card-image">
            <img src="${pokemonSprite}" alt="${pokemonName}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'">
            ${pokemon.isShiny ? '<div class="shiny-indicator">✨</div>' : ''}
        </div>
        <div class="pokemon-card-info">
            <div class="pokemon-card-name">${pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)}</div>
            <div class="pokemon-level">Level ${pokemonLevel}</div>
            <div class="pokemon-card-types">
                ${pokemonTypes.map(type => `<span class="pokemon-type-badge pokemon-type-${type}">${type}</span>`).join('')}
            </div>
            <div class="pokemon-stats">
                <div class="stat">HP: ${hp}</div>
                <div class="stat">ATK: ${attack}</div>
                <div class="stat">DEF: ${defense}</div>
            </div>
            <div class="pokemon-date">Caught: ${dateCaught}</div>
        </div>
        <div class="pokemon-actions">
            <button onclick="viewMyPokemonDetails('${pokemonName}')" class="action-btn">View Details</button>
        </div>
    `;
    
    return card;
}

async function loadMorePokemon() {
    // Load more is no longer needed since we always load all Pokemon
    console.log('POKEMON-UNIFIED: Load more called but not needed - all Pokemon already loaded');
    document.getElementById('loadMoreContainer').style.display = 'none';
    return;
}

async function showPokemonDetails(pokemon) {
    console.log('POKEMON-UNIFIED: Opening Pokemon card for browsing:', pokemon.name);
    
    // Check if this Pokemon is caught
    const caughtPokemon = myPokemon.find(myP => 
        myP.name && myP.name.toLowerCase() === pokemon.name.toLowerCase()
    );
    
    // Use the enhanced local data
    const completeData = pokemon;
    
    console.log('POKEMON-UNIFIED: Using local Pokemon data:', completeData);
    
    // Create and show the browse all modal using template system
    const browseModal = new BrowseAllPokemonModal();
    
    if (caughtPokemon) {
        // CAUGHT POKEMON - Show Dataverse data with personal info
        const options = {
            isCaught: true,
            caughtData: caughtPokemon,
            onRename: (pokemonData) => renamePokemon(pokemonData),
            onRelease: (pokemonData) => releasePokemon(pokemonData),
            onViewDetails: (pokemonData) => {
                console.log('View full details for:', pokemonData.name);
                // TODO: Open detailed Pokemon management page
                alert(`View details for ${pokemonData.name}! (Feature coming soon)`);
            }
        };
        browseModal.show(completeData, options);
    } else {
        // UNCAUGHT POKEMON - Show generic data with catch option
        const options = {
            isCaught: false,
            onCatch: (pokemonData) => {
                console.log('Would catch Pokemon:', pokemonData.name);
                // TODO: Implement catch functionality
                alert(`Catching ${pokemonData.name}! (Feature coming soon)`);
            },
            onAddToWishlist: (pokemonData) => {
                console.log('Add to wishlist:', pokemonData.name);
                // TODO: Implement wishlist functionality
                alert(`Added ${pokemonData.name} to wishlist! (Feature coming soon)`);
            }
        };
        browseModal.show(completeData, options);
    }
}

async function viewMyPokemonDetails(pokemonName) {
    console.log('POKEMON-UNIFIED: Opening Pokemon card for my collection:', pokemonName);
    
    const pokemon = myPokemon.find(p => p.name === pokemonName);
    if (!pokemon) {
        console.error('Pokemon not found in my collection:', pokemonName);
        return;
    }
    
    // Find the corresponding base Pokemon data from allPokemon for additional details
    const basePokemon = allPokemon.find(p => 
        p.name.toLowerCase() === pokemonName.toLowerCase()
    );
    
    // Use the enhanced local data instead of API calls
    const completeData = basePokemon || pokemon;
    
    console.log('POKEMON-UNIFIED: Using local Pokemon data for my collection:', completeData);
    
    // Format Pokemon data to match the expected structure
    const formattedPokemon = {
        id: completeData.id || pokemon.id,
        name: completeData.name || pokemon.name,
        types: completeData.types ? completeData.types.map(type => ({ type: { name: type } })) : [],
        sprites: {
            official_artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${completeData.id || pokemon.id}.png`,
            front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${completeData.id || pokemon.id}.png`
        },
        baseHp: completeData.baseHp || 50,
        baseAttack: completeData.baseAttack || 50,
        baseDefence: completeData.baseDefence || 50,
        baseSpeed: completeData.baseSpeed || 50,
        generation: completeData.generation || 1,
        legendary: completeData.legendary || false,
        mythical: completeData.mythical || false,
        description: completeData.description || `${completeData.name.charAt(0).toUpperCase() + completeData.name.slice(1)} is a Pokemon.`,
        height: completeData.height,
        weight: completeData.weight,
        abilities: completeData.abilities || []
    };
    
    // Use the shared card system
    const pokemonCards = new PokemonCardSystem();
    
    const options = {
        caughtPokemon: pokemon,
        callbacks: {
            close: () => console.log('My Pokemon card closed'),
            rename: (pokemonData) => renamePokemon(pokemonData),
            release: (pokemonData) => releasePokemon(pokemonData)
        }
    };
    
    // Show card with MY_COLLECTION context
    pokemonCards.showCard(formattedPokemon, 'MY_COLLECTION', options);
}

function closeModal() {
    document.getElementById('pokemonModal').style.display = 'none';
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    // Handle both plain text and HTML content
    if (message.includes('<br>') || message.includes('\n')) {
        errorText.innerHTML = message.replace(/\n/g, '<br>');
    } else {
        errorText.textContent = message;
    }
    
    errorMessage.style.display = 'block';
    
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 10000); // Show error longer for detailed CORS messages
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function goBack() {
    window.location.href = 'index.html';
}

function logout() {
    console.log('POKEMON-UNIFIED: Logging out...');
    AuthService.logout();
    window.location.href = 'index.html';
}

// Pokemon action callback functions for the card system
function renamePokemon(pokemonData) {
    const newName = prompt('Enter new nickname:', pokemonData.nickname || pokemonData.name);
    if (newName && newName.trim()) {
        console.log('Renaming Pokemon to:', newName.trim());
        // TODO: Implement Pokemon nickname update in database
        alert(`Pokemon renamed to "${newName.trim()}"! (Feature coming soon)`);
    }
}

function releasePokemon(pokemonData) {
    if (confirm(`Are you sure you want to release ${pokemonData.nickname || pokemonData.name}?`)) {
        console.log('Releasing Pokemon:', pokemonData.name);
        // TODO: Implement Pokemon release from collection
        alert(`${pokemonData.name} released! (Feature coming soon)`);
    }
}

// Modal click outside to close
document.addEventListener('click', function(event) {
    const modal = document.getElementById('pokemonModal');
    if (event.target === modal) {
        closeModal();
    }
});
