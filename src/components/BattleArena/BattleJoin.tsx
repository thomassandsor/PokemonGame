import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BattleChallengeService, PokemonBattleExpanded } from '../../services/battleChallengeService';
import { StatusCodes } from '../../constants/dataverseMappings';
import { DataverseQueryBuilder } from '../../constants/dataverseSchema';
import { API_CONFIG } from '../../config/api';
import { useDemoMode } from '../../contexts/DemoContext';
import { useMsal, useAccount } from '@azure/msal-react';
import { getContactByEmail } from '../../services/azureFunctionsDataverseService';
import '../../styles/PokemonCard.css';
import './BattleJoin.css';

interface UserPokemon {
  id: string;
  pokemon_id: number;
  pokemon_name: string;
  pokemon_level?: number;
  pokemon_nickname?: string;
  pokemon_current_hp?: number;
  pokemon_max_hp?: number;
  pokemon_experience?: number;
  pokemon_is_shiny?: boolean;
}

interface BattleJoinProps {}

const BattleJoin: React.FC<BattleJoinProps> = () => {
  const navigate = useNavigate();
  const { battleId } = useParams<{ battleId: string }>();
  const { demoUser, isDemoMode } = useDemoMode();
  const { accounts } = useMsal();
  const account = useAccount(accounts[0] || {});
  
  const [step, setStep] = useState<'loading' | 'select-pokemon' | 'confirm' | 'error'>('loading');
  const [battle, setBattle] = useState<PokemonBattleExpanded | null>(null);
  const [userPokemon, setUserPokemon] = useState<UserPokemon[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<UserPokemon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const loadBattleAndPokemon = useCallback(async () => {
    if (!battleId) {
      setError('No battle ID provided');
      setStep('error');
      return;
    }

    console.log('Loading battle with ID:', battleId);

    try {
      setLoading(true);
      
      // Get current user ID
      let userId = '';
      if (isDemoMode) {
        userId = demoUser.id;
      } else if (account?.username) {
        // Get the contact ID for the current user
        const userContact = await getContactByEmail(account.username);
        if (userContact?.contactid) {
          userId = userContact.contactid;
        } else {
          throw new Error('User not found. Please complete your profile first.');
        }
      } else {
        throw new Error('User not authenticated');
      }
      
      setCurrentUserId(userId);
      
      // Load battle details with expanded Pokemon data - simplified query first      console.log('Fetching battle data from:', `${API_CONFIG.BASE_URL}/pokemon_battles(${battleId})?$expand=pokemon_Player1($select=firstname),pokemon_Player1Pokemon($expand=pokemon_Pokemon($select=pokemon_name,pokemon_id))`);

      const battleResponse = await fetch(`${API_CONFIG.BASE_URL}/pokemon_battles(${battleId})?$expand=pokemon_Player1($select=firstname),pokemon_Player1Pokemon($expand=pokemon_Pokemon($select=pokemon_name,pokemon_id))`);
      
      console.log('Battle response status:', battleResponse.status);
      console.log('Battle response ok:', battleResponse.ok);
      
      if (!battleResponse.ok) {
        const errorText = await battleResponse.text();
        console.error('Battle fetch failed:', battleResponse.status, battleResponse.statusText, errorText);
        throw new Error(`Battle not found (${battleResponse.status}: ${battleResponse.statusText})`);
      }
      
      const battleData = await battleResponse.json();
      
      // Debug: Log the battle data to see the actual structure
      console.log('Battle data structure:', battleData);
      console.log('Player1Pokemon:', battleData.pokemon_Player1Pokemon);
      console.log('Pokemon details:', battleData.pokemon_Player1Pokemon?.pokemon_Pokemon);
      
      // Check if battle is still open
      if (battleData.statuscode !== StatusCodes.OPEN) {
        throw new Error('This battle is no longer available to join');
      }
      
      setBattle(battleData);

      // Load user's Pokemon (filtered by user ID)
      const pokemonResponse = await fetch(`${API_CONFIG.BASE_URL}/${DataverseQueryBuilder.getAllUserPokemon(userId)}`);
      if (pokemonResponse.ok) {
        const pokemonData = await pokemonResponse.json();
        // Map HP and HP Max from correct fields
        const transformedPokemon = (pokemonData.value || []).map((entry: any) => ({
          id: entry.pokemon_pokedexid,
          pokemon_id: entry.pokemon_Pokemon?.pokemon_id || 0,
          pokemon_name: entry.pokemon_Pokemon?.pokemon_name || entry.pokemon_name || 'Unknown',
          pokemon_level: entry.pokemon_level,
          pokemon_nickname: entry.pokemon_nickname,
          pokemon_current_hp: entry.pokemon_hp, // current HP
          pokemon_max_hp: entry.pokemon_hpmax,   // max HP
          pokemon_experience: entry.pokemon_experience,
          pokemon_is_shiny: entry.pokemon_is_shiny || false
        }));
        setUserPokemon(transformedPokemon);
      }

      setStep('select-pokemon');
    } catch (err) {
      console.error('Error loading battle and Pokemon:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load battle';
      console.error('Full error details:', {
        error: err,
        battleId,
        isDemoMode,
        userId: currentUserId
      });
      setError(errorMessage);
      setStep('error');
    } finally {
      setLoading(false);
    }
  }, [battleId, isDemoMode, demoUser, account, currentUserId]);

  // Load battle details and user's Pokemon
  useEffect(() => {
    loadBattleAndPokemon();
  }, [loadBattleAndPokemon]);

  const handlePokemonSelect = (pokemon: UserPokemon) => {
    setSelectedPokemon(pokemon);
    setStep('confirm');
  };

  const handleConfirmChallenge = async () => {
    if (!battle || !selectedPokemon || !currentUserId) return;

    try {
      setLoading(true);
      
      const result = await BattleChallengeService.startBattle(
        battle.pokemon_battleid!,
        currentUserId,
        selectedPokemon.id
      );

      if (result.success) {
        // Navigate to battle result page to view the replay
        navigate(`/battle/result/${battle.pokemon_battleid}`);
      } else {
        setError(result.error || 'Failed to start battle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start battle');
    } finally {
      setLoading(false);
    }
  };

  // Use the same sprite logic as MyPage for consistency
  const getPokemonSprite = (pokemonId: number, isShiny: boolean = false) => {
    // For consistency with MyPage, we could use official artwork, but for battle
    // selection we'll use regular sprites (which work better for level/HP display)
    const shinyPath = isShiny ? 'shiny/' : '';
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shinyPath}${pokemonId}.png`;
  };

  // Helper function to get Pokemon ID from name if ID is not available
  const getPokemonIdFromName = (pokemonName: string): number => {
    // Simple mapping for common Pokemon - in a real app, you'd have a lookup table
    const pokemonNameToId: { [key: string]: number } = {
      'pikachu': 25,
      'charizard': 6,
      'blastoise': 9,
      'venusaur': 3,
      'alakazam': 65,
      'machamp': 68,
      'gengar': 94,
      'dragonite': 149,
      'mewtwo': 150,
      'mew': 151
    };
    
    return pokemonNameToId[pokemonName.toLowerCase()] || 1; // Default to Bulbasaur if unknown
  };

  if (step === 'loading') {
    return (
      <div className="pokemon-page-container">
        <div className="pokemon-loading-container">
          <div className="pokeball-spinner"></div>
          <p>Loading battle...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="pokemon-page-container">
        <div className="pokemon-error-container">
          <h2>⚠️ Unable to Join Battle</h2>
          <p>{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/battle-arena')}
          >
            Back to Battle Arena
          </button>
        </div>
      </div>
    );
  }

  if (step === 'select-pokemon') {
    return (
      <div className="pokemon-page-container">
        <div className="pokemon-page-header">
          <h1>🥊 Join Battle</h1>
          <p>Opponent: {battle?.pokemon_Player1?.firstname || 'Unknown Trainer'} with {battle?.pokemon_Player1Pokemon?.pokemon_Pokemon?.pokemon_name || 'Unknown Pokémon'}</p>
        </div>

        <div className="pokemon-selection-section">
          <h2>Select Your Pokémon</h2>
          <p>Choose which Pokémon you want to battle with:</p>
          
          {userPokemon.length === 0 ? (
            <div className="pokemon-grid">
              <div className="welcome-card">
                <h3>🎮 No Pokémon Available!</h3>
                <p>You don't have any Pokémon yet. Visit the Pokémon Browser or Scanner to catch your first Pokémon!</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/my-page')}
                >
                  Get Pokémon First
                </button>
              </div>
            </div>
          ) : (
            <div className="pokemon-grid">
              {userPokemon.map((pokemon) => (
                <div 
                  key={pokemon.id}
                  className="pokemon-card-container"
                  onClick={() => handlePokemonSelect(pokemon)}
                >
                  <div className="pokemon-image-wrapper">
                    <img 
                      src={getPokemonSprite(pokemon.pokemon_id, pokemon.pokemon_is_shiny)}
                      alt={pokemon.pokemon_nickname || pokemon.pokemon_name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/pokemon-placeholder.png';
                      }}
                    />
                    {pokemon.pokemon_is_shiny && <span className="pokemon-shiny-indicator">✨</span>}
                  </div>
                  
                  <div className="pokemon-number">
                    #{pokemon.pokemon_id.toString().padStart(3, '0')}
                  </div>
                  
                  <div className="pokemon-name">
                    {pokemon.pokemon_nickname || pokemon.pokemon_name}
                  </div>
                  
                  <div className="pokemon-level-badge">
                    Level {pokemon.pokemon_level || 5}
                  </div>
                  
                  <div className="pokemon-hp-display">
                    <span>HP: {pokemon.pokemon_current_hp || 100}/{pokemon.pokemon_max_hp || 100}</span>
                    <div className="pokemon-hp-bar">
                      <div 
                        className="pokemon-hp-fill"
                        style={{ 
                          width: `${((pokemon.pokemon_current_hp || 100) / (pokemon.pokemon_max_hp || 100)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="pokemon-caught-indicator">
                    Select for Battle
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'confirm' && selectedPokemon) {
    return (
      <div className="pokemon-page-container">
        <div className="pokemon-page-header">
          <h1>⚔️ Confirm Battle</h1>
          <p>Ready to start your battle?</p>
        </div>
        
        <div className="battle-confirmation">
          <div className="battle-matchup">
            <div className="trainer-side">
              <h3>{battle?.pokemon_Player1?.firstname || 'Unknown Trainer'}</h3>
              <div className="pokemon-card-container battle-card">
                <div className="pokemon-image-wrapper">
                  {(battle?.pokemon_Player1Pokemon?.pokemon_Pokemon as any)?.pokemon_id ? (
                    <img 
                      src={getPokemonSprite((battle?.pokemon_Player1Pokemon?.pokemon_Pokemon as any)?.pokemon_id)}
                      alt="Opponent's Pokémon"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/pokemon-placeholder.png';
                      }}
                    />
                  ) : battle?.pokemon_Player1Pokemon?.pokemon_Pokemon?.pokemon_name ? (
                    <img 
                      src={getPokemonSprite(getPokemonIdFromName(battle.pokemon_Player1Pokemon.pokemon_Pokemon.pokemon_name))}
                      alt="Opponent's Pokémon"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/pokemon-placeholder.png';
                      }}
                    />
                  ) : (
                    <div className="pokemon-placeholder">
                      🎮
                    </div>
                  )}
                </div>
                <div className="pokemon-name">
                  {battle?.pokemon_Player1Pokemon?.pokemon_Pokemon?.pokemon_name || 'Unknown Pokémon'}
                </div>
                <div className="pokemon-level-badge">
                  Level {(battle?.pokemon_Player1Pokemon as any)?.pokemon_level || '?'}
                </div>
              </div>
            </div>

            <div className="vs-indicator">
              <span>VS</span>
            </div>

            <div className="trainer-side">
              <h3>You</h3>
              <div className="pokemon-card-container battle-card">
                <div className="pokemon-image-wrapper">
                  <img 
                    src={getPokemonSprite(selectedPokemon.pokemon_id, selectedPokemon.pokemon_is_shiny)}
                    alt={selectedPokemon.pokemon_nickname || selectedPokemon.pokemon_name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/pokemon-placeholder.png';
                    }}
                  />
                  {selectedPokemon.pokemon_is_shiny && <span className="pokemon-shiny-indicator">✨</span>}
                </div>
                <div className="pokemon-name">
                  {selectedPokemon.pokemon_nickname || selectedPokemon.pokemon_name}
                </div>
                <div className="pokemon-level-badge">
                  Level {selectedPokemon.pokemon_level || 5}
                </div>
              </div>
            </div>
          </div>

          <div className="confirmation-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => setStep('select-pokemon')}
              disabled={loading}
            >
              ← Change Pokémon
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={handleConfirmChallenge}
              disabled={loading}
            >
              {loading ? '🔄 Starting Battle...' : '⚔️ Start Battle!'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default BattleJoin;
