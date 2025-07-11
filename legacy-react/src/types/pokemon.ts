// Pokemon type definitions for the Pokemon Game application

export interface PokemonType {
  name: string;
  url: string;
}

export interface PokemonTypeInfo {
  slot: number;
  type: PokemonType;
}

export interface PokemonSprites {
  front_default: string | null;
  front_shiny: string | null;
  back_default: string | null;
  back_shiny: string | null;
  other?: {
    'official-artwork'?: {
      front_default: string | null;
    };
    home?: {
      front_default: string | null;
      front_shiny: string | null;
    };
  };
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

export interface PokemonAbility {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
  slot: number;
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  order: number;
  is_default: boolean;
  location_area_encounters: string;
  sprites: PokemonSprites;
  stats: PokemonStat[];
  types: PokemonTypeInfo[];
  abilities: PokemonAbility[];
  species: {
    name: string;
    url: string;
  };
  forms: Array<{
    name: string;
    url: string;
  }>;
  game_indices: Array<{
    game_index: number;
    version: {
      name: string;
      url: string;
    };
  }>;
  held_items: Array<any>;
  moves: Array<any>;
  past_types: Array<any>;
}

// Dataverse-specific interfaces
export interface DataversePokemon {
  pokemon_id?: string;
  pokemon_name?: string;
  pokemon_number?: number;
  pokemon_height?: number;
  pokemon_weight?: number;
  pokemon_type1?: string;
  pokemon_type2?: string;
  pokemon_image_url?: string;
  created_on?: string;
  modified_on?: string;
}

// User Pokemon interface for captured/owned Pokemon
export interface UserPokemon {
  id: string;
  pokemon_id: number;
  pokemon_name: string;
  pokemon_number: number;
  level?: number;
  experience?: number;
  hp?: number;
  attack?: number;
  defense?: number;
  special_attack?: number;
  special_defense?: number;
  speed?: number;
  caught_date?: string;
  nickname?: string;
  is_shiny?: boolean;
  location_caught?: string;
}

// Evolution-related interfaces
export interface EvolutionChain {
  id: number;
  baby_trigger_item: any;
  chain: EvolutionDetail;
}

export interface EvolutionDetail {
  is_baby: boolean;
  species: {
    name: string;
    url: string;
  };
  evolution_details: Array<{
    item: any;
    trigger: {
      name: string;
      url: string;
    };
    gender: number | null;
    held_item: any;
    known_move: any;
    known_move_type: any;
    location: any;
    min_level: number | null;
    min_happiness: number | null;
    min_beauty: number | null;
    min_affection: number | null;
    needs_overworld_rain: boolean;
    party_species: any;
    party_type: any;
    relative_physical_stats: number | null;
    time_of_day: string;
    trade_species: any;
    turn_upside_down: boolean;
  }>;
  evolves_to: EvolutionDetail[];
}

// Battle-related interfaces
export interface BattlePokemon {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  types: string[];
  moves: BattleMove[];
  status?: BattleStatus;
  sprite: string;
}

export interface BattleMove {
  id: string;
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  category: 'physical' | 'special' | 'status';
  effect?: string;
}

export interface BattleStatus {
  type: 'burn' | 'freeze' | 'paralysis' | 'poison' | 'sleep' | 'confusion';
  turnsRemaining?: number;
}

export interface BattleResult {
  winner: 'player' | 'opponent' | 'tie';
  experience_gained?: number;
  items_gained?: string[];
  pokemon_caught?: Pokemon;
}

// API Response interfaces
export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    name: string;
    url: string;
  }>;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

export default Pokemon;
