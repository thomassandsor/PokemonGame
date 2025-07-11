// Evolution service for Pokemon game

export interface EvolutionRequirement {
  type: 'level' | 'item' | 'trade' | 'friendship' | 'location';
  value?: number;
  item?: string;
  location?: string;
}

export interface EvolutionOption {
  id: number;
  name: string;
  sprite: string;
  requirements: EvolutionRequirement[];
  description: string;
}

export interface Pokemon {
  id: number;
  name: string;
  level: number;
  experience: number;
  friendship?: number;
  evolutionOptions?: EvolutionOption[];
}

export class EvolutionService {
  // Evolution data mapping - in a real app this would come from an API
  private static evolutionData: { [key: number]: EvolutionOption[] } = {
    1: [{ // Bulbasaur -> Ivysaur
      id: 2,
      name: 'Ivysaur',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png',
      requirements: [{ type: 'level', value: 16 }],
      description: 'Evolves at level 16'
    }],
    2: [{ // Ivysaur -> Venusaur
      id: 3,
      name: 'Venusaur',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png',
      requirements: [{ type: 'level', value: 32 }],
      description: 'Evolves at level 32'
    }],
    4: [{ // Charmander -> Charmeleon
      id: 5,
      name: 'Charmeleon',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png',
      requirements: [{ type: 'level', value: 16 }],
      description: 'Evolves at level 16'
    }],
    5: [{ // Charmeleon -> Charizard
      id: 6,
      name: 'Charizard',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
      requirements: [{ type: 'level', value: 36 }],
      description: 'Evolves at level 36'
    }],
    7: [{ // Squirtle -> Wartortle
      id: 8,
      name: 'Wartortle',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/8.png',
      requirements: [{ type: 'level', value: 16 }],
      description: 'Evolves at level 16'
    }],
    8: [{ // Wartortle -> Blastoise
      id: 9,
      name: 'Blastoise',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png',
      requirements: [{ type: 'level', value: 36 }],
      description: 'Evolves at level 36'
    }],
    25: [{ // Pikachu -> Raichu
      id: 26,
      name: 'Raichu',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png',
      requirements: [{ type: 'item', item: 'Thunder Stone' }],
      description: 'Evolves with Thunder Stone'
    }],
    133: [{ // Eevee evolutions
      id: 134,
      name: 'Vaporeon',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/134.png',
      requirements: [{ type: 'item', item: 'Water Stone' }],
      description: 'Evolves with Water Stone'
    }, {
      id: 135,
      name: 'Jolteon',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/135.png',
      requirements: [{ type: 'item', item: 'Thunder Stone' }],
      description: 'Evolves with Thunder Stone'
    }, {
      id: 136,
      name: 'Flareon',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/136.png',
      requirements: [{ type: 'item', item: 'Fire Stone' }],
      description: 'Evolves with Fire Stone'
    }]
  };

  // Get available evolution options for a Pokemon
  static getEvolutionOptions(pokemonId: number): EvolutionOption[] {
    return this.evolutionData[pokemonId] || [];
  }

  // Check if a Pokemon can evolve based on its current state
  static canEvolve(pokemon: Pokemon, option: EvolutionOption): boolean {
    for (const requirement of option.requirements) {
      switch (requirement.type) {
        case 'level':
          if (!requirement.value || pokemon.level < requirement.value) {
            return false;
          }
          break;
        case 'item':
          // In a real app, you'd check the player's inventory
          // For now, we'll assume they have the item if they try to evolve
          break;
        case 'friendship':
          if (!requirement.value || (pokemon.friendship || 0) < requirement.value) {
            return false;
          }
          break;
        case 'trade':
          // Trade evolutions would need special handling
          break;
        case 'location':
          // Location-based evolutions would need player location
          break;
      }
    }
    return true;
  }

  // Get evolution requirements text
  static getRequirementsText(requirements: EvolutionRequirement[]): string {
    return requirements.map(req => {
      switch (req.type) {
        case 'level':
          return `Level ${req.value}`;
        case 'item':
          return `Use ${req.item}`;
        case 'friendship':
          return `High friendship (${req.value}+)`;
        case 'trade':
          return 'Trade evolution';
        case 'location':
          return `Evolve at ${req.location}`;
        default:
          return 'Unknown requirement';
      }
    }).join(' + ');
  }

  // Execute evolution
  static async evolvePokemon(pokemon: Pokemon, evolution: EvolutionOption): Promise<Pokemon> {
    if (!this.canEvolve(pokemon, evolution)) {
      throw new Error('Evolution requirements not met');
    }

    // Create evolved Pokemon
    const evolvedPokemon: Pokemon = {
      ...pokemon,
      id: evolution.id,
      name: evolution.name,
      // Reset evolution options for the new Pokemon
      evolutionOptions: this.getEvolutionOptions(evolution.id)
    };

    return evolvedPokemon;
  }

  // Get all Pokemon that can currently evolve from a list
  static getEvolvablePokemon(pokemonList: Pokemon[]): Pokemon[] {
    return pokemonList.filter(pokemon => {
      const options = this.getEvolutionOptions(pokemon.id);
      return options.some(option => this.canEvolve(pokemon, option));
    });
  }

  // Simulate gaining experience and check for level-based evolutions
  static checkForEvolutionAfterLevelUp(pokemon: Pokemon): EvolutionOption[] {
    const options = this.getEvolutionOptions(pokemon.id);
    return options.filter(option => 
      option.requirements.some(req => 
        req.type === 'level' && req.value && pokemon.level >= req.value
      )
    );
  }
}
