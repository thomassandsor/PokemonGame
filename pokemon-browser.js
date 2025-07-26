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
    
    // Show loading
    loadingSpinner.style.display = 'block';
    errorMessage.style.display = 'none';
    
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
        } else {
            // First load
        }
        
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
    
    // Get types from the correct data structure
    const types = pokemon.types || [];
    const primaryType = types[0]?.toLowerCase() || 'normal';
    const secondaryType = types[1]?.toLowerCase() || null;
    
    // Format Pokemon number with leading zeros
    const formattedNumber = `#${pokemon.id.toString().padStart(3, '0')}`;
    
    card.innerHTML = `
        <div class="pokemon-card-image">
            <img src="${pokemonSprite}" alt="${pokemon.name}" onerror="this.style.display='none'; this.parentNode.textContent='?';">
        </div>
        <div class="pokemon-card-info">
            <div class="pokemon-card-number">${formattedNumber}</div>
            <div class="pokemon-card-name">${pokemon.name}</div>
            <div class="pokemon-card-types">
                ${types.map(type => `<span class="pokemon-type-badge pokemon-type-${type.toLowerCase()}">${type}</span>`).join('')}
            </div>
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
            (pokemon.types && pokemon.types.some(type => type.toLowerCase() === selectedType));
        
        return matchesSearch && matchesType;
    });
    
    // Reset and display filtered results
    const pokemonGrid = document.getElementById('pokemonGrid');
    pokemonGrid.innerHTML = '';
    displayPokemon();
}

function showPokemonDetails(pokemon) {
    const modal = document.getElementById('pokemonModal');
    
    // Set Pokemon name and image
    document.getElementById('modalPokemonName').textContent = pokemon.name;
    document.getElementById('modalImage').src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
    document.getElementById('modalImage').alt = pokemon.name;
    
    // Calculate and display HP (use baseHp if available, otherwise estimate)
    const hpValue = pokemon.baseHp || Math.floor(Math.random() * 50) + 30;
    document.getElementById('pokemonHP').textContent = `HP ${hpValue}`;
    
    // Set type-based header color and display type badges
    const typesContainer = document.getElementById('pokemonTypes');
    const cardHeader = document.getElementById('pokemonCardHeader');
    typesContainer.innerHTML = '';
    
    // Get types from the Pokemon data
    const types = [];
    if (pokemon.type1) types.push(pokemon.type1);
    if (pokemon.type2) types.push(pokemon.type2);
    if (types.length === 0 && pokemon.types) {
        types.push(...pokemon.types);
    }
    
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
    
    // Main stats to display
    const statsToShow = [
        { name: 'Attack', value: pokemon.baseAttack, key: 'baseAttack' },
        { name: 'Defense', value: pokemon.baseDefence, key: 'baseDefence' },
        { name: 'Speed', value: pokemon.baseSpeed, key: 'baseSpeed' }
    ];
    
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
    
    // Populate additional info
    const infoContainer = document.getElementById('pokemonInfoContainer');
    infoContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-xs); padding: 4px 0; border-bottom: 1px solid rgba(45, 52, 54, 0.2);">
            <span style="font-size: var(--font-size-sm); font-weight: bold; color: #2d3436;">ID:</span>
            <span style="font-size: var(--font-size-sm); color: #2d3436;">#${pokemon.id.toString().padStart(3, '0')}</span>
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
