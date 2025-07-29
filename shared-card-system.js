/**
 * Shared Pokemon Card System
 * Used by cards-testing.html and pokemon-unified.html to ensure consistency
 */

class SharedPokemonCardSystem {
    constructor() {
        this.pokemonCards = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        // Import the PokemonCardSystem if not already available
        if (typeof PokemonCardSystem === 'undefined') {
            await this.loadCardSystem();
        }
        
        this.pokemonCards = new PokemonCardSystem();
        this.initialized = true;
    }

    async loadCardSystem() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'components/pokemon-card-system.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Create an embedded card that matches the cards-testing implementation
     * @param {string} containerId - ID of the container element
     * @param {Object} pokemonData - Pokemon data object
     * @param {string} contextId - Context identifier (BROWSE_ALL, MY_COLLECTION, etc.)
     * @param {Object} options - Additional options and data
     */
    createEmbeddedCard(containerId, pokemonData, contextId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const context = PokemonCardSystem.CONTEXTS[contextId];
        if (!context) return;

        // Create the card HTML structure (same as cards-testing.html)
        const cardHTML = `
            <div class="pokemon-trading-card">
                <!-- Trading Card Header -->
                <div id="${containerId}_header" class="pokemon-trading-card-header normal">
                    <div class="pokemon-trading-card-name" id="${containerId}_name">Pokemon Name</div>
                </div>
                
                <!-- Pokemon Image with Overlays -->
                <div class="pokemon-trading-card-image-container">
                    <img id="${containerId}_image" class="pokemon-trading-card-image" src="" alt="Pokemon">
                    
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

        // Use the same populate function as cards-testing
        this.populateEmbeddedCard(containerId, pokemonData, context, options);
    }

    populateEmbeddedCard(containerId, pokemonData, context, options) {
        // Set basic Pokemon info
        const nameElement = document.getElementById(`${containerId}_name`);
        const imageElement = document.getElementById(`${containerId}_image`);

        nameElement.textContent = this.pokemonCards.formatPokemonName(pokemonData.name);
        imageElement.src = this.pokemonCards.getPokemonImageUrl(pokemonData);
        imageElement.alt = pokemonData.name;

        // Set type-based styling
        const headerElement = document.getElementById(`${containerId}_header`);
        const typesContainer = document.getElementById(`${containerId}_types`);
        
        const types = this.pokemonCards.getPokemonTypes(pokemonData);
        const primaryType = types[0] || 'normal';
        
        headerElement.className = `pokemon-trading-card-header ${primaryType.toLowerCase()}`;
        
        // Populate type badges with overlay styling
        typesContainer.innerHTML = '';
        types.forEach(type => {
            const badge = this.pokemonCards.createTypeBadge(type);
            badge.classList.add('overlay-badge');
            typesContainer.appendChild(badge);
        });

        // Populate ID overlay
        const idContainer = document.getElementById(`${containerId}_id`);
        idContainer.innerHTML = '';
        if (pokemonData.id || pokemonData.nationalDexNumber) {
            const idBadge = document.createElement('span');
            idBadge.className = 'overlay-badge id-badge';
            idBadge.textContent = `#${pokemonData.id || pokemonData.nationalDexNumber}`;
            idContainer.appendChild(idBadge);
        }

        // Populate stats (HP, Attack, Defense only)
        const statsContainer = document.getElementById(`${containerId}_stats`);
        statsContainer.innerHTML = '';
        const stats = this.pokemonCards.getPokemonStats(pokemonData, options);
        
        // Filter to only show HP, Attack, Defense
        const filteredStats = [
            stats.find(s => s.name === 'Attack') || { name: 'Attack', value: pokemonData.baseAttack || 50 },
            stats.find(s => s.name === 'Defense') || { name: 'Defense', value: pokemonData.baseDefence || 50 },
            { name: 'HP', value: options.caughtPokemon?.hp || pokemonData.baseHp || this.pokemonCards.calculateHP(pokemonData) }
        ];
        
