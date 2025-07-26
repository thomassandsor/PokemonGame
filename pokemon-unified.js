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

function showPokemonDetails(pokemon) {
    const modal = document.getElementById('pokemonModal');
    
    // Set Pokemon name and image
    document.getElementById('modalPokemonName').textContent = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    document.getElementById('modalImage').src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
    document.getElementById('modalImage').alt = pokemon.name;
    
    // Check if this Pokemon is caught
    const caughtPokemon = myPokemon.find(myP => 
        myP.name && myP.name.toLowerCase() === pokemon.name.toLowerCase()
    );
    
    // Calculate and display HP (use actual stats if available)
    let hpValue = pokemon.baseHp || pokemon.hp || Math.floor(Math.random() * 50) + 30;
    if (caughtPokemon && caughtPokemon.hp) {
        hpValue = caughtPokemon.hp;
    }
    document.getElementById('pokemonHP').textContent = `HP ${hpValue}`;
    
    // Get types - handle both the new types array and legacy type1/type2 properties
    let types = pokemon.types || [];
    if (types.length === 0 && pokemon.type1) {
        types = [pokemon.type1, pokemon.type2].filter(type => type && type !== 'null' && type.trim() !== '');
    }
    if (types.length === 0) {
        types = ['normal']; // fallback
    }
    
    // Set type-based header color and display type badges
    const typesContainer = document.getElementById('pokemonTypes');
    const cardHeader = document.getElementById('pokemonCardHeader');
    typesContainer.innerHTML = '';
    
    if (types.length > 0) {
        // Set header to primary type
        const primaryType = types[0].toLowerCase();
        cardHeader.className = `pokemon-trading-card-header ${primaryType}`;
        
        // Add type badges
        types.forEach(typeName => {
            const typeBadge = document.createElement('span');
            typeBadge.className = `pokemon-trading-card-type-badge ${typeName.toLowerCase()}`;
            typeBadge.textContent = typeName.toUpperCase();
            typesContainer.appendChild(typeBadge);
        });
    } else {
        cardHeader.className = 'pokemon-trading-card-header normal';
    }
    
    // Populate Pokemon stats
    const statsContainer = document.getElementById('pokemonStatsContainer');
    statsContainer.innerHTML = '';
    
    // Main stats to display - use caught Pokemon stats if available
    let statsToShow = [
        { name: 'Attack', value: pokemon.baseAttack || pokemon.attack, key: 'attack' },
        { name: 'Defense', value: pokemon.baseDefence || pokemon.defense, key: 'defense' },
        { name: 'Speed', value: pokemon.baseSpeed || pokemon.speed, key: 'speed' }
    ];
    
    // If Pokemon is caught, use caught Pokemon stats
    if (caughtPokemon) {
        statsToShow = [
            { name: 'Attack', value: caughtPokemon.attack || pokemon.baseAttack || pokemon.attack },
            { name: 'Defense', value: caughtPokemon.defense || pokemon.baseDefence || pokemon.defense },
            { name: 'Speed', value: caughtPokemon.speed || pokemon.baseSpeed || pokemon.speed }
        ];
    }
    
    statsToShow.forEach(stat => {
        if (stat.value !== undefined && stat.value !== null) {
            const statRow = document.createElement('div');
            statRow.className = 'pokemon-trading-card-stats-row';
            statRow.innerHTML = `
                <span class="pokemon-trading-card-stat-name">${stat.name}</span>
                <span class="pokemon-trading-card-stat-value">${stat.value}</span>
            `;
            statsContainer.appendChild(statRow);
        }
    });
    
    // If no stats available, show placeholders
    if (statsContainer.children.length === 0) {
        const placeholderStats = [
            { name: 'Attack', value: Math.floor(Math.random() * 40) + 40 },
            { name: 'Defense', value: Math.floor(Math.random() * 40) + 35 },
            { name: 'Speed', value: Math.floor(Math.random() * 40) + 45 }
        ];
        
        placeholderStats.forEach(stat => {
            const statRow = document.createElement('div');
            statRow.className = 'pokemon-trading-card-stats-row';
            statRow.innerHTML = `
                <span class="pokemon-trading-card-stat-name">${stat.name}</span>
                <span class="pokemon-trading-card-stat-value">${stat.value}</span>
            `;
            statsContainer.appendChild(statRow);
        });
    }
    
    // Caught status container
    const caughtStatusContainer = document.getElementById('caughtStatusContainer');
    const formattedNumber = `#${pokemon.id.toString().padStart(3, '0')}`;
    
    if (caughtPokemon) {
        caughtStatusContainer.innerHTML = `
            <div style="text-align: center; color: #27ae60; font-weight: bold; font-size: var(--font-size-lg); margin-bottom: var(--space-sm);">
                ✅ CAUGHT!
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-xs); padding: 4px 0; border-bottom: 1px solid rgba(45, 52, 54, 0.2);">
                <span style="font-size: var(--font-size-sm); font-weight: bold; color: #2d3436;">Level:</span>
                <span style="font-size: var(--font-size-sm); color: #2d3436;">${caughtPokemon.level || 1}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-xs); padding: 4px 0; border-bottom: 1px solid rgba(45, 52, 54, 0.2);">
                <span style="font-size: var(--font-size-sm); font-weight: bold; color: #2d3436;">Date Caught:</span>
                <span style="font-size: var(--font-size-sm); color: #2d3436;">${caughtPokemon.dateCaught || 'Unknown'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                <span style="font-size: var(--font-size-sm); font-weight: bold; color: #2d3436;">Shiny:</span>
                <span style="font-size: var(--font-size-sm); color: #2d3436;">${caughtPokemon.isShiny ? '✨ Yes' : 'No'}</span>
            </div>
        `;
        caughtStatusContainer.style.display = 'block';
    } else {
        caughtStatusContainer.innerHTML = `
            <div style="text-align: center; color: #e74c3c; font-weight: bold; font-size: var(--font-size-lg);">
                ❌ NOT CAUGHT
            </div>
        `;
        caughtStatusContainer.style.display = 'block';
    }
    
    // Populate additional info
    const infoContainer = document.getElementById('pokemonInfoContainer');
    infoContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-xs); padding: 4px 0; border-bottom: 1px solid rgba(45, 52, 54, 0.2);">
            <span style="font-size: var(--font-size-sm); font-weight: bold; color: #2d3436;">ID:</span>
            <span style="font-size: var(--font-size-sm); color: #2d3436;">${formattedNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-xs); padding: 4px 0; border-bottom: 1px solid rgba(45, 52, 54, 0.2);">
            <span style="font-size: var(--font-size-sm); font-weight: bold; color: #2d3436;">Generation:</span>
            <span style="font-size: var(--font-size-sm); color: #2d3436;">${pokemon.generation || 'Unknown'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span style="font-size: var(--font-size-sm); font-weight: bold; color: #2d3436;">Legendary:</span>
            <span style="font-size: var(--font-size-sm); color: #2d3436;">${pokemon.legendary ? 'Yes' : 'No'}</span>
        </div>
        ${pokemon.description ? `
        <div style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 2px solid #2d3436;">
            <div style="font-size: var(--font-size-sm); font-weight: bold; color: #2d3436; margin-bottom: var(--space-xs);">Description:</div>
            <div style="font-size: var(--font-size-sm); color: #2d3436; line-height: 1.4;">${pokemon.description}</div>
        </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
}

function viewMyPokemonDetails(pokemonName) {
    const pokemon = myPokemon.find(p => p.name === pokemonName);
    if (pokemon) {
        // Find the corresponding Pokemon from allPokemon for additional details
        const basePokemon = allPokemon.find(p => 
            p.name.toLowerCase() === pokemonName.toLowerCase()
        );
        
        if (basePokemon) {
            showPokemonDetails(basePokemon);
        } else {
            alert(`🔍 Pokemon Details\n\nName: ${pokemonName}\nLevel: ${pokemon.level || 1}\n\nDetailed view available when browsing all Pokemon!`);
        }
    }
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

// Modal click outside to close
document.addEventListener('click', function(event) {
    const modal = document.getElementById('pokemonModal');
    if (event.target === modal) {
        closeModal();
    }
});
