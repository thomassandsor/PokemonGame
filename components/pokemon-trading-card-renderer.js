/**
 * Pokemon Trading Card Renderer
 * 
 * This component bridges the gap between live Pokemon data and the beautiful 
 * trading card design from cards-testing.html. It takes real Pokemon data
 * and renders it using the same visual structure as the hardcoded cards.
 * 
 * Usage:
 * const renderer = new PokemonTradingCardRenderer();
 * renderer.renderCard(container, pokemonData, context, options);
 */

class PokemonTradingCardRenderer {
    constructor() {
        this.pokemonCards = new PokemonCardSystem();
    }

    /**
     * Render a Pokemon trading card with live data
     * @param {HTMLElement} container - Container element to render the card in
     * @param {Object} pokemonData - Live Pokemon data
     * @param {string} contextId - Context (BROWSE_ALL, MY_COLLECTION, etc.)
     * @param {Object} options - Additional options
     */
    renderCard(container, pokemonData, contextId, options = {}) {
        const context = PokemonCardSystem.CONTEXTS[contextId];
        if (!context) {
            throw new Error(`Unknown context: ${contextId}`);
        }

        // Generate unique container ID
        const containerId = `tradingCard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create the trading card HTML structure
        const cardHTML = `
            <div class="pokemon-trading-card">
                <!-- Header Section -->
                <div id="${containerId}_header" class="pokemon-trading-card-header normal">
                    <div class="pokemon-trading-card-name" id="${containerId}_name">Pokemon Name</div>
                </div>
                
                <!-- Image Section -->
                <div class="pokemon-trading-card-image-container">
                    <img id="${containerId}_image" 
                         class="pokemon-trading-card-image" 
                         src="" 
                         alt="Pokemon" 
                         onerror="this.src='/assets/pokeball.svg'">
                    <!-- Type badges overlaid on image -->
                    <div id="${containerId}_types" class="pokemon-trading-card-types-overlay">
                        <!-- Type badges populated dynamically -->
                    </div>
                    <!-- ID overlaid on image -->
                    <div id="${containerId}_id" class="pokemon-trading-card-id-overlay">
                        <!-- ID populated dynamically -->
                    </div>
                </div>
                
                <!-- Stats Section -->
                <div id="${containerId}_stats" class="pokemon-trading-card-stats">
                    <!-- Stats populated dynamically -->
                </div>
                
                <!-- Dynamic Content Sections -->
                <div id="${containerId}_content" style="padding: 0 var(--space-md) var(--space-md);">
                    <!-- Context-specific content goes here -->
                </div>
                
                <!-- Action Buttons Section -->
                <div id="${containerId}_actions" class="pokemon-trading-card-actions">
                    <!-- Action buttons populated dynamically -->
                </div>
            </div>
        `;

        container.innerHTML = cardHTML;

        // Populate the card with live data
        this.populateCard(containerId, pokemonData, context, options);
    }

    /**
     * Populate the trading card with live Pokemon data
     */
    populateCard(containerId, pokemonData, context, options) {
        // Set basic Pokemon info
        const nameElement = document.getElementById(`${containerId}_name`);
        const imageElement = document.getElementById(`${containerId}_image`);

        nameElement.textContent = this.formatPokemonName(pokemonData.name);
        imageElement.src = this.getPokemonImageUrl(pokemonData);
        imageElement.alt = pokemonData.name;

        // Set type-based styling
        const headerElement = document.getElementById(`${containerId}_header`);
        const typesContainer = document.getElementById(`${containerId}_types`);
        
        const types = this.getPokemonTypes(pokemonData);
        const primaryType = types[0] || 'normal';
        
        headerElement.className = `pokemon-trading-card-header ${primaryType.toLowerCase()}`;
        
        // Populate type badges with overlay styling
        typesContainer.innerHTML = '';
        types.forEach(type => {
            const badge = this.createTypeBadge(type);
            badge.classList.add('overlay-badge');
            typesContainer.appendChild(badge);
        });

        // Populate ID overlay
        const idContainer = document.getElementById(`${containerId}_id`);
        idContainer.innerHTML = '';
        if (pokemonData.id) {
            const idBadge = document.createElement('span');
            idBadge.className = 'overlay-badge id-badge';
            idBadge.textContent = `#${pokemonData.id.toString().padStart(3, '0')}`;
            idContainer.appendChild(idBadge);
        }

        // Populate stats (HP, Attack, Defense)
        this.populateStats(containerId, pokemonData, options);

        // Build content sections
        this.buildContentSections(containerId, pokemonData, context, options);

