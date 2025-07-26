# Pokemon Card System Documentation

## Overview
The Pokemon Card System is a unified component that handles all Pokemon card displays across the entire application. It provides consistent styling, behavior, and data handling while allowing context-specific customizations.

## Architecture

### Core Concept
- **One Card Component**: Single trading card design used everywhere
- **Context-Based Configuration**: Different contexts show different sections and actions
- **Consistent Styling**: Same visual design with type-based coloring
- **Modular Sections**: Mix and match sections based on context needs

### File Structure
```
components/
├── pokemon-card-system.js      # Main card system class
├── pokemon-card-contexts.js    # Context configurations
└── pokemon-card-styles.css     # Additional context-specific styles
```

## Usage Examples

### 1. Browse All Pokemon Context
```javascript
const cardSystem = new PokemonCardSystem();

// Show Pokemon from browse view
cardSystem.showCard(pokemonData, 'BROWSE_ALL', {
    caughtPokemon: userCaughtPokemon, // Optional: if user has caught this Pokemon
    callbacks: {
        close: () => console.log('Card closed')
    }
});
```

### 2. My Pokemon Collection Context
```javascript
cardSystem.showCard(pokemonData, 'MY_COLLECTION', {
    caughtPokemon: usersPokemonData, // Personal Pokemon data with level, stats, etc.
    callbacks: {
        close: () => hideModal(),
        rename: (pokemon) => showRenameDialog(pokemon),
        release: (pokemon) => confirmRelease(pokemon)
    }
});
```

### 3. Pokemon Encounter Context
```javascript
cardSystem.showCard(pokemonData, 'ENCOUNTER', {
    pokeballCount: 5,
    callbacks: {
        catch: (pokemon) => startCatchAnimation(pokemon),
        runAway: () => returnToScanner(),
        close: () => returnToScanner()
    }
});
```

### 4. Pokemon Battle Context
```javascript
cardSystem.showCard(pokemonData, 'BATTLE', {
    battleStats: {
        currentHP: 45,
        maxHP: 78,
        statusEffect: 'poisoned'
    },
    moves: ['Thunder', 'Quick Attack', 'Agility', 'Thunder Wave'],
    callbacks: {
        selectMove: (pokemon, move) => usePokemonMove(pokemon, move),
        switchPokemon: () => showPokemonSwitchMenu()
    }
});
```

## Available Contexts

### BROWSE_ALL
- **Purpose**: Viewing Pokemon from the complete Pokedex
- **Sections**: Basic info, types, stats, general info, caught status
- **Actions**: Close
- **Special**: Shows whether Pokemon is caught or not

### MY_COLLECTION  
- **Purpose**: Viewing Pokemon the user owns
- **Sections**: Basic info, types, personal stats, catch details
- **Actions**: Close, rename, release
- **Special**: Shows personal Pokemon data (level, catch date, etc.)

### ENCOUNTER
- **Purpose**: Wild Pokemon encounters during catching
- **Sections**: Basic info, types, stats, encounter info (pokeball count)
- **Actions**: Catch, run away
- **Special**: Shows pokeball count and catch options

### BATTLE
- **Purpose**: Pokemon during battle scenarios
- **Sections**: Basic info, types, battle stats, moves
- **Actions**: Select move, switch Pokemon
- **Special**: Shows current HP, status effects, available moves

### COMPARISON
- **Purpose**: Comparing multiple Pokemon side by side
- **Sections**: Basic info, types, stats
- **Actions**: Close
- **Special**: Optimized for comparison view

## Section Types

### Basic Sections
- **basic**: Pokemon name, image, HP
- **types**: Type badges with proper coloring
- **stats**: Attack, Defense, Speed statistics

### Context-Specific Sections
- **info**: General Pokemon information (ID, generation, legendary)
- **caught_status**: Whether Pokemon is caught or not
- **personal_info**: User's Pokemon data (level, experience)
- **catch_details**: When/where Pokemon was caught
- **encounter_info**: Pokeball count and encounter status
- **battle_stats**: Current HP, status effects, battle-specific data
- **moves**: Available moves for battle

## Customization

### Adding New Contexts
```javascript
// Add to PokemonCardSystem.CONTEXTS
NEW_CONTEXT: {
    id: 'new_context',
    title: 'New Context Title',
    sections: ['basic', 'types', 'custom_section'],
    actions: ['close', 'custom_action'],
    customProperty: true,
    headerStyle: 'type_based'
}
```

### Adding New Sections
```javascript
// Add to createSection method in PokemonCardSystem
createCustomSection(pokemonData, options) {
    const section = document.createElement('div');
    section.className = 'pokemon-card-section';
    // ... build custom section content
    return section;
}
```

### Adding New Actions
```javascript
// Add to buildActions method
createCustomActionButton(options) {
    const button = document.createElement('button');
    button.className = 'pokemon-button-retro primary';
    button.textContent = 'CUSTOM ACTION';
    button.onclick = () => this.executeCallback('customAction', options);
    return button;
}
```

## Integration Guide

### Step 1: Include the System
```html
<script src="components/pokemon-card-system.js"></script>
```

### Step 2: Initialize
```javascript
// Create global instance
const pokemonCards = new PokemonCardSystem();
```

### Step 3: Replace Existing Modals
Replace existing `showPokemonDetails` functions with:
```javascript
function showPokemonDetails(pokemon) {
    pokemonCards.showCard(pokemon, 'BROWSE_ALL', {
        caughtPokemon: findCaughtPokemon(pokemon),
        callbacks: {
            close: closeModal
        }
    });
}
```

### Step 4: Update HTML
Remove old modal HTML and let the system create its own universal modal.

## Benefits

### For Developers
- **Single Source of Truth**: One card component for all contexts
- **Easy Maintenance**: Changes to card design apply everywhere
- **Consistent API**: Same method signatures across contexts
- **Type Safety**: Clear context definitions and options

### For Users
- **Consistent Experience**: Same card design everywhere
- **Familiar Interface**: Learn once, use everywhere
- **Better Performance**: Shared components and styles

### For Future Development
- **Easy Extension**: Add new contexts without rewriting cards
- **Modular Design**: Mix and match sections as needed
- **Battle System Ready**: Built with battle context in mind
- **Mobile Friendly**: Responsive design across all contexts

## Migration Strategy

1. **Phase 1**: Implement the card system
2. **Phase 2**: Replace catch page modal (already done)
3. **Phase 3**: Replace unified page modal
4. **Phase 4**: Implement battle context
5. **Phase 5**: Remove old modal code

This creates a maintainable, scalable system that will make future Pokemon card features much easier to implement!
