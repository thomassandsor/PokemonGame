/**
 * Pokemon Encounter Modal Card
 * 
 * This modal shows wild Pokemon encounters during catching.
 * It's designed to look very similar to the uncaught Pokemon cards
 * in BrowseAllPokemonModal, but with encounter-specific actions.
 */

class PokemonEncounterModal {
    
    constructor() {
        this.modalId = 'pokemonEncounterModal';
        this.isInitialized = false;
    }

    /**
     * Initialize the modal if it doesn't exist
     */
    initialize() {
        if (this.isInitialized || document.getElementById(this.modalId)) {
            return;
        }

        // Create the trading card using template
        const cardContent = PokemonCardTemplates.getTradingCardTemplate('pokemonEncounterCard');
        
        // Create the modal using template but hide the external close button
        const modalHtml = PokemonCardTemplates.getModalTemplate(this.modalId, cardContent);
        
        // Add to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Hide the external close button
        const externalCloseBtn = document.querySelector(`#${this.modalId} [data-template="close-btn"]`);
        if (externalCloseBtn) {
            externalCloseBtn.style.display = 'none';
        }

        // Set up internal close button (acts as "Run Away")
        const internalCloseBtn = document.querySelector(`#${this.modalId} [data-template="internal-close-btn"]`);
        if (internalCloseBtn) {
            internalCloseBtn.onclick = () => this.runAway();
        }

        this.isInitialized = true;
    }

