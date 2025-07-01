// Pokemon data types from PokeAPI (simplified)
export interface PokemonSprite {
  front_default: string | null;
  front_shiny: string | null;
  official_artwork: string | null;
}

export interface PokemonStat {
  name: string;
  base_stat: number;
}

export interface EvolutionRequirement {
  level?: number;
  item?: string;
  trigger?: string;
  time_of_day?: string;
  min_happiness?: number;
  min_beauty?: number;
  location?: string;
  known_move?: string;
}

export interface PokemonEvolution {
  evolves_from: string | null;
  evolves_to: Array<{
    id: number;
    name: string;
    requirement: EvolutionRequirement;
  }>;
  can_evolve: boolean;
}

export interface Pokemon {
  id: number;
  name: string;
  sprites: PokemonSprite;
  types: string[];
  height: number;
  weight: number;
  stats: PokemonStat[];
  abilities: string[];
  evolution: PokemonEvolution;
}

// Updated interfaces for the simplified Dataverse schema
export interface PokedexEntry {
  pokemon_pokedexid?: string;
  pokemon_user: string; // Reference to trainer (contact)
  pokemon_number: number; // Pokemon ID (1-151) - references GitHub data (this table still uses pokemon_number)
  createdon?: string;
}

// Combined view for displaying caught Pokemon with full details from GitHub
export interface CaughtPokemon {
  pokedexId: string;
  pokemon: Pokemon; // Full Pokemon data from GitHub
  caughtOn: string;
}