        filteredStats.forEach(stat => {
            const statRow = document.createElement('div');
            statRow.className = 'pokemon-trading-card-stats-row';
            
            // Special handling for HP in "My Pokemon" context
            let statValue = stat.value;
            if (stat.name === 'HP' && containerId.includes('myPokemon') && options.caughtPokemon) {
                const currentHP = options.caughtPokemon.currentHP || options.caughtPokemon.hp;
                const maxHP = options.caughtPokemon.hp;
                const hpPercentage = (currentHP / maxHP) * 100;
                
                // Get visual indicators (need these functions from cards-testing)
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
                    <span class="pokemon-trading-card-stat-value">${statValue}</span>
                `;
            }
            
            statsContainer.appendChild(statRow);
        });

        // Build sections
        const dynamicContent = document.getElementById(`${containerId}_content`);
        dynamicContent.innerHTML = '';

        context.sections.forEach(sectionType => {
            if (sectionType === 'types' || sectionType === 'stats') return; // Already handled above
            
            const section = this.createEmbeddedSection(sectionType, pokemonData, options, containerId);
            if (section) {
                dynamicContent.appendChild(section);
            }
        });

        // Build action buttons
        const actionsContainer = document.getElementById(`${containerId}_actions`);
        actionsContainer.innerHTML = '';
        
        context.actions.forEach(actionType => {
            const button = this.createEmbeddedActionButton(actionType, options, containerId);
            if (button) {
                actionsContainer.appendChild(button);
            }
        });
    }

    // HP status functions (copied from cards-testing)
    getHPVisualIndicator(hpPercentage) {
        if (hpPercentage <= 30) {
            return '🔴'; // Red circle emoji for critical
        } else if (hpPercentage <= 70) {
            return '🟡'; // Yellow circle emoji for moderate
        } else {
            return '🟢'; // Green circle emoji for healthy
        }
    }

    getHPStatusText(hpPercentage) {
        if (hpPercentage <= 30) return 'CRITICAL';
        else if (hpPercentage <= 70) return 'DAMAGED';
        else return 'HEALTHY';
    }

    // Section creators (copied from cards-testing)
    createEmbeddedSection(sectionType, pokemonData, options, containerId) {
        switch(sectionType) {
            case 'info':
                return this.createEmbeddedInfoSection(pokemonData);
            case 'caught_status':
                return this.createEmbeddedCaughtStatusSection(pokemonData, options);
            case 'personal_info':
                return this.createEmbeddedPersonalInfoSection(pokemonData, options);
            case 'catch_details':
                return this.createEmbeddedCatchDetailsSection(pokemonData, options);
            case 'encounter_info':
                return this.createEmbeddedEncounterInfoSection(pokemonData, options);
            case 'battle_stats':
                return this.createEmbeddedBattleStatsSection(pokemonData, options);
            case 'moves':
                return this.createEmbeddedMovesSection(pokemonData, options, containerId);
            default:
                return null;
        }
    }

    createEmbeddedInfoSection(pokemonData) {
        const section = document.createElement('div');
        section.className = 'pokemon-card-section-content';
        section.innerHTML = `
            <div class="pokemon-info-box description">
                <div class="info-content">
                    "${pokemonData.description || 'A mysterious Pokemon.'}"
                </div>
            </div>
        `;
        return section;
    }

    createEmbeddedCaughtStatusSection(pokemonData, options) {
        const isCaught = options.caughtPokemon || false;
        const section = document.createElement('div');
        section.className = 'pokemon-card-section-content';
        section.innerHTML = `
            <div class="pokemon-info-box status ${isCaught ? 'caught' : 'not-caught'}">
                <div class="info-content">
                    ${isCaught ? '✅ CAUGHT!' : '❌ NOT CAUGHT'}
                </div>
            </div>
        `;
        return section;
    }

    createEmbeddedPersonalInfoSection(pokemonData, options) {
        const caughtPokemon = options.caughtPokemon || {};
        const section = document.createElement('div');
        section.className = 'pokemon-card-section-content';
        section.innerHTML = `
            <div class="pokemon-info-box personal">
                <div class="info-content">
                    <strong>Level ${caughtPokemon.level || 1}</strong> | 
                    <strong>EXP:</strong> ${caughtPokemon.experience || 0}<br>
                    <strong>Nickname:</strong> ${caughtPokemon.nickname || 'None'}
                    ${caughtPokemon.isShiny ? '<br><span style="color: gold;">✨ SHINY ✨</span>' : ''}
                </div>
            </div>
        `;
        return section;
    }

    createEmbeddedCatchDetailsSection(pokemonData, options) {
        const caughtPokemon = options.caughtPokemon || {};
        const section = document.createElement('div');
        section.className = 'pokemon-card-section-content';
        section.innerHTML = `
            <div class="pokemon-info-box personal">
                <div class="info-content">
                    <strong>Caught:</strong> ${caughtPokemon.dateCaught || 'Unknown date'}<br>
                    <strong>Wins:</strong> ${caughtPokemon.wins || 0} | <strong>Losses:</strong> ${caughtPokemon.losses || 0}
                </div>
            </div>
        `;
        return section;
    }

    createEmbeddedEncounterInfoSection(pokemonData, options) {
        const section = document.createElement('div');
        section.className = 'pokemon-card-section-content';
        section.innerHTML = `
            <div class="pokemon-info-box description">
                <div class="info-content">
                    A wild ${pokemonData.name} appeared!<br>
                    <strong>Pokeballs remaining:</strong> ${options.pokeballCount || 0}
                </div>
            </div>
        `;
        return section;
    }

    createEmbeddedBattleStatsSection(pokemonData, options) {
        const battleStats = options.battleStats || {};
        const section = document.createElement('div');
        section.className = 'pokemon-card-section-content';
        section.innerHTML = `
            <div class="pokemon-info-box personal">
                <div class="info-content">
                    <strong>Battle HP:</strong> ${battleStats.currentHP || 0}/${battleStats.maxHP || 0}<br>
                    <strong>Status:</strong> ${battleStats.statusEffect || 'Normal'}
                </div>
            </div>
        `;
        return section;
    }

    createEmbeddedMovesSection(pokemonData, options, containerId) {
        const moves = options.moves || ['Tackle', 'Growl'];
        const section = document.createElement('div');
        section.className = 'pokemon-card-section-content';
        
        const movesHTML = moves.map(move => 
            `<button class="pokemon-button-retro primary" onclick="console.log('${move} selected')">${move}</button>`
        ).join('');
        
        section.innerHTML = `
            <div class="pokemon-info-box personal">
                <div class="info-label">Available Moves</div>
                <div class="info-content" style="display: flex; flex-wrap: wrap; gap: var(--space-xs);">
                    ${movesHTML}
                </div>
            </div>
        `;
        return section;
    }

    createEmbeddedActionButton(actionType, options, containerId) {
        const button = document.createElement('button');
        button.className = 'pokemon-button-retro';
        
        switch(actionType) {
            case 'close':
                button.textContent = 'CLOSE';
                button.className += ' secondary';
                button.onclick = () => {
                    if (options.callbacks?.close) {
                        options.callbacks.close();
                    } else {
                        console.log(`${containerId}: Close action`);
                    }
                };
                break;
            case 'catch':
                button.textContent = 'CATCH!';
                button.className += ' success';
                button.onclick = () => {
                    if (options.callbacks?.catch) {
                        options.callbacks.catch();
                    } else {
                        console.log(`${containerId}: Catch action`);
                    }
                };
                break;
            case 'run_away':
                button.textContent = 'RUN AWAY';
                button.className += ' secondary';
                button.onclick = () => {
                    if (options.callbacks?.runAway) {
                        options.callbacks.runAway();
                    } else {
                        console.log(`${containerId}: Run away action`);
                    }
                };
                break;
            case 'rename':
                button.textContent = 'RENAME';
                button.className += ' primary';
                button.onclick = () => {
                    if (options.callbacks?.rename) {
                        options.callbacks.rename();
                    } else {
                        console.log(`${containerId}: Rename action`);
                    }
                };
                break;
            case 'release':
                button.textContent = 'RELEASE';
                button.className += ' danger';
                button.onclick = () => {
                    if (options.callbacks?.release) {
                        options.callbacks.release();
                    } else {
                        console.log(`${containerId}: Release action`);
                    }
                };
                break;
            default:
                return null;
        }
        
        return button;
    }

    /**
     * Check if a Pokemon is caught by the current user
     * @param {Object} pokemonData - Pokemon data object
     * @returns {Promise<Object|null>} - Caught Pokemon data or null if not caught
     */
    async checkIfCaught(pokemonData) {
        try {
            // Check if PokemonService is available
            if (typeof PokemonService === 'undefined') {
                console.warn('PokemonService not available for checking caught Pokemon');
                return null;
            }

            // Get user's Pokemon collection
            const userPokemon = await PokemonService.getUserPokemon();
            if (!userPokemon || userPokemon.length === 0) {
                return null;
            }

            // Find matching Pokemon by ID/nationalDexNumber
            const caughtPokemon = userPokemon.find(p => 
                p.nationalDexNumber === pokemonData.id || 
                p.id === pokemonData.id ||
                (p.name && p.name.toLowerCase() === pokemonData.name.toLowerCase())
            );

            if (caughtPokemon) {
                // Add some default values if missing
                return {
                    ...caughtPokemon,
                    level: caughtPokemon.level || 1,
                    experience: caughtPokemon.experience || 0,
                    currentHP: caughtPokemon.currentHP || caughtPokemon.hp || pokemonData.baseHp || 50,
                    hp: caughtPokemon.hp || pokemonData.baseHp || 50,
                    wins: caughtPokemon.wins || 0,
                    losses: caughtPokemon.losses || 0,
                    dateCaught: caughtPokemon.dateCaught || 'Unknown date',
                    nickname: caughtPokemon.nickname || null,
                    isShiny: caughtPokemon.isShiny || false
                };
            }

            return null;
        } catch (error) {
            console.error('Error checking if Pokemon is caught:', error);
            return null;
        }
    }

    /**
     * Create a standalone card element that can be appended to any container
     * @param {Object} pokemonData - Pokemon data object
     * @param {string} contextId - Context identifier (BROWSE_ALL, MY_COLLECTION, etc.)
     * @param {Object} options - Additional options and data
     * @returns {HTMLElement} - The created card element
     */
    createCard(pokemonData, contextId, options = {}) {
        const context = PokemonCardSystem.CONTEXTS[contextId];
        if (!context) {
            console.error(`Unknown context: ${contextId}`);
            return null;
        }

        // Create a unique container ID for this card
        const uniqueId = `card_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create a temporary container div
        const tempContainer = document.createElement('div');
        tempContainer.id = uniqueId;
        
        // Add it to body temporarily (required for card system to work)
        document.body.appendChild(tempContainer);
        
        // Create the embedded card in the temporary container
        this.createEmbeddedCard(uniqueId, pokemonData, contextId, options);
        
        // Get the card element
        const cardElement = tempContainer.querySelector('.pokemon-trading-card');
        
        // Remove the temporary container from body
        document.body.removeChild(tempContainer);
        
        return cardElement;
    }
}

// Create a global instance
window.sharedCardSystem = new SharedPokemonCardSystem();
