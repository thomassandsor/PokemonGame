/**
 * Example: Browse All Pokemon Modal Card
 * 
 * This is a specific implementation using the Pokemon Card Templates.
 * It shows how to create a modal card for browsing all Pokemon with live data.
 */

class BrowseAllPokemonModal {
    
    constructor() {
        this.modalId = 'browseAllPokemonModal';
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
        const cardContent = PokemonCardTemplates.getTradingCardTemplate('browseAllCard');
        
        // Create the modal using template but hide the external close button
        const modalHtml = PokemonCardTemplates.getModalTemplate(this.modalId, cardContent);
        
        // Add to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Hide the external close button
        const externalCloseBtn = document.querySelector(`#${this.modalId} [data-template="close-btn"]`);
        if (externalCloseBtn) {
            externalCloseBtn.style.display = 'none';
        }

        // Set up internal close button
        const internalCloseBtn = document.querySelector(`#${this.modalId} [data-template="internal-close-btn"]`);
        if (internalCloseBtn) {
            internalCloseBtn.onclick = () => this.close();
        }

        this.isInitialized = true;
    }

    /**
     * Show modal with Pokemon data
     * @param {Object} pokemonData - Base Pokemon data from JSON
     * @param {Object} options - Configuration options
     * @param {boolean} options.isCaught - Whether Pokemon is caught
     * @param {Object} options.caughtData - Dataverse data if caught
     * @param {Function} options.onCatch - Callback for catch action
     */
    show(pokemonData, options = {}) {
        this.initialize();
        
        const modal = document.getElementById(this.modalId);
        const cardContainer = document.getElementById('browseAllCard');
        
        if (!modal || !cardContainer) return;

        // Clear previous content
        const contentContainer = PokemonCardTemplates.getTemplateElement(cardContainer, 'content');
        const actionsContainer = PokemonCardTemplates.getTemplateElement(cardContainer, 'actions');
        if (contentContainer) contentContainer.innerHTML = '';
        if (actionsContainer) actionsContainer.innerHTML = '';

        // Populate basic info using template helpers
        PokemonCardTemplates.populateBasicInfo(cardContainer, pokemonData);

        if (options.isCaught && options.caughtData) {
            // CAUGHT POKEMON - Show Dataverse data
            this.populateCaughtPokemon(cardContainer, pokemonData, options.caughtData);
        } else {
            // UNCAUGHT POKEMON - Show generic JSON data
            this.populateUncaughtPokemon(cardContainer, pokemonData);
        }

        // Add action buttons based on caught status
        this.addActionButtons(cardContainer, options);

        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    /**
     * Populate data for uncaught Pokemon (from JSON)
     */
    populateUncaughtPokemon(cardContainer, pokemonData) {
        // Stats - Show base stats from JSON + Description in same style
        const stats = [
            { name: 'Attack', value: pokemonData.baseAttack || 50 },
            { name: 'Defense', value: pokemonData.baseDefence || pokemonData.baseDefense || 50 },
            { name: 'HP', value: pokemonData.baseHp || 50 }
        ];

        // Add description as a stat-style row if available
        if (pokemonData.description) {
            stats.push({ 
                name: 'Description', 
                value: pokemonData.description,
                isSpecial: true 
            });
        }

        PokemonCardTemplates.populateStats(cardContainer, stats);

        // No additional sections for uncaught Pokemon - keep it clean
    }

    /**
     * Populate data for caught Pokemon (from Dataverse)
     */
    populateCaughtPokemon(cardContainer, pokemonData, caughtData) {
        // HP visual indicators (matching cards-testing.html format)
        const getHPVisualIndicator = (hpPercentage) => {
            if (hpPercentage <= 30) return '🔴'; // Critical
            else if (hpPercentage <= 70) return '🟡'; // Damaged  
            else return '🟢'; // Healthy
        };

        const getHPStatusText = (hpPercentage) => {
            if (hpPercentage <= 30) return 'CRITICAL';
            else if (hpPercentage <= 70) return 'DAMAGED';
            else return 'HEALTHY';
        };

        // Calculate HP values
        const currentHP = caughtData.currentHP || caughtData.hp;
        const maxHP = caughtData.hp;
        const hpPercentage = (currentHP / maxHP) * 100;
        
        // Get visual indicators
        const statusEmoji = getHPVisualIndicator(hpPercentage);
        const statusText = getHPStatusText(hpPercentage);

        // Stats only - HP with visual format, Attack/Defense from Dataverse, Level added
        const stats = [
            { name: 'Attack', value: caughtData.attack || 50 },
            { name: 'Defense', value: caughtData.defense || 50 },
            { 
                name: `HP ${statusEmoji}`, 
                value: `${currentHP}/${maxHP} ${statusText}`,
                isSpecial: hpPercentage < 75
            },
            { name: 'Level', value: caughtData.level || 1 }
        ];
        
        PokemonCardTemplates.populateStats(cardContainer, stats);

        // No additional sections - just the clean stats
    }

    /**
     * Add action buttons based on caught status
     */
    addActionButtons(cardContainer, options) {
        // For uncaught Pokemon, don't add any buttons - keep it clean
        if (!options.isCaught) {
            return;
        }

        // CAUGHT POKEMON ACTIONS ONLY
        if (options.onRename) {
            const renameButton = PokemonCardTemplates.getActionButtonTemplate('Rename', 'primary', () => {
                options.onRename(options.caughtData);
            });
            PokemonCardTemplates.addActionButton(cardContainer, renameButton);
        }

        if (options.onRelease) {
            const releaseButton = PokemonCardTemplates.getActionButtonTemplate('Release', 'danger', () => {
                options.onRelease(options.caughtData);
            });
            PokemonCardTemplates.addActionButton(cardContainer, releaseButton);
        }

        if (options.onViewDetails) {
            const detailsButton = PokemonCardTemplates.getActionButtonTemplate('Full Details', 'primary', () => {
                options.onViewDetails(options.caughtData);
            });
            PokemonCardTemplates.addActionButton(cardContainer, detailsButton);
        }

        // Always add close button for caught Pokemon
        const closeButton = PokemonCardTemplates.getActionButtonTemplate('Close', 'secondary', () => this.close());
        PokemonCardTemplates.addActionButton(cardContainer, closeButton);
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
}

// Create global instance
window.BrowseAllPokemonModal = BrowseAllPokemonModal;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowseAllPokemonModal;
}
