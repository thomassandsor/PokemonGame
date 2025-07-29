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

        // Add caught indicator for caught Pokemon
        if (options.isCaught) {
            this.addCaughtIndicator(cardContainer);
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
        console.log('CAUGHT-MODAL: HP data - current:', currentHP, 'max:', maxHP);
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
     * Add green checkmark indicator for caught Pokemon
     */
    addCaughtIndicator(cardContainer) {
        // Find the Pokemon image container
        const imageContainer = cardContainer.querySelector('.pokemon-trading-card-image-container');
        if (!imageContainer) {
            console.warn('Could not find image container for caught indicator');
            return;
        }

        // Add caught indicator in upper right corner of the image
        const caughtIndicator = document.createElement('div');
        caughtIndicator.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: #10b981;
            color: white;
            border-radius: 50%;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            z-index: 10;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            border: 2px solid white;
        `;
        caughtIndicator.innerHTML = '✓';
        
        // Make image container relative and add indicator
        imageContainer.style.position = 'relative';
        imageContainer.appendChild(caughtIndicator);
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
