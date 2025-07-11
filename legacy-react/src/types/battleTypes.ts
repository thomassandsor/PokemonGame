// Comprehensive Battle System Types for Pokemon Game

export interface BattlePokemon {
  id: string;
  pokemon_id: number;
  name: string;
  level: number;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  speed: number;
  types: string[];
  sprite_url: string;
  moves: BattleMove[];
  status_effects?: StatusEffect[];
}

export interface BattleMove {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  description: string;
  effect?: string;
}

export interface StatusEffect {
  name: string;
  type: 'poison' | 'burn' | 'paralysis' | 'sleep' | 'freeze' | 'confusion';
  duration: number;
  damage_per_turn?: number;
}

export interface BattleTurn {
  turn_number: number;
  timestamp: string;
  player1_action: BattleAction;
  player2_action: BattleAction;
  turn_result: TurnResult;
  battlefield_state: BattlefieldState;
}

export interface BattleAction {
  type: 'attack' | 'switch' | 'item' | 'surrender';
  move_used?: string;
  target?: 'opponent' | 'self';
  damage_dealt?: number;
  effectiveness?: 'not_very_effective' | 'normal' | 'super_effective' | 'no_effect';
  critical_hit?: boolean;
  status_effect_applied?: StatusEffect;
  pokemon_switched_to?: string;
  action_success: boolean;
  action_description: string;
}

export interface TurnResult {
  player1_pokemon_hp: number;
  player2_pokemon_hp: number;
  player1_pokemon_fainted: boolean;
  player2_pokemon_fainted: boolean;
  weather_effect?: string;
  special_events?: string[];
  turn_summary: string;
}

export interface BattlefieldState {
  weather?: 'sunny' | 'rain' | 'sandstorm' | 'hail' | 'fog';
  terrain?: 'normal' | 'electric' | 'grassy' | 'psychic' | 'misty';
  field_effects?: string[];
  player1_active_pokemon: BattlePokemon;
  player2_active_pokemon: BattlePokemon;
}

export interface BattleMetadata {
  battle_id: string;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  battle_type: 'ranked' | 'casual' | 'training' | 'tournament';
  battle_format: 'single' | 'double' | 'multi';
  battle_rules: {
    level_cap?: number;
    timer_per_turn?: number;
    items_allowed: boolean;
    switching_allowed: boolean;
  };
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
}

export interface BattleResult {
  winner: 'player1' | 'player2' | 'draw';
  winner_name: string;
  loser_name: string;
  victory_condition: 'all_pokemon_fainted' | 'surrender' | 'timeout' | 'disconnection';
  final_scores: {
    player1_pokemon_remaining: number;
    player2_pokemon_remaining: number;
    player1_total_damage_dealt: number;
    player2_total_damage_dealt: number;
  };
  mvp_pokemon?: {
    name: string;
    owner: 'player1' | 'player2';
    damage_dealt: number;
    knockouts: number;
  };
  battle_summary: string;
  rewards?: {
    experience_gained: number;
    items_earned?: string[];
    achievements_unlocked?: string[];
  };
}

export interface CompleteBattleData {
  metadata: BattleMetadata;
  pokemon_teams: {
    player1_team: BattlePokemon[];
    player2_team: BattlePokemon[];
  };
  battle_turns: BattleTurn[];
  final_result: BattleResult;
  battle_log: string[];
  replay_data: {
    version: string;
    compressed: boolean;
    animation_timings: number[];
    special_effects: string[];
  };
}

// UI State Types
export interface BattleReplayState {
  current_turn: number;
  is_playing: boolean;
  playback_speed: 'slow' | 'normal' | 'fast';
  auto_advance: boolean;
  show_detailed_stats: boolean;
}

export interface MobileBattleView {
  view_mode: 'summary' | 'detailed' | 'replay';
  collapsed_sections: string[];
  preferred_layout: 'portrait' | 'landscape';
}

// API Response Types
export interface BattleSimulationRequest {
  challenge_id: string;
  player1_pokemon_id: string;
  player2_pokemon_id: string;
  battle_settings: {
    simulation_speed: 'instant' | 'normal' | 'detailed';
    ai_difficulty?: 'easy' | 'medium' | 'hard';
    random_seed?: string;
  };
}

export interface BattleSimulationResponse {
  success: boolean;
  battle_data?: CompleteBattleData;
  error_message?: string;
  simulation_time_ms: number;
}
