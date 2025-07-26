/**
 * Example: Updating pokemon-unified.js to use the new Pokemon Card System
 * 
 * This shows how to migrate from the current modal system to the unified card system
 */

// OLD WAY (current implementation):
function showPokemonDetails(pokemon) {
    const modal = document.getElementById('pokemonModal');
    // ... lots of manual HTML generation and styling
    // ... context-specific logic mixed in
    // ... hard to maintain and extend
}

// NEW WAY (using Pokemon Card System):
function showPokemonDetails(pokemon) {
    // Determine context based on current view
    const context = currentView === 'my' ? 'MY_COLLECTION' : 'BROWSE_ALL';
    
    // Find caught Pokemon data if available
    const caughtPokemon = myPokemon.find(myP => 
        myP.name && myP.name.toLowerCase() === pokemon.name.toLowerCase()
    );
    
    // Show card with appropriate context
    pokemonCards.showCard(pokemon, context, {
        caughtPokemon: caughtPokemon,
        callbacks: {
            close: closeModal,
            rename: renamePokemon,
            release: releasePokemon
        }
    });
}

// Additional callback functions
function renamePokemon(pokemon) {
    const newName = prompt('Enter new nickname:', pokemon.nickname || pokemon.name);
    if (newName && newName.trim()) {
        // Update Pokemon nickname in database
        updatePokemonNickname(pokemon, newName.trim());
        pokemonCards.closeCard(); // Close and refresh
    }
}

function releasePokemon(pokemon) {
    if (confirm(`Are you sure you want to release ${pokemon.name}?`)) {
        // Remove Pokemon from collection
        removePokemonFromCollection(pokemon);
        pokemonCards.closeCard();
        refreshPokemonDisplay(); // Refresh the grid
    }
}

// For catch page (encounter context):
function showPokemonEncounter(pokemonData, userData) {
    pokemonCards.showCard(pokemonData, 'ENCOUNTER', {
        pokeballCount: userData.pokeballCount,
        callbacks: {
            catch: startThrowAnimation,
            runAway: runAway,
            close: runAway
        }
    });
}

// For future battle system:
function showBattlePokemon(pokemon, battleData) {
    pokemonCards.showCard(pokemon, 'BATTLE', {
        battleStats: {
            currentHP: battleData.currentHP,
            maxHP: battleData.maxHP,
            statusEffect: battleData.statusEffect
        },
        moves: battleData.availableMoves,
        callbacks: {
            selectMove: (pokemon, move) => useBattleMove(pokemon, move),
            switchPokemon: () => showPokemonSwitchMenu()
        }
    });
}

// Initialize the card system when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Create global card system instance
    window.pokemonCards = new PokemonCardSystem();
    
    // Continue with existing initialization...
});

/**
 * Benefits of this approach:
 * 
 * 1. CONSISTENCY: All Pokemon cards look and behave the same
 * 2. MAINTAINABILITY: One place to update card design
 * 3. EXTENSIBILITY: Easy to add new contexts (battle, comparison, etc.)
 * 4. REUSABILITY: Same card system across all pages
 * 5. LESS CODE: Remove duplicate modal HTML and JavaScript
 * 6. TYPE SAFETY: Clear context definitions prevent errors
 * 7. FUTURE PROOF: Ready for battle system and other features
 */
