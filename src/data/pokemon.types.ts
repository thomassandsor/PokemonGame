// Auto-generated Pokemon type definitions
export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    official_artwork: string | null;
  };
  types: string[];
  stats: Array<{
    name: string;
    base_stat: number;
  }>;
  abilities: string[];
  evolution: EvolutionData | null;
}

export interface EvolutionData {
  evolves_from: {
    id: number;
    name: string | null;
  } | null;
  evolves_to: Array<{
    id: number;
    name: string;
    requirement: EvolutionRequirement | null;
  }>;
  can_evolve: boolean;
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

export interface PokemonDataverseEntity {
  pokemon_pokemonid?: string;
  pokemon_id: number;
  pokemon_name: string;
  pokemon_height?: number;
  pokemon_weight?: number;
  pokemon_sprite_url?: string;
  pokemon_artwork_url?: string;
  pokemon_types?: string; // JSON string of types array
  pokemon_stats?: string; // JSON string of stats array
  pokemon_abilities?: string; // JSON string of abilities array
  pokemon_evolution?: string; // JSON string of evolution data
  pokemon_type?: string;
  pokemon_description?: string;
  pokemon_imageurl?: string;
}

export type PokemonList = Pokemon[];
