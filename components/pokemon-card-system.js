/**
 * Universal Pokemon Card System
 * 
 * This system provides a unified way to display Pokemon cards across all contexts:
 * - Browse All Pokemon
 * - My Pokemon Collection
 * - Pokemon Encounters (Catch)
 * - Pokemon Battles
 * - Future contexts
 * 
 * Usage:
 * const cardSystem = new PokemonCardSystem();
 * cardSystem.showCard(pokemonData, context, options);
 */

class PokemonCardSystem {
    constructor() {
        this.modalId = 'universalPokemonModal';
        this.currentContext = null;
        this.currentPokemon = null;
        this.callbacks = {};
        
        // Initialize the modal HTML if it doesn't exist
        this.initializeModal();
    }

    /**
     * Card Context Configurations
     * Each context defines what sections to show and what actions are available
     */
    static CONTEXTS = {
        BROWSE_ALL: {
            id: 'browse_all',
            title: 'Pokemon Details',
            sections: ['basic', 'types', 'stats', 'info', 'caught_status'],
            actions: ['close'],
            showCaughtIndicator: true,
            headerStyle: 'type_based'
        },
        
        MY_COLLECTION: {
            id: 'my_collection',
            title: 'Your Pokemon',
            sections: ['basic', 'types', 'stats', 'personal_info', 'catch_details'],
            actions: ['close', 'rename', 'release'],
            showPersonalStats: true,
            headerStyle: 'type_based'
        },
        
        ENCOUNTER: {
            id: 'encounter',
            title: 'Wild Pokemon Appeared!',
            sections: ['basic', 'types', 'stats', 'encounter_info'],
            actions: ['catch', 'run_away'],
            showEncounterActions: true,
            headerStyle: 'type_based',
            modalClass: 'encounter-modal'
        },
        
        BATTLE: {
            id: 'battle',
            title: 'Battle Pokemon',
            sections: ['basic', 'types', 'battle_stats', 'moves'],
            actions: ['select_move', 'switch_pokemon'],
            showBattleInfo: true,
            headerStyle: 'battle_themed',
            modalClass: 'battle-modal'
        },
        
        COMPARISON: {
            id: 'comparison',
            title: 'Pokemon Comparison',
            sections: ['basic', 'types', 'stats'],
            actions: ['close'],
            showComparison: true,
            headerStyle: 'type_based'
        }
    };

    /**
     * Show a Pokemon card with specific context
     * @param {Object} pokemonData - Pokemon data object
     * @param {string} contextId - Context identifier (BROWSE_ALL, MY_COLLECTION, etc.)
     * @param {Object} options - Additional options and data
     */
    showCard(pokemonData, contextId, options = {}) {
        const context = PokemonCardSystem.CONTEXTS[contextId];
        if (!context) {
            throw new Error(`Unknown context: ${contextId}`);
        }

        this.currentContext = context;
        this.currentPokemon = pokemonData;
        this.callbacks = options.callbacks || {};

        // Build the card content
        this.buildCard(pokemonData, context, options);
        
        // Show the modal
        this.showModal();
    }

