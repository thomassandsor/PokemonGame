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

        // Add pokeball indicator for caught Pokemon
        if (options.isCaught) {
            this.addPokeballIndicator(cardContainer);
        }

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

        // Calculate HP values from Dataverse
        const currentHP = caughtData.currentHP || caughtData.hp || 50;
        const maxHP = caughtData.maxHP || caughtData.hp || 50;
        const hpPercentage = (currentHP / maxHP) * 100;
        
        // Get visual indicators
        const statusEmoji = getHPVisualIndicator(hpPercentage);
        const statusText = getHPStatusText(hpPercentage);

        // Debug logging for Dataverse data
        console.log('CAUGHT-MODAL: Dataverse data:', caughtData);
        console.log('CAUGHT-MODAL: HP data - current:', currentHP, 'max:', maxHP, 'percentage:', hpPercentage);
        console.log('CAUGHT-MODAL: Defense data:', caughtData.defense, caughtData.defence);
        console.log('CAUGHT-MODAL: Attack data:', caughtData.attack);

        // Stats reordered - Level first, then Attack/Defense, then HP
        const stats = [
            { name: 'Level', value: caughtData.level || 1 },
            { name: 'Attack', value: caughtData.attack || 50 },
            { name: 'Defense', value: caughtData.defense || caughtData.defence || 50 },
            { 
                name: `HP ${statusEmoji}`, 
                value: `${currentHP}/${maxHP} ${statusText}`,
                isSpecial: hpPercentage < 75
            }
        ];
        
        PokemonCardTemplates.populateStats(cardContainer, stats);

        // No additional sections - just the clean stats
    }

    /**
     * Add pokeball SVG indicator for caught Pokemon
     */
    addPokeballIndicator(cardContainer) {
        // Find the Pokemon name element in the title area
        const nameElement = cardContainer.querySelector('.pokemon-trading-card-name');
        if (!nameElement) {
            console.warn('Could not find name element for pokeball indicator');
            return;
        }

        // Create pokeball SVG indicator
        const pokeballIndicator = document.createElement('div');
        pokeballIndicator.style.cssText = `
            position: absolute;
            left: -35px;
            top: 50%;
            transform: translateY(-50%);
            width: 24px;
            height: 24px;
            z-index: 10;
        `;
        
        // Use the pokeball SVG from assets
        pokeballIndicator.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="#ffffff" stroke="#333" stroke-width="2"/>
                <path d="M2 12h20" stroke="#333" stroke-width="2"/>
                <circle cx="12" cy="12" r="8" fill="none" stroke="#333" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="#333"/>
                <circle cx="12" cy="8" r="1" fill="#ff0000"/>
                <path d="M1 12a11 11 0 0 0 22 0" fill="#ff0000"/>
            </svg>
        `;
        
        // Make name element relative and add indicator
        nameElement.style.position = 'relative';
        nameElement.appendChild(pokeballIndicator);
    }

    /**
     * Add action buttons based on caught status
     */
    addActionButtons(cardContainer, options) {
        // No buttons for any Pokemon - keep all modals clean
        return;
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
