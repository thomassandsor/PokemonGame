// Enhanced Pokemon Data Builder
// This script fetches missing information from PokeAPI and enhances the existing JSON file

const fs = require('fs');
const path = require('path');

class PokemonDataEnhancer {
    constructor() {
        this.jsonPath = path.join(__dirname, '..', 'src', 'data', 'pokemon.json');
        this.outputPath = path.join(__dirname, '..', 'src', 'data', 'pokemon-enhanced.json');
        this.existingData = [];
        this.enhancedData = [];
        this.delay = 100; // Delay between API calls to be respectful
    }

    async loadExistingData() {
        try {
            const data = fs.readFileSync(this.jsonPath, 'utf8');
            this.existingData = JSON.parse(data);
            console.log(`Loaded ${this.existingData.length} existing Pokemon`);
        } catch (error) {
            console.error('Error loading existing data:', error);
            this.existingData = [];
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchPokemonSpecies(id) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`Failed to fetch species data for Pokemon ${id}:`, error.message);
            return null;
        }
    }

    async fetchPokemonData(id) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`Failed to fetch Pokemon data for Pokemon ${id}:`, error.message);
            return null;
        }
    }

    getEnglishFlavorText(speciesData) {
        if (!speciesData || !speciesData.flavor_text_entries) {
            return null;
        }

        // Find the first English flavor text entry
        const englishEntry = speciesData.flavor_text_entries.find(entry => 
            entry.language.name === 'en'
        );

        if (englishEntry) {
            // Clean up the flavor text (remove form feeds and extra spaces)
            return englishEntry.flavor_text
                .replace(/\f/g, ' ')
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        return null;
    }

    getGeneration(speciesData) {
        if (!speciesData || !speciesData.generation) {
            return 1; // Default to generation 1
        }

        const genName = speciesData.generation.name;
        const genNumber = genName.replace('generation-', '');
        
        // Convert roman numerals to numbers
        const romanToNumber = {
            'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8
        };

        return romanToNumber[genNumber] || parseInt(genNumber) || 1;
    }

    async enhancePokemon(pokemon) {
        console.log(`Enhancing ${pokemon.name} (${pokemon.id})...`);

        // If this Pokemon already has description and generation, skip API calls
        if (pokemon.description && pokemon.generation && pokemon.hasOwnProperty('legendary')) {
            console.log(`${pokemon.name} already has complete data, skipping...`);
            return pokemon;
        }

        // Fetch species data for description, generation, and legendary status
        const speciesData = await this.fetchPokemonSpecies(pokemon.id);
        await this.sleep(this.delay);

        const enhanced = { ...pokemon };

        if (speciesData) {
            // Add description if missing
            if (!enhanced.description) {
                enhanced.description = this.getEnglishFlavorText(speciesData) || 
                    `${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} is a Pokemon.`;
            }

            // Add generation if missing
            if (!enhanced.generation) {
                enhanced.generation = this.getGeneration(speciesData);
            }

            // Add legendary status if missing
            if (!enhanced.hasOwnProperty('legendary')) {
                enhanced.legendary = speciesData.is_legendary || false;
            }

            // Add mythical status if missing
            if (!enhanced.hasOwnProperty('mythical')) {
                enhanced.mythical = speciesData.is_mythical || false;
            }
        } else {
            // Fallback values if API call failed
            if (!enhanced.description) {
                enhanced.description = `${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} is a Pokemon.`;
            }
            if (!enhanced.generation) {
                enhanced.generation = pokemon.id <= 151 ? 1 : 
                                      pokemon.id <= 251 ? 2 : 
                                      pokemon.id <= 386 ? 3 : 
                                      pokemon.id <= 493 ? 4 : 
                                      pokemon.id <= 649 ? 5 : 6;
            }
            if (!enhanced.hasOwnProperty('legendary')) {
                enhanced.legendary = false;
            }
            if (!enhanced.hasOwnProperty('mythical')) {
                enhanced.mythical = false;
            }
        }

        return enhanced;
    }

    async fillMissingPokemon() {
        const existingIds = new Set(this.existingData.map(p => p.id));
        const missingIds = [];

        // Check for missing Pokemon (1-151 for Gen 1, but can be extended)
        for (let i = 1; i <= 151; i++) {
            if (!existingIds.has(i)) {
                missingIds.push(i);
            }
        }

        console.log(`Found ${missingIds.length} missing Pokemon:`, missingIds);

        for (const id of missingIds) {
            console.log(`Fetching missing Pokemon ${id}...`);

            const pokemonData = await this.fetchPokemonData(id);
            const speciesData = await this.fetchPokemonSpecies(id);
            
            await this.sleep(this.delay * 2); // Longer delay for new Pokemon

            if (pokemonData) {
                const newPokemon = {
                    id: pokemonData.id,
                    name: pokemonData.name,
                    height: pokemonData.height,
                    weight: pokemonData.weight,
                    sprites: {
                        front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonData.id}.png`,
                        front_shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonData.id}.png`,
                        official_artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.id}.png`
                    },
                    types: pokemonData.types.map(type => type.type.name),
                    stats: pokemonData.stats.map(stat => ({
                        name: stat.stat.name,
                        base_stat: stat.base_stat
                    })),
                    abilities: pokemonData.abilities.map(ability => ability.ability.name),
                    description: speciesData ? this.getEnglishFlavorText(speciesData) : `${pokemonData.name} is a Pokemon.`,
                    generation: speciesData ? this.getGeneration(speciesData) : 1,
                    legendary: speciesData ? speciesData.is_legendary : false,
                    mythical: speciesData ? speciesData.is_mythical : false
                };

                this.existingData.push(newPokemon);
                console.log(`Added new Pokemon: ${newPokemon.name}`);
            }
        }

        // Sort by ID
        this.existingData.sort((a, b) => a.id - b.id);
    }

    async enhanceAllPokemon() {
        console.log('Starting Pokemon data enhancement...');
        
        await this.loadExistingData();
        
        // First, fill in any missing Pokemon
        await this.fillMissingPokemon();
        
        // Then enhance existing Pokemon
        this.enhancedData = [];
        
        for (let i = 0; i < this.existingData.length; i++) {
            const pokemon = this.existingData[i];
            const enhanced = await this.enhancePokemon(pokemon);
            this.enhancedData.push(enhanced);
            
            // Progress indicator
            if ((i + 1) % 10 === 0 || i === this.existingData.length - 1) {
                console.log(`Progress: ${i + 1}/${this.existingData.length} Pokemon processed`);
            }
        }
        
        console.log('Enhancement complete!');
    }

    saveEnhancedData() {
        try {
            const jsonString = JSON.stringify(this.enhancedData, null, 2);
            fs.writeFileSync(this.outputPath, jsonString);
            console.log(`Enhanced data saved to: ${this.outputPath}`);
            console.log(`Total Pokemon: ${this.enhancedData.length}`);
            
            // Also create a backup of the original if it doesn't exist
            const backupPath = this.jsonPath + '.backup';
            if (!fs.existsSync(backupPath)) {
                fs.copyFileSync(this.jsonPath, backupPath);
                console.log(`Backup created: ${backupPath}`);
            }
            
        } catch (error) {
            console.error('Error saving enhanced data:', error);
        }
    }

    async run() {
        console.log('=== Pokemon Data Enhancer ===');
        console.log('This will enhance the existing Pokemon JSON with:');
        console.log('- Descriptions from PokeAPI');
        console.log('- Generation information');
        console.log('- Legendary/Mythical status');
        console.log('- Any missing Pokemon (1-151)');
        console.log('');
        
        try {
            await this.enhanceAllPokemon();
            this.saveEnhancedData();
            
            console.log('');
            console.log('=== Enhancement Summary ===');
            console.log(`Total Pokemon processed: ${this.enhancedData.length}`);
            console.log(`Enhanced data saved to: ${this.outputPath}`);
            console.log('');
            console.log('To use the enhanced data:');
            console.log('1. Review the generated file');
            console.log('2. Replace the original pokemon.json with pokemon-enhanced.json');
            console.log('3. Update pokemon-service.js to use the enhanced data');
            
        } catch (error) {
            console.error('Enhancement failed:', error);
        }
    }
}

// Run the enhancer
if (require.main === module) {
    const enhancer = new PokemonDataEnhancer();
    enhancer.run();
}

module.exports = PokemonDataEnhancer;