    /**
     * Show modal with wild Pokemon encounter
     * @param {Object} pokemonData - Base Pokemon data from JSON or PokeAPI
     * @param {Object} options - Configuration options
     * @param {number} options.pokeballCount - User's pokeball count
     * @param {Function} options.onCatch - Callback for catch action
     * @param {Function} options.onRunAway - Callback for run away action
     * @param {Function} options.onMinigame - Callback for minigame action
     */
    show(pokemonData, options = {}) {
        this.initialize();
        
        const modal = document.getElementById(this.modalId);
        const cardContainer = document.getElementById('pokemonEncounterCard');
        
        if (!modal || !cardContainer) return;

        // Store callbacks for later use
        this.onCatch = options.onCatch;
        this.onRunAway = options.onRunAway;
        this.onMinigame = options.onMinigame;
        this.pokeballCount = options.pokeballCount || 0;

        // Clear previous content
        const contentContainer = PokemonCardTemplates.getTemplateElement(cardContainer, 'content');
        const actionsContainer = PokemonCardTemplates.getTemplateElement(cardContainer, 'actions');
        if (contentContainer) contentContainer.innerHTML = '';
        if (actionsContainer) actionsContainer.innerHTML = '';

        // Populate basic info using template helpers (name, image, types)
        PokemonCardTemplates.populateBasicInfo(cardContainer, pokemonData);

        // Populate encounter Pokemon stats (same as uncaught)
        this.populateEncounterPokemon(cardContainer, pokemonData);

        // Always add pokeball count display
        this.addPokeballCountDisplay(cardContainer);

        // Add encounter-specific action buttons
        this.addEncounterActions(cardContainer);

        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    /**
     * Populate data for encounter Pokemon (exactly like uncaught Pokemon)
     */
    populateEncounterPokemon(cardContainer, pokemonData) {
        // Get real stats from JSON data structure - no fallbacks
        const attackStat = pokemonData.stats?.find(s => s.name === 'attack');
        const defenseStat = pokemonData.stats?.find(s => s.name === 'defense');
        const hpStat = pokemonData.stats?.find(s => s.name === 'hp');

        // Only use real data - fail fast if not available
        const stats = [];
        
        if (attackStat) {
            stats.push({ name: 'Attack', value: attackStat.base_stat });
        }
        
        if (defenseStat) {
            stats.push({ name: 'Defense', value: defenseStat.base_stat });
        }
        
        if (hpStat) {
            stats.push({ name: 'HP', value: hpStat.base_stat });
        }

        // Add description as a stat-style row if available
        if (pokemonData.description) {
            stats.push({ 
                name: 'Description', 
                value: pokemonData.description,
                isSpecial: true 
            });
        }

        PokemonCardTemplates.populateStats(cardContainer, stats);
    }

    /**
     * Add pokeball count display section
     */
    addPokeballCountDisplay(cardContainer) {
        let pokeballSection;
        
        if (this.pokeballCount === 0) {
            // Show colorful "no more pokeballs" warning
            pokeballSection = `
                <div class="pokemon-trading-card-section">
                    <div class="pokemon-alert-retro" style="margin: var(--space-md) 0; text-align: center;">
                        <div style="font-size: var(--font-size-lg); margin-bottom: var(--space-xs); font-weight: bold;">NO MORE POKEBALLS!</div>
                        <div style="font-size: var(--font-size-sm);">Complete minigame to catch POKEMON</div>
                    </div>
                </div>
            `;
        } else {
            // Show colorful pokeball count
            pokeballSection = `
                <div class="pokemon-trading-card-section">
                    <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: var(--space-md); border-radius: 8px; text-align: center; margin: var(--space-md) 0;">
                        <div style="font-size: var(--font-size-lg); font-weight: bold;">POKEBALLS REMAINING</div>
                        <div style="font-size: var(--font-size-xl); font-weight: bold; margin-top: var(--space-xs);">${this.pokeballCount}</div>
                    </div>
                </div>
            `;
        }
        
        PokemonCardTemplates.addContentSection(cardContainer, pokeballSection);
    }

    /**
     * Add encounter-specific action buttons
     */
    addEncounterActions(cardContainer) {
        const actionsContainer = PokemonCardTemplates.getTemplateElement(cardContainer, 'actions');
        if (!actionsContainer) return;

        // Clear any existing actions
        actionsContainer.innerHTML = '';

        // Create catch button container for overlay
        const catchButtonContainer = document.createElement('div');
        catchButtonContainer.style.position = 'relative';
        catchButtonContainer.style.display = 'inline-block';

        // Always show both CATCH and MINIGAME buttons
        const catchButton = document.createElement('button');
        catchButton.className = 'pokemon-button-retro success';
        catchButton.textContent = 'CATCH!';
        
        const minigameButton = document.createElement('button');
        minigameButton.className = 'pokemon-button-retro success';
        minigameButton.textContent = 'MINIGAME';

        if (this.pokeballCount > 0) {
            // User has pokeballs - both buttons are active
            catchButton.onclick = () => this.catch();
            minigameButton.onclick = () => this.startMinigame();
        } else {
            // No pokeballs - only minigame is active, catch is disabled with red X
            catchButton.disabled = true;
            catchButton.className = 'pokemon-button-retro disabled';
            catchButton.onclick = null;
            
            // Add red X overlay
            const redX = document.createElement('div');
            redX.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 0, 0, 0.8);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2em;
                font-weight: bold;
                border-radius: inherit;
                pointer-events: none;
                z-index: 1;
            `;
            redX.textContent = '✕';
            catchButtonContainer.appendChild(redX);
            
            minigameButton.onclick = () => this.startMinigame();
        }

        catchButtonContainer.appendChild(catchButton);
        actionsContainer.appendChild(catchButtonContainer);
        actionsContainer.appendChild(minigameButton);
    }

    /**
     * Handle catch action
     */
    catch() {
        if (this.onCatch) {
            this.onCatch();
        }
        this.close();
    }

    /**
     * Handle run away action
     */
    runAway() {
        if (this.onRunAway) {
            this.onRunAway();
        }
        this.close();
    }

    /**
     * Handle minigame action
     */
    startMinigame() {
        if (this.onMinigame) {
            this.onMinigame();
        }
        // Don't close modal - let the minigame system handle it
    }

    /**
     * Update pokeball count (called after minigame completion)
     */
    updatePokeballCount(newCount) {
        this.pokeballCount = newCount;
        
        // Update the display
        const cardContainer = document.getElementById('pokemonEncounterCard');
        if (cardContainer) {
            // Clear and recreate the pokeball display
            const contentContainer = PokemonCardTemplates.getTemplateElement(cardContainer, 'content');
            if (contentContainer) {
                // Remove the old pokeball display section
                const oldPokeballSection = contentContainer.querySelector('.pokemon-trading-card-section');
                if (oldPokeballSection) {
                    oldPokeballSection.remove();
                }
                
                // Add the updated pokeball display
                this.addPokeballCountDisplay(cardContainer);
            }
            
            // Update action buttons based on new count
            this.addEncounterActions(cardContainer);
        }
    }

    /**
     * Close modal
     */
    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    /**
     * Check if modal is currently open
     */
    isOpen() {
        const modal = document.getElementById(this.modalId);
        return modal && !modal.classList.contains('hidden');
    }
}

// Create global instance
window.PokemonEncounterModal = PokemonEncounterModal;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PokemonEncounterModal;
}
