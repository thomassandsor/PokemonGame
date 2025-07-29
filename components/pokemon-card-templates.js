/**
 * Pokemon Card Template System
 * 
 * This system provides reusable UI templates for building Pokemon cards.
 * Templates define the visual structure and styling, while implementations
 * handle the specific data binding and behavior.
 * 
 * Templates included:
 * - Trading Card Template (the beautiful design from cards-testing)
 * - Info Box Template
 * - Stats Box Template
 * - Action Button Template
 * - Modal Container Template
 */

class PokemonCardTemplates {
    
    /**
     * Main Trading Card Template
     * Returns the complete HTML structure for a Pokemon trading card
     */
    static getTradingCardTemplate(containerId) {
        return `
            <div class="pokemon-trading-card" id="${containerId}">
                <!-- Header Section -->
                <div class="pokemon-trading-card-header normal" data-template="header">
                    <div class="pokemon-trading-card-name" data-template="name">Pokemon Name</div>
                    <!-- Internal close button -->
                    <button class="pokemon-trading-card-close-btn" data-template="internal-close-btn">&times;</button>
                </div>
                
                <!-- Image Section -->
                <div class="pokemon-trading-card-image-container" data-template="image-container">
                    <img class="pokemon-trading-card-image" 
                         data-template="image"
                         src="" 
                         alt="Pokemon" 
                         onerror="this.src='/assets/pokeball.svg'">
                    
                    <!-- Type badges overlaid on image -->
                    <div class="pokemon-trading-card-types-overlay" data-template="types">
                        <!-- Type badges populated dynamically -->
                    </div>
                    
                    <!-- ID overlaid on image -->
                    <div class="pokemon-trading-card-id-overlay" data-template="id">
                        <!-- ID populated dynamically -->
                    </div>
                </div>
                
                <!-- Stats Section -->
                <div class="pokemon-trading-card-stats" data-template="stats">
                    <!-- Stats populated dynamically -->
                </div>
                
                <!-- Content Sections -->
                <div class="pokemon-trading-card-content" data-template="content">
                    <!-- Dynamic content goes here -->
                </div>
                
                <!-- Action Buttons Section -->
                <div class="pokemon-trading-card-actions" data-template="actions">
                    <!-- Action buttons populated dynamically -->
                </div>
            </div>
        `;
    }

    /**
     * Modal Container Template
     * Returns the modal wrapper for cards
     */
    static getModalTemplate(modalId, cardContent) {
        return `
            <div id="${modalId}" class="pokemon-card-modal hidden">
                <button class="pokemon-card-modal-close" data-template="close-btn">&times;</button>
                <div class="pokemon-card-modal-content">
                    ${cardContent}
                </div>
            </div>
        `;
    }

    /**
     * Info Box Template
     * Returns a standardized info box for displaying key-value pairs
     */
    static getInfoBoxTemplate(title, items) {
        const itemsHtml = items.map(item => `
            <div class="pokemon-trading-card-info-row">
                <span class="pokemon-trading-card-info-label">${item.label}:</span>
                <span class="pokemon-trading-card-info-value ${item.special ? 'special' : ''}">${item.value}</span>
            </div>
        `).join('');
        
        return `
            <div class="pokemon-trading-card-section">
                ${title ? `<h4 class="pokemon-trading-card-section-title">${title}</h4>` : ''}
                ${itemsHtml}
            </div>
        `;
    }

    /**
     * Description Box Template
     * Returns a standardized description box
     */
    static getDescriptionBoxTemplate(title, description) {
        return `
            <div class="pokemon-trading-card-section">
                ${title ? `<h4 class="pokemon-trading-card-section-title">${title}</h4>` : ''}
                <div class="pokemon-trading-card-description">
                    <em>${description}</em>
                </div>
            </div>
        `;
    }

    /**
     * Stats Row Template
     * Returns a single stats row
     */
    static getStatsRowTemplate(name, value, isSpecial = false) {
        return `
            <div class="pokemon-trading-card-stats-row">
                <span class="pokemon-trading-card-stat-name">${name}</span>
                <span class="pokemon-trading-card-stat-value ${isSpecial ? 'special' : ''}">${value}</span>
            </div>
        `;
    }

    /**
     * Type Badge Template
     * Returns a type badge element
     */
    static getTypeBadgeTemplate(type) {
        const badge = document.createElement('span');
        badge.className = `pokemon-type-badge pokemon-type-${type.toLowerCase()} overlay-badge`;
        badge.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        return badge;
    }

