// Pokemon Browser page logic
let currentOffset = 0; // Track current offset for pagination
const pokemonPerPage = 20; // Back to reasonable page size
let allPokemon = [];
let filteredPokemon = [];
let isLoading = false;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('POKEMON-BROWSER: Page loaded, checking authentication...');
    
    // Check if user is authenticated
    const user = await AuthService.checkAuth();
    
    if (!user) {
        console.log('POKEMON-BROWSER: User not authenticated, redirecting to login');
        alert('Please login first to browse Pokemon.');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('POKEMON-BROWSER: User authenticated, loading Pokemon...');
    await loadPokemon();
    
    // Setup search and filter event listeners
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    
    searchInput.addEventListener('input', debounce(filterPokemon, 300));
    typeFilter.addEventListener('change', filterPokemon);
}

async function loadPokemon() {
    if (isLoading) return;
    
    isLoading = true;
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const pokemonGrid = document.getElementById('pokemonGrid');
    const pokemonStats = document.getElementById('pokemonStats');
    
    // Show loading
    loadingSpinner.style.display = 'block';
    errorMessage.style.display = 'none';
    pokemonStats.style.display = 'none';
    
    try {
        console.log('POKEMON-BROWSER: Loading Pokemon from Dataverse...');
        
        const result = await PokemonService.getAllPokemon(currentOffset, pokemonPerPage);
        
        if (currentOffset === 0) {
            // First load - replace everything
            allPokemon = result.pokemon;
            filteredPokemon = [...allPokemon];
            displayPokemon(true); // true = clear existing
        } else {
            // Load more - append new Pokemon
            const newPokemon = result.pokemon;
            allPokemon.push(...newPokemon);
            
            // For pagination, we don't re-filter, just add new ones
            filteredPokemon.push(...newPokemon);
            displayNewPokemon(newPokemon); // Just add the new ones to UI
        }
        
        console.log('POKEMON-BROWSER: Total Pokemon loaded:', allPokemon.length);
        console.log('POKEMON-BROWSER: Current offset:', currentOffset);
        console.log('POKEMON-BROWSER: Has more data?', result.hasMore);
        
        // Update UI
        if (currentOffset > 0) {
            // This was a "Load More" operation
            updateStats();
        } else {
            // First load
            updateStats();
        }
        
        // Show stats
        pokemonStats.style.display = 'flex';
        
        // Show/hide load more button based on whether there are more records
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        console.log('POKEMON-BROWSER: Load more container element:', loadMoreContainer);
        console.log('POKEMON-BROWSER: Has more data for pagination?', result.hasMore);
        
        if (result.hasMore) {
            console.log('POKEMON-BROWSER: Showing load more button');
            loadMoreContainer.style.display = 'block';
        } else {
            console.log('POKEMON-BROWSER: Hiding load more button (no more data)');
            loadMoreContainer.style.display = 'none';
        }
        
        // Update offset for next request
        currentOffset += pokemonPerPage;
        
    } catch (error) {
        console.error('POKEMON-BROWSER: Error loading Pokemon:', error);
        errorMessage.style.display = 'block';
        document.getElementById('errorText').textContent = `Failed to load Pokemon: ${error.message}`;
    } finally {
        loadingSpinner.style.display = 'none';
        isLoading = false;
    }
}

function displayPokemon(clearExisting = false) {
    const pokemonGrid = document.getElementById('pokemonGrid');
    
    if (clearExisting) {
        pokemonGrid.innerHTML = '';
    }
    
    if (filteredPokemon.length === 0) {
        pokemonGrid.innerHTML = '<div class="no-pokemon">No Pokemon found matching your criteria.</div>';
        pokemonGrid.style.display = 'block';
        return;
    }
    
    // Only add Pokemon that aren't already displayed
    const existingCards = pokemonGrid.children.length;
    const pokemonToShow = clearExisting ? filteredPokemon : filteredPokemon.slice(existingCards);
    
    pokemonToShow.forEach(pokemon => {
        const pokemonCard = createPokemonCard(pokemon);
        pokemonGrid.appendChild(pokemonCard);
    });
    
    pokemonGrid.style.display = 'grid';
}

function displayNewPokemon(newPokemon) {
    const pokemonGrid = document.getElementById('pokemonGrid');
    
    newPokemon.forEach(pokemon => {
        const pokemonCard = createPokemonCard(pokemon);
        pokemonGrid.appendChild(pokemonCard);
    });
    
    pokemonGrid.style.display = 'grid';
}

function createPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.onclick = () => showPokemonDetails(pokemon);
    
    // Get Pokemon sprite from PokeAPI
    const pokemonSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
    
    // Get type colors
    const primaryType = pokemon.type1?.toLowerCase() || 'normal';
    const secondaryType = pokemon.type2?.toLowerCase();
    
    card.innerHTML = `
        <div class="pokemon-image">
            <img src="${pokemonSprite}" alt="${pokemon.name}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'">
        </div>
        <div class="pokemon-info">
            <h3 class="pokemon-name">#${pokemon.id} ${pokemon.name}</h3>
            <div class="pokemon-types">
                <span class="type-badge type-${primaryType}">${pokemon.type1}</span>
                ${secondaryType ? `<span class="type-badge type-${secondaryType}">${pokemon.type2}</span>` : ''}
            </div>
            <div class="pokemon-stats-preview">
                <div class="stat-preview">
                    <span class="stat-label">HP:</span>
                    <span class="stat-value">${pokemon.baseHp}</span>
                </div>
                <div class="stat-preview">
                    <span class="stat-label">ATK:</span>
                    <span class="stat-value">${pokemon.baseAttack}</span>
                </div>
                <div class="stat-preview">
                    <span class="stat-label">DEF:</span>
                    <span class="stat-value">${pokemon.baseDefence}</span>
                </div>
                <div class="stat-preview">
                    <span class="stat-label">SPD:</span>
                    <span class="stat-value">${pokemon.baseSpeed}</span>
                </div>
            </div>
            ${pokemon.legendary ? '<div class="legendary-badge">⭐ Legendary</div>' : ''}
        </div>
    `;
    
    return card;
}

function filterPokemon() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedType = document.getElementById('typeFilter').value.toLowerCase();
    
    filteredPokemon = allPokemon.filter(pokemon => {
        const matchesSearch = !searchTerm || 
            pokemon.name.toLowerCase().includes(searchTerm) ||
            pokemon.id.toString().includes(searchTerm);
        
        const matchesType = !selectedType || 
            pokemon.type1?.toLowerCase() === selectedType ||
            pokemon.type2?.toLowerCase() === selectedType;
        
        return matchesSearch && matchesType;
    });
    
    // Reset and display filtered results
    const pokemonGrid = document.getElementById('pokemonGrid');
    pokemonGrid.innerHTML = '';
    displayPokemon();
    updateStats();
}

function updateStats() {
    document.getElementById('totalCount').textContent = allPokemon.length;
    document.getElementById('showingCount').textContent = filteredPokemon.length;
}

function showPokemonDetails(pokemon) {
    const modal = document.getElementById('pokemonModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalImage = document.getElementById('modalImage');
    const modalDetails = document.getElementById('modalDetails');
    
    modalTitle.textContent = `#${pokemon.id} ${pokemon.name}`;
    modalImage.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
    modalImage.alt = pokemon.name;
    
    const primaryType = pokemon.type1?.toLowerCase() || 'normal';
    const secondaryType = pokemon.type2?.toLowerCase();
    
    modalDetails.innerHTML = `
        <div class="detail-section">
            <h4>Basic Information</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">ID:</span>
                    <span class="detail-value">#${pokemon.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Generation:</span>
                    <span class="detail-value">${pokemon.generation || 'Unknown'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Legendary:</span>
                    <span class="detail-value">${pokemon.legendary ? 'Yes' : 'No'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Types</h4>
            <div class="pokemon-types">
                <span class="type-badge type-${primaryType}">${pokemon.type1}</span>
                ${secondaryType ? `<span class="type-badge type-${secondaryType}">${pokemon.type2}</span>` : ''}
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Base Stats</h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">HP:</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${(pokemon.baseHp / 255) * 100}%"></div>
                        <span class="stat-value">${pokemon.baseHp}</span>
                    </div>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Attack:</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${(pokemon.baseAttack / 255) * 100}%"></div>
                        <span class="stat-value">${pokemon.baseAttack}</span>
                    </div>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Defence:</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${(pokemon.baseDefence / 255) * 100}%"></div>
                        <span class="stat-value">${pokemon.baseDefence}</span>
                    </div>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Speed:</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${(pokemon.baseSpeed / 255) * 100}%"></div>
                        <span class="stat-value">${pokemon.baseSpeed}</span>
                    </div>
                </div>
            </div>
        </div>
        
        ${pokemon.description ? `
        <div class="detail-section">
            <h4>Description</h4>
            <p class="pokemon-description">${pokemon.description}</p>
        </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('pokemonModal').style.display = 'none';
}

function loadMorePokemon() {
    loadPokemon();
}

function searchPokemon() {
    filterPokemon();
}

function goBack() {
    window.location.href = 'index.html';
}

function goToMyPokemon() {
    window.location.href = 'my-pokemon.html';
}

// Utility function for debouncing search input
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

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('pokemonModal');
    if (event.target === modal) {
        closeModal();
    }
};