    /**
     * Initialize the universal modal HTML
     */
    initializeModal() {
        // Check if modal already exists
        if (document.getElementById(this.modalId)) {
            return;
        }

        const modalHTML = `
            <div id="${this.modalId}" class="pokemon-card-modal hidden">
                <button class="pokemon-card-modal-close" onclick="PokemonCardSystem.instance.closeCard()">&times;</button>
                <div class="pokemon-card-modal-content">
                    <div class="pokemon-trading-card" id="universalPokemonCard">
                        <!-- Header Section -->
                        <div id="pokemonCardHeader" class="pokemon-trading-card-header normal">
                            <div class="pokemon-trading-card-name" id="pokemonName">Pokemon Name</div>
                        </div>
                        
                        <!-- Image Section -->
                        <div class="pokemon-trading-card-image-container">
                            <img id="pokemonImage" class="pokemon-trading-card-image" src="" alt="Pokemon">
                            <div id="pokemonImageOverlay" class="pokemon-image-overlay"></div>
                            <!-- Type badges overlaid on image -->
                            <div id="pokemonTypes" class="pokemon-trading-card-types-overlay">
                                <!-- Type badges populated dynamically -->
                            </div>
                            <!-- ID overlaid on image -->
                            <div id="pokemonIdOverlay" class="pokemon-trading-card-id-overlay">
                                <!-- ID populated dynamically -->
                            </div>
                        </div>
                        
                        <!-- Stats Section -->
                        <div id="pokemonStatsContainer" class="pokemon-trading-card-stats">
                            <!-- Stats populated dynamically -->
                        </div>
                        
                        <!-- Dynamic Content Sections -->
                        <div id="pokemonDynamicContent" style="padding: 0 var(--space-md) var(--space-md);">
                            <!-- Context-specific content goes here -->
                        </div>
                        
                        <!-- Action Buttons Section -->
                        <div id="pokemonActionsContainer" class="pokemon-trading-card-actions">
                            <!-- Action buttons populated dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Store instance reference for global access
        PokemonCardSystem.instance = this;
    }

    /**
     * Build the card content based on context and Pokemon data
     */
    buildCard(pokemonData, context, options) {
        // Set basic Pokemon info
        this.setBasicInfo(pokemonData);
        
        // Set type-based styling
        this.setTypeBasedStyling(pokemonData);
        
        // Build sections based on context
        this.buildSections(pokemonData, context, options);
        
        // Build action buttons
        this.buildActions(context, options);
        
        // Apply context-specific styling
        this.applyContextStyling(context);
    }

    /**
     * Set basic Pokemon information (name, image, ID)
     */
    setBasicInfo(pokemonData) {
        const nameElement = document.getElementById('pokemonName');
        const imageElement = document.getElementById('pokemonImage');
        const idOverlay = document.getElementById('pokemonIdOverlay');

        nameElement.textContent = this.formatPokemonName(pokemonData.name);
        imageElement.src = this.getPokemonImageUrl(pokemonData);
        imageElement.alt = pokemonData.name;

        // Set ID overlay
        idOverlay.innerHTML = '';
        if (pokemonData.id || pokemonData.nationalDexNumber) {
            const idBadge = document.createElement('span');
            idBadge.className = 'overlay-badge id-badge';
            idBadge.textContent = `#${pokemonData.id || pokemonData.nationalDexNumber}`;
            idOverlay.appendChild(idBadge);
        }
    }

    /**
     * Set type-based styling and type badges
     */
    setTypeBasedStyling(pokemonData) {
        const headerElement = document.getElementById('pokemonCardHeader');
        const typesContainer = document.getElementById('pokemonTypes');
        
        const types = this.getPokemonTypes(pokemonData);
        const primaryType = types[0] || 'normal';
        
        // Set header class based on primary type
        headerElement.className = `pokemon-trading-card-header ${primaryType.toLowerCase()}`;
        
        // Clear and populate type badges with overlay styling
        typesContainer.innerHTML = '';
        types.forEach(type => {
            const badge = this.createTypeBadge(type);
            badge.classList.add('overlay-badge');
            typesContainer.appendChild(badge);
        });
    }

    /**
     * Build context-specific sections
     */
    buildSections(pokemonData, context, options) {
        const dynamicContent = document.getElementById('pokemonDynamicContent');
        dynamicContent.innerHTML = '';

        context.sections.forEach(sectionType => {
            const section = this.createSection(sectionType, pokemonData, options);
            if (section) {
                dynamicContent.appendChild(section);
            }
        });
    }

    /**
     * Create a specific section based on type
     */
    createSection(sectionType, pokemonData, options) {
        const sectionBuilders = {
            basic: () => this.createBasicSection(pokemonData),
            types: () => null, // Types are handled in setTypeBasedStyling, no separate section needed
            stats: () => this.createStatsSection(pokemonData, options),
            info: () => this.createInfoSection(pokemonData),
            caught_status: () => this.createCaughtStatusSection(pokemonData, options),
            personal_info: () => this.createPersonalInfoSection(pokemonData, options),
            catch_details: () => this.createCatchDetailsSection(pokemonData, options),
            encounter_info: () => this.createEncounterInfoSection(pokemonData, options),
            battle_stats: () => this.createBattleStatsSection(pokemonData, options),
            moves: () => this.createMovesSection(pokemonData, options)
        };

        const builder = sectionBuilders[sectionType];
        return builder ? builder() : null;
    }

    /**
     * Section Builders - Each creates a specific section
     */
    createBasicSection(pokemonData) {
        // Basic section removed - ID moved to overlay, saving space
        return null;
    }

    createInfoSection(pokemonData) {
        const section = document.createElement('div');
        section.className = 'pokemon-card-section pokemon-section';
        
        section.innerHTML = `
            <div class="pokemon-card-section-content">
                <div class="pokemon-card-header">
                    <h4 class="pokemon-subtitle">Pokemon Information</h4>
                </div>
                <div class="pokemon-card-body">
                    <div class="pokemon-text-small">
                        <strong>Species:</strong> ${this.formatPokemonName(pokemonData.name)} Pokemon<br>
                        <strong>Category:</strong> ${pokemonData.category || 'Unknown'}<br>
                        <strong>Legendary:</strong> ${pokemonData.legendary ? 'Yes' : 'No'}
                    </div>
                    ${pokemonData.description ? `
                    <div class="pokemon-text-small" style="margin-top: var(--space-sm); font-style: italic;">
                        ${pokemonData.description}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        return section;
    }

    createStatsSection(pokemonData, options) {
        const statsContainer = document.getElementById('pokemonStatsContainer');
        statsContainer.innerHTML = '';

        const stats = this.getPokemonStats(pokemonData, options);
        
        stats.forEach(stat => {
            const statRow = document.createElement('div');
            statRow.className = 'pokemon-trading-card-stats-row';
            statRow.innerHTML = `
                <span class="pokemon-trading-card-stat-name">${stat.name}</span>
                <span class="pokemon-trading-card-stat-value">${stat.value}</span>
            `;
            statsContainer.appendChild(statRow);
        });

        return null; // Stats are directly added to existing container
    }

    createCaughtStatusSection(pokemonData, options) {
        const section = document.createElement('div');
        section.className = 'pokemon-card-section pokemon-section';
        
        const isCaught = options.caughtPokemon || this.checkIfCaught(pokemonData);
        
        section.innerHTML = `
            <div class="pokemon-card-section-content">
                <div class="pokemon-card ${isCaught ? 'success' : 'warning'}">
                    <div class="pokemon-card-header">
                        <h4>${isCaught ? '✅ CAUGHT!' : '❌ NOT CAUGHT'}</h4>
                    </div>
                </div>
            </div>
        `;
        
        return section;
    }

    createPersonalInfoSection(pokemonData, options) {
        const section = document.createElement('div');
        section.className = 'pokemon-card-section pokemon-section';
        
        const caughtPokemon = options.caughtPokemon || {};
        
        section.innerHTML = `
            <div class="pokemon-card-section-content">
                <div class="pokemon-card-header">
                    <h4 class="pokemon-subtitle">Personal Info</h4>
                </div>
                <div class="pokemon-card-body">
                    <div class="pokemon-grid-2">
                        <div class="pokemon-text-small"><strong>Nickname:</strong> ${caughtPokemon.nickname || 'None'}</div>
                        <div class="pokemon-text-small"><strong>Level:</strong> ${caughtPokemon.level || 1}</div>
                        <div class="pokemon-text-small"><strong>Experience:</strong> ${caughtPokemon.experience || 0}</div>
                        <div class="pokemon-text-small"><strong>Date Caught:</strong> ${caughtPokemon.dateCaught || 'Unknown'}</div>
                        <div class="pokemon-text-small" style="grid-column: 1 / -1;"><strong>Battle Record:</strong> ${caughtPokemon.wins || 0}W / ${caughtPokemon.losses || 0}L</div>
                        ${caughtPokemon.isShiny ? '<div class="pokemon-text" style="grid-column: 1 / -1; color: gold; font-weight: bold;">✨ SHINY POKEMON ✨</div>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        return section;
    }

    createCatchDetailsSection(pokemonData, options) {
        const section = document.createElement('div');
        section.className = 'pokemon-card-section pokemon-section';
        
        const caughtPokemon = options.caughtPokemon || {};
        
        section.innerHTML = `
            <div class="pokemon-card-section-content">
                <div class="pokemon-card-header">
                    <h4 class="pokemon-subtitle">Training Progress</h4>
                </div>
                <div class="pokemon-card-body">
                    <div class="pokemon-grid-2">
                        <div class="pokemon-text-small"><strong>Trained HP:</strong> ${caughtPokemon.hp || pokemonData.baseHp} <span style="color: var(--pokemon-green);">(+${(caughtPokemon.hp || pokemonData.baseHp) - pokemonData.baseHp})</span></div>
                        <div class="pokemon-text-small"><strong>Trained ATK:</strong> ${caughtPokemon.attack || pokemonData.baseAttack} <span style="color: var(--pokemon-green);">(+${(caughtPokemon.attack || pokemonData.baseAttack) - pokemonData.baseAttack})</span></div>
                        <div class="pokemon-text-small"><strong>Trained DEF:</strong> ${caughtPokemon.defense || pokemonData.baseDefence} <span style="color: var(--pokemon-green);">(+${(caughtPokemon.defense || pokemonData.baseDefence) - pokemonData.baseDefence})</span></div>
                        <div class="pokemon-text-small"><strong>Trained SPD:</strong> ${caughtPokemon.speed || pokemonData.baseSpeed} <span style="color: var(--pokemon-green);">(+${(caughtPokemon.speed || pokemonData.baseSpeed) - pokemonData.baseSpeed})</span></div>
                    </div>
                </div>
            </div>
        `;
        
        return section;
    }

    createEncounterInfoSection(pokemonData, options) {
        const section = document.createElement('div');
        section.className = 'pokemon-card-section pokemon-section';
        
        const pokeballCount = options.pokeballCount || 0;
        
        section.innerHTML = `
            <div class="pokemon-card-section-content">
                <div class="pokemon-card ${pokeballCount > 0 ? 'info' : 'warning'}">
                    <div class="pokemon-card-header">
                        <h4 class="pokemon-subtitle">POKEBALLS: ${pokeballCount}</h4>
                    </div>
                    ${pokeballCount === 0 ? `
                    <div class="pokemon-card-body">
                        <div class="pokemon-text" style="text-align: center; font-weight: bold; margin-bottom: var(--space-xs);">NO MORE POKEBALLS!</div>
                        <div class="pokemon-text-small" style="text-align: center;">Complete minigame to catch POKEMON</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        return section;
    }

    createBattleStatsSection(pokemonData, options) {
        const section = document.createElement('div');
        section.className = 'pokemon-card-section pokemon-section';
        
        const caughtPokemon = options.caughtPokemon || {};
        const battleStats = options.battleStats || {};
        const statusEffect = battleStats.statusEffect || caughtPokemon.statusEffect;
        const currentHP = battleStats.currentHP || caughtPokemon.currentHP || caughtPokemon.hp || pokemonData.baseHp;
        const maxHP = battleStats.maxHP || caughtPokemon.hp || pokemonData.baseHp;
        
        section.innerHTML = `
            <div class="pokemon-card-section-content">
                <div class="pokemon-card-header">
                    <h4 class="pokemon-subtitle">Battle Status</h4>
                </div>
                <div class="pokemon-card-body">
                    <div class="pokemon-flex" style="justify-content: space-between; align-items: center; margin-bottom: var(--space-xs);">
                        <span class="pokemon-text" style="font-weight: bold;">HP:</span>
                        <span class="pokemon-text">${currentHP} / ${maxHP}</span>
                    </div>
                    <div class="hp-bar-container">
                        <div class="hp-bar" style="width: ${this.getHPPercentage(currentHP, maxHP)}%; background: ${this.getHPBarColor(currentHP, maxHP)};"></div>
                    </div>
                    ${statusEffect ? `
                    <div class="pokemon-card warning" style="margin-top: var(--space-sm);">
                        <div class="pokemon-card-body" style="text-align: center; color: var(--pokemon-red); font-weight: bold; text-transform: uppercase;">
                            ${statusEffect}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        return section;
    }

    createMovesSection(pokemonData, options) {
        const section = document.createElement('div');
        section.className = 'pokemon-card-section pokemon-section';
        
        const moves = options.moves || ['Tackle', 'Growl'];
        
        section.innerHTML = `
            <div class="pokemon-card-section-content">
                <div class="pokemon-card-header">
                    <h4 class="pokemon-subtitle">Available Moves</h4>
                </div>
                <div class="pokemon-card-body">
                    <div class="pokemon-grid-2">
                        ${moves.map(move => `
                            <button class="pokemon-btn pokemon-btn-primary" style="font-size: var(--font-size-sm);" 
                                    onclick="PokemonCardSystem.instance.executeMoveCallback('${move}')">
                                ${move}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        return section;
    }

    /**
     * Build action buttons based on context
     */
    buildActions(context, options) {
        const actionsContainer = document.getElementById('pokemonActionsContainer');
        actionsContainer.innerHTML = '';

        const actionBuilders = {
            close: () => this.createCloseButton(),
            catch: () => this.createCatchButton(options),
            run_away: () => this.createRunAwayButton(options),
            rename: () => this.createRenameButton(options),
            release: () => this.createReleaseButton(options),
            select_move: () => this.createSelectMoveButton(options),
            switch_pokemon: () => this.createSwitchPokemonButton(options)
        };

        context.actions.forEach(actionType => {
            const builder = actionBuilders[actionType];
            if (builder) {
                const button = builder();
                actionsContainer.appendChild(button);
            }
        });
    }

    /**
     * Action Button Builders
     */
    createCloseButton() {
        const button = document.createElement('button');
        button.className = 'pokemon-button-retro secondary';
        button.textContent = 'CLOSE';
        button.onclick = () => this.closeCard();
        return button;
    }

    createCatchButton(options) {
        const button = document.createElement('button');
        button.className = 'pokemon-button-retro success';
        button.textContent = 'CATCH!';
        button.onclick = () => this.executeCallback('catch', options);
        return button;
    }

    createRunAwayButton(options) {
        const button = document.createElement('button');
        button.className = 'pokemon-button-retro secondary';
        button.textContent = 'RUN AWAY';
        button.onclick = () => this.executeCallback('runAway', options);
        return button;
    }

    createRenameButton(options) {
        const button = document.createElement('button');
        button.className = 'pokemon-button-retro primary';
        button.textContent = 'RENAME';
        button.onclick = () => this.executeCallback('rename', options);
        return button;
    }

    createReleaseButton(options) {
        const button = document.createElement('button');
        button.className = 'pokemon-button-retro danger';
        button.textContent = 'RELEASE';
        button.onclick = () => this.executeCallback('release', options);
        return button;
    }

    createSelectMoveButton(options) {
        const button = document.createElement('button');
        button.className = 'pokemon-button-retro primary';
        button.textContent = 'SELECT MOVE';
        button.onclick = () => this.executeCallback('selectMove', options);
        return button;
    }

    createSwitchPokemonButton(options) {
        const button = document.createElement('button');
        button.className = 'pokemon-button-retro secondary';
        button.textContent = 'SWITCH';
        button.onclick = () => this.executeCallback('switchPokemon', options);
        return button;
    }

    /**
     * Utility Methods
     */
    formatPokemonName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    getPokemonImageUrl(pokemonData) {
        return pokemonData.sprites?.official_artwork || 
               pokemonData.sprites?.front_default || 
               `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonData.id}.png`;
    }

    calculateHP(pokemonData) {
        return pokemonData.baseHp || pokemonData.hp || Math.floor(Math.random() * 50) + 30;
    }

    getPokemonTypes(pokemonData) {
        if (pokemonData.types && Array.isArray(pokemonData.types)) {
            return pokemonData.types.map(type => type.type?.name || type);
        }
        
        const types = [];
        if (pokemonData.type1) types.push(pokemonData.type1);
        if (pokemonData.type2) types.push(pokemonData.type2);
        
        return types.length > 0 ? types : ['normal'];
    }

    getPokemonStats(pokemonData, options) {
        const caughtPokemon = options.caughtPokemon || {};
        
        const stats = [
            { 
                name: 'Attack', 
                value: caughtPokemon.attack || pokemonData.baseAttack || pokemonData.attack || Math.floor(Math.random() * 40) + 40,
                base: pokemonData.baseAttack || pokemonData.attack || Math.floor(Math.random() * 40) + 40
            },
            { 
                name: 'Defense', 
                value: caughtPokemon.defense || pokemonData.baseDefence || pokemonData.defense || Math.floor(Math.random() * 40) + 35,
                base: pokemonData.baseDefence || pokemonData.defense || Math.floor(Math.random() * 40) + 35
            },
            { 
                name: 'Speed', 
                value: caughtPokemon.speed || pokemonData.baseSpeed || pokemonData.speed || Math.floor(Math.random() * 40) + 45,
                base: pokemonData.baseSpeed || pokemonData.speed || Math.floor(Math.random() * 40) + 45
            }
        ];

        return stats;
    }

    getHPBarColor(currentHP, maxHP) {
        const percentage = (currentHP / maxHP) * 100;
        if (percentage > 50) return '#27ae60';  // Green
        if (percentage > 25) return '#f39c12';  // Orange
        return '#e74c3c';  // Red
    }

    getHPPercentage(currentHP, maxHP) {
        return Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
    }

    createTypeBadge(type) {
        const badge = document.createElement('span');
        badge.className = `pokemon-trading-card-type-badge ${type.toLowerCase()}`;
        badge.textContent = type.toUpperCase();
        return badge;
    }

    checkIfCaught(pokemonData) {
        // This would check against user's collection
        // Implementation depends on how you store caught Pokemon
        return false; // Placeholder
    }

    applyContextStyling(context) {
        const modal = document.getElementById(this.modalId);
        
        // Remove existing context classes
        modal.classList.remove('encounter-modal', 'battle-modal', 'collection-modal');
        
        // Add context-specific class
        if (context.modalClass) {
            modal.classList.add(context.modalClass);
        }
    }

    executeCallback(actionName, options) {
        const callback = this.callbacks[actionName];
        if (callback && typeof callback === 'function') {
            callback(this.currentPokemon, options);
        }
    }

    executeMoveCallback(move) {
        const callback = this.callbacks['selectMove'];
        if (callback && typeof callback === 'function') {
            callback(this.currentPokemon, move);
        }
    }

    showModal() {
        const modal = document.getElementById(this.modalId);
        modal.classList.remove('hidden');
        modal.style.display = 'block';
    }

    closeCard() {
        const modal = document.getElementById(this.modalId);
        modal.classList.add('hidden');
        modal.style.display = 'none';
        
        // Execute close callback if provided
        this.executeCallback('close');
    }
}

// Create global instance
window.PokemonCardSystem = PokemonCardSystem;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PokemonCardSystem;
}