    /**
     * ID Badge Template
     * Returns an ID badge element
     */
    static getIdBadgeTemplate(id) {
        const badge = document.createElement('span');
        badge.className = 'overlay-badge id-badge';
        badge.textContent = `#${id.toString().padStart(3, '0')}`;
        return badge;
    }

    /**
     * Action Button Template
     * Returns a standardized action button
     */
    static getActionButtonTemplate(text, type = 'primary', onClick = null) {
        const button = document.createElement('button');
        button.className = `pokemon-btn pokemon-btn-${type} pokemon-trading-card-action-btn`;
        button.textContent = text;
        if (onClick) {
            button.onclick = onClick;
        }
        return button;
    }

    /**
     * Template Helper: Get element by template attribute
     */
    static getTemplateElement(container, templateName) {
        return container.querySelector(`[data-template="${templateName}"]`);
    }

    /**
     * Template Helper: Set type-based header styling
     */
    static setHeaderType(container, type) {
        const header = this.getTemplateElement(container, 'header');
        if (header) {
            header.className = `pokemon-trading-card-header ${type.toLowerCase()}`;
        }
    }

    /**
     * Template Helper: Populate basic card info
     */
    static populateBasicInfo(container, pokemonData) {
        // Set name
        const nameElement = this.getTemplateElement(container, 'name');
        if (nameElement) {
            nameElement.textContent = this.formatPokemonName(pokemonData.name);
        }

        // Set image
        const imageElement = this.getTemplateElement(container, 'image');
        if (imageElement) {
            imageElement.src = this.getPokemonImageUrl(pokemonData);
            imageElement.alt = pokemonData.name;
        }

        // Set ID
        const idContainer = this.getTemplateElement(container, 'id');
        if (idContainer && pokemonData.id) {
            idContainer.innerHTML = '';
            idContainer.appendChild(this.getIdBadgeTemplate(pokemonData.id));
        }

        // Set types
        const typesContainer = this.getTemplateElement(container, 'types');
        if (typesContainer) {
            typesContainer.innerHTML = '';
            const types = this.getPokemonTypes(pokemonData);
            types.forEach(type => {
                typesContainer.appendChild(this.getTypeBadgeTemplate(type));
            });
            
            // Set header type based on primary type
            this.setHeaderType(container, types[0] || 'normal');
        }
    }

    /**
     * Template Helper: Populate stats section
     */
    static populateStats(container, stats) {
        const statsContainer = this.getTemplateElement(container, 'stats');
        if (statsContainer) {
            statsContainer.innerHTML = stats.map(stat => {
                // Special handling for description (longer text)
                if (stat.name === 'Description') {
                    return `
                        <div class="pokemon-trading-card-stats-row description-row">
                            <span class="pokemon-trading-card-stat-name">${stat.name}</span>
                            <div class="pokemon-trading-card-stat-value description-value ${stat.isSpecial ? 'special' : ''}">${stat.value}</div>
                        </div>
                    `;
                } else {
                    return this.getStatsRowTemplate(stat.name, stat.value, stat.isSpecial);
                }
            }).join('');
        }
    }

    /**
     * Template Helper: Add content section
     */
    static addContentSection(container, sectionHtml) {
        const contentContainer = this.getTemplateElement(container, 'content');
        if (contentContainer) {
            contentContainer.insertAdjacentHTML('beforeend', sectionHtml);
        }
    }

    /**
     * Template Helper: Add action button
     */
    static addActionButton(container, button) {
        const actionsContainer = this.getTemplateElement(container, 'actions');
        if (actionsContainer) {
            actionsContainer.appendChild(button);
        }
    }

    /**
     * Utility Methods
     */
    static formatPokemonName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    static getPokemonImageUrl(pokemonData) {
        if (pokemonData.sprites?.official_artwork) {
            return pokemonData.sprites.official_artwork;
        }
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.id}.png`;
    }

    static getPokemonTypes(pokemonData) {
        if (pokemonData.types && Array.isArray(pokemonData.types)) {
            return pokemonData.types.map(type => {
                if (typeof type === 'string') return type;
                return type.type?.name || type.name || 'normal';
            });
        }
        return ['normal'];
    }

    static formatHeight(height) {
        return height ? `${(height / 10).toFixed(1)}m` : 'Unknown';
    }

    static formatWeight(weight) {
        return weight ? `${(weight / 10).toFixed(1)}kg` : 'Unknown';
    }
}

// Export for global use
window.PokemonCardTemplates = PokemonCardTemplates;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PokemonCardTemplates;
}