        // Build action buttons
        this.buildActionButtons(containerId, context, options);
    }

    /**
     * Populate the stats section
     */
    populateStats(containerId, pokemonData, options) {
        const statsContainer = document.getElementById(`${containerId}_stats`);
        statsContainer.innerHTML = '';
        
        // Get base stats
        const attack = pokemonData.baseAttack || 50;
        const defense = pokemonData.baseDefence || pokemonData.baseDefense || 50;
        const hp = options.caughtPokemon?.hp || pokemonData.baseHp || 50;
        
        const stats = [
            { name: 'Attack', value: attack },
            { name: 'Defense', value: defense },
            { name: 'HP', value: hp }
        ];
        
        stats.forEach(stat => {
            const statRow = document.createElement('div');
            statRow.className = 'pokemon-trading-card-stats-row';
            
            // Special handling for HP in "My Pokemon" context
            if (stat.name === 'HP' && options.caughtPokemon) {
                const currentHP = options.caughtPokemon.currentHP || options.caughtPokemon.hp;
                const maxHP = options.caughtPokemon.hp;
                const hpPercentage = (currentHP / maxHP) * 100;
                
                const statusEmoji = this.getHPVisualIndicator(hpPercentage);
                const statusText = this.getHPStatusText(hpPercentage);
                
                statRow.innerHTML = `
                    <span class="pokemon-trading-card-stat-name">HP ${statusEmoji}</span>
                    <span class="pokemon-trading-card-stat-value" style="color: white; font-weight: bold;">
                        ${currentHP}/${maxHP} ${statusText}
                    </span>
                `;
            } else {
                statRow.innerHTML = `
                    <span class="pokemon-trading-card-stat-name">${stat.name}</span>
                    <span class="pokemon-trading-card-stat-value">${stat.value}</span>
                `;
            }
            
            statsContainer.appendChild(statRow);
        });
    }

    /**
     * Build dynamic content sections based on context
     */
    buildContentSections(containerId, pokemonData, context, options) {
        const dynamicContent = document.getElementById(`${containerId}_content`);
        dynamicContent.innerHTML = '';

        // Always show basic info (height/weight) for all contexts
        const basicSection = this.createBasicInfoSection(pokemonData);
        if (basicSection) {
            dynamicContent.appendChild(basicSection);
        }

        context.sections.forEach(sectionType => {
            if (sectionType === 'types' || sectionType === 'stats' || sectionType === 'basic') {
                return; // Skip - types/stats already handled above, basic already added
            }
            
            const section = this.createContentSection(sectionType, pokemonData, options);
            if (section) {
                dynamicContent.appendChild(section);
            }
        });
    }

    /**
     * Create individual content sections
     */
    createContentSection(sectionType, pokemonData, options) {
        switch(sectionType) {
            case 'basic':
                return this.createBasicInfoSection(pokemonData);
            case 'info':
                return this.createPokemonInfoSection(pokemonData);
            case 'personal_info':
                return this.createPersonalInfoSection(pokemonData, options);
            case 'catch_details':
                return this.createCatchDetailsSection(pokemonData, options);
            case 'encounter_info':
                return this.createEncounterInfoSection(pokemonData, options);
            default:
                return null;
        }
    }

    /**
     * Create basic info section
     */
    createBasicInfoSection(pokemonData) {
        const section = document.createElement('div');
        section.className = 'pokemon-trading-card-section';
        
        const height = pokemonData.height ? `${(pokemonData.height / 10).toFixed(1)}m` : 'Unknown';
        const weight = pokemonData.weight ? `${(pokemonData.weight / 10).toFixed(1)}kg` : 'Unknown';
        
        section.innerHTML = `
            <div class="pokemon-trading-card-info-row">
                <span class="pokemon-trading-card-info-label">Height:</span>
                <span class="pokemon-trading-card-info-value">${height}</span>
            </div>
            <div class="pokemon-trading-card-info-row">
                <span class="pokemon-trading-card-info-label">Weight:</span>
                <span class="pokemon-trading-card-info-value">${weight}</span>
            </div>
        `;
        
        return section;
    }

    /**
     * Create Pokemon info section (description, generation, etc.)
     */
    createPokemonInfoSection(pokemonData) {
        const section = document.createElement('div');
        section.className = 'pokemon-trading-card-section';
        
        let content = '';
        
        if (pokemonData.description) {
            content += `
                <div class="pokemon-trading-card-description">
                    <strong>Description:</strong><br>
                    <em>${pokemonData.description}</em>
                </div>
            `;
        }
        
        if (pokemonData.generation) {
            content += `
                <div class="pokemon-trading-card-info-row">
                    <span class="pokemon-trading-card-info-label">Generation:</span>
                    <span class="pokemon-trading-card-info-value">${pokemonData.generation}</span>
                </div>
            `;
        }
        
        if (pokemonData.legendary || pokemonData.mythical) {
            const status = pokemonData.mythical ? 'Mythical' : 'Legendary';
            content += `
                <div class="pokemon-trading-card-info-row">
                    <span class="pokemon-trading-card-info-label">Status:</span>
                    <span class="pokemon-trading-card-info-value special">${status} ✨</span>
                </div>
            `;
        }
        
        section.innerHTML = content;
        return content ? section : null;
    }

    /**
     * Create personal info section for caught Pokemon
     */
    createPersonalInfoSection(pokemonData, options) {
        if (!options.caughtPokemon) return null;
        
        const section = document.createElement('div');
        section.className = 'pokemon-trading-card-section';
        
        const pokemon = options.caughtPokemon;
        const level = pokemon.level || 1;
        const nickname = pokemon.nickname || pokemonData.name;
        
        section.innerHTML = `
            <div class="pokemon-trading-card-info-row">
                <span class="pokemon-trading-card-info-label">Level:</span>
                <span class="pokemon-trading-card-info-value">${level}</span>
            </div>
            ${nickname !== pokemonData.name ? `
                <div class="pokemon-trading-card-info-row">
                    <span class="pokemon-trading-card-info-label">Nickname:</span>
                    <span class="pokemon-trading-card-info-value">${nickname}</span>
                </div>
            ` : ''}
            ${pokemon.isShiny ? `
                <div class="pokemon-trading-card-info-row">
                    <span class="pokemon-trading-card-info-label">Special:</span>
                    <span class="pokemon-trading-card-info-value special">Shiny ✨</span>
                </div>
            ` : ''}
        `;
        
        return section;
    }

    /**
     * Create catch details section
     */
    createCatchDetailsSection(pokemonData, options) {
        if (!options.caughtPokemon) return null;
        
        const section = document.createElement('div');
        section.className = 'pokemon-trading-card-section';
        
        const pokemon = options.caughtPokemon;
        const dateCaught = pokemon.dateCaught || new Date().toLocaleDateString();
        
        section.innerHTML = `
            <div class="pokemon-trading-card-info-row">
                <span class="pokemon-trading-card-info-label">Caught:</span>
                <span class="pokemon-trading-card-info-value">${dateCaught}</span>
            </div>
        `;
        
        return section;
    }

    /**
     * Build action buttons
     */
    buildActionButtons(containerId, context, options) {
        const actionsContainer = document.getElementById(`${containerId}_actions`);
        actionsContainer.innerHTML = '';

        context.actions.forEach(actionType => {
            const button = this.createActionButton(actionType, options);
            if (button) {
                actionsContainer.appendChild(button);
            }
        });
    }

    /**
     * Create action buttons
     */
    createActionButton(actionType, options) {
        const button = document.createElement('button');
        button.className = 'pokemon-btn pokemon-btn-primary pokemon-trading-card-action-btn';
        
        switch(actionType) {
            case 'close':
                button.textContent = 'Close';
                button.onclick = () => {
                    // Use the global PokemonCardSystem instance to close the modal
                    if (PokemonCardSystem.instance) {
                        PokemonCardSystem.instance.closeCard();
                    } else if (options.callbacks?.close) {
                        options.callbacks.close();
                    }
                };
                break;
                
            case 'rename':
                button.textContent = 'Rename';
                button.onclick = () => {
                    if (options.callbacks?.rename) {
                        options.callbacks.rename(options.caughtPokemon);
                    }
                };
                break;
                
            case 'release':
                button.textContent = 'Release';
                button.className = 'pokemon-btn pokemon-btn-danger pokemon-trading-card-action-btn';
                button.onclick = () => {
                    if (options.callbacks?.release) {
                        options.callbacks.release(options.caughtPokemon);
                    }
                };
                break;
                
            default:
                return null;
        }
        
        return button;
    }

    // Helper methods
    formatPokemonName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    getPokemonImageUrl(pokemonData) {
        if (pokemonData.sprites?.official_artwork) {
            return pokemonData.sprites.official_artwork;
        }
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.id}.png`;
    }

    getPokemonTypes(pokemonData) {
        if (pokemonData.types && Array.isArray(pokemonData.types)) {
            // Handle both formats: ['grass', 'poison'] or [{type: {name: 'grass'}}]
            return pokemonData.types.map(type => {
                if (typeof type === 'string') return type;
                return type.type?.name || type.name || 'normal';
            });
        }
        return ['normal'];
    }

    createTypeBadge(type) {
        const badge = document.createElement('span');
        badge.className = `pokemon-type-badge pokemon-type-${type.toLowerCase()}`;
        badge.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        return badge;
    }

    getHPVisualIndicator(percentage) {
        if (percentage > 75) return '💚';
        if (percentage > 50) return '💛';
        if (percentage > 25) return '🧡';
        return '❤️';
    }

    getHPStatusText(percentage) {
        if (percentage > 75) return 'Healthy';
        if (percentage > 50) return 'Good';
        if (percentage > 25) return 'Injured';
        return 'Critical';
    }
}
