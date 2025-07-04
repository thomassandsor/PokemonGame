import React, { useState, useEffect } from 'react';
import { BattleChallengeService, PokemonBattle, PokemonBattleExpanded, BattleResult } from '../../services/battleChallengeService';
import { StatusCodes, ChallengeTypes } from '../../constants/dataverseMappings';
import { CompleteBattleData } from '../../types/battleTypes';
import BattleReplay from './BattleReplay';
import './BattleArena.css';

interface BattleArenaPokemon {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  types: string[];
  sprite: string;
  moves?: string[];
  experience?: number;
}

interface BattleArenaProps {
  userPokemon: any[];
  onPokemonUpdate: (pokemon: any) => void;
  onEvolutionAvailable: (pokemon: any, options: any[]) => void;
}

type ViewMode = 'challenges' | 'create' | 'history' | 'battle-replay';

const BattleArena: React.FC<BattleArenaProps> = ({
  userPokemon,
  onPokemonUpdate,
  onEvolutionAvailable
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('challenges');
  const [selectedPokemon, setSelectedPokemon] = useState<BattleArenaPokemon | null>(null);
  const [openChallenges, setOpenChallenges] = useState<PokemonBattleExpanded[]>([]);
  const [userChallenges, setUserChallenges] = useState<PokemonBattle[]>([]);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPokemonModal, setShowPokemonModal] = useState(false);
  const [challengeToJoin, setChallengeToJoin] = useState<PokemonBattle | null>(null);

  // Load challenges on component mount
  useEffect(() => {
    if (viewMode === 'challenges') {
      loadOpenChallenges();
    } else if (viewMode === 'history') {
      loadUserChallenges();
    }
  }, [viewMode]);

  const loadOpenChallenges = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading open challenges...');
      const challenges = await BattleChallengeService.getOpenChallenges();
      console.log('📊 Received challenges:', challenges);
      console.log('📊 Number of challenges:', challenges.length);
      setOpenChallenges(challenges);
      if (challenges.length === 0) {
        setMessage('No open challenges found. Check browser console for debugging info.');
      } else {
        setMessage(`Found ${challenges.length} open challenge(s)!`);
      }
    } catch (error) {
      console.error('❌ Error loading challenges:', error);
      setMessage(`Failed to load challenges: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  const loadUserChallenges = async () => {
    setLoading(true);
    try {
      // TODO: Get real user ID from authentication context
      const userId = 'current-user-id';
      const challenges = await BattleChallengeService.getUserChallenges(userId);
      setUserChallenges(challenges);
    } catch (error) {
      setMessage('Failed to load your challenges');
    }
    setLoading(false);
  };

  const createChallenge = async (challengeType: 'open' | 'training') => {
    if (!selectedPokemon) {
      setMessage('Please select a Pokemon first!');
      return;
    }

    setLoading(true);
    try {
      // TODO: Get real user ID from authentication context
      const userId = 'current-user-id';
      const result = await BattleChallengeService.createChallenge(
        userId, 
        selectedPokemon.id, // Using pokemon ID as string
        challengeType
      );

      if (result.success) {
        setMessage(challengeType === 'training' 
          ? 'Training battle started! Check your history for results.'
          : 'Challenge created! Other players can now join.'
        );
        setViewMode('history');
      } else {
        setMessage(result.error || 'Failed to create challenge');
      }
    } catch (error) {
      setMessage('Error creating challenge');
    }
    setLoading(false);
  };

  const joinChallenge = async (challenge: PokemonBattle) => {
    if (!selectedPokemon) {
      setMessage('Please select a Pokemon first!');
      return;
    }

    if (!challenge.pokemon_battleid) {
      setMessage('Invalid challenge - missing battle ID');
      return;
    }

    setLoading(true);
    try {
      // TODO: Get real user ID from authentication context
      const userId = 'current-user-id';
      const result = await BattleChallengeService.joinChallenge(
        challenge.pokemon_battleid,
        userId,
        selectedPokemon.id // Using pokemon ID as string
      );

      if (result.success) {
        setMessage('Challenge accepted! Battle is being simulated...');
        setViewMode('history');
      } else {
        setMessage(result.error || 'Failed to join challenge');
      }
    } catch (error) {
      setMessage('Error joining challenge');
    }
    setLoading(false);
  };

  const viewBattleResult = async (challenge: PokemonBattle) => {
    if (!challenge.pokemon_battleid) {
      setMessage('Invalid challenge - missing battle ID');
      return;
    }

    setLoading(true);
    try {
      const result = await BattleChallengeService.getBattleResult(challenge.pokemon_battleid);
      if (result) {
        setBattleResult(result);
        setCurrentStep(0);
        setViewMode('battle-replay');
      } else {
        setMessage('Battle result not ready yet. Please try again in a moment.');
      }
    } catch (error) {
      setMessage('Failed to load battle result');
    }
    setLoading(false);
  };

  const replayNextStep = () => {
    if (battleResult && currentStep < battleResult.battleSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const replayPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const autoReplay = () => {
    if (battleResult && !isReplaying) {
      setIsReplaying(true);
      setCurrentStep(0);
      
      const interval = setInterval(() => {
        setCurrentStep(current => {
          if (current >= battleResult.battleSteps.length) {
            clearInterval(interval);
            setIsReplaying(false);
            return current;
          }
          return current + 1;
        });
      }, 1500); // 1.5 seconds per step
    }
  };

  const openPokemonSelection = (challenge: PokemonBattleExpanded) => {
    // Convert expanded challenge to basic challenge for joinChallenge
    const basicChallenge: PokemonBattle = {
      pokemon_battleid: challenge.pokemon_battleid,
      pokemon_player1: challenge._pokemon_player1_value || '',
      pokemon_player1pokemon: challenge._pokemon_player1pokemon_value || '',
      pokemon_player2: challenge._pokemon_player2_value,
      pokemon_player2pokemon: challenge._pokemon_player2pokemon_value,
      statuscode: challenge.statuscode,
      statecode: challenge.statecode,
      pokemon_challengetype: challenge.pokemon_challengetype,
      createdon: challenge.createdon,
      modifiedon: challenge.modifiedon,
      pokemon_battleresult: challenge.pokemon_battleresult
    };
    
    setChallengeToJoin(basicChallenge);
    setShowPokemonModal(true);
  };

  const handlePokemonSelect = (pokemon: BattleArenaPokemon) => {
    setSelectedPokemon(pokemon);
    setShowPokemonModal(false);
    
    if (challengeToJoin) {
      joinChallenge(challengeToJoin);
      setChallengeToJoin(null);
    }
  };

  const closePokemonModal = () => {
    setShowPokemonModal(false);
    setChallengeToJoin(null);
  };

  // Convert user Pokemon to BattleArena format
  const convertToBattleArenaPokemon = (userPokemon: any[]): BattleArenaPokemon[] => {
    return userPokemon.map(pokemon => ({
      id: pokemon.id || pokemon.pokemon_id?.toString() || '',
      name: pokemon.name || pokemon.pokemon_name || 'Unknown',
      level: pokemon.level || 5,
      hp: pokemon.hp || 50,
      maxHp: pokemon.maxHp || pokemon.max_hp || 50,
      attack: pokemon.attack || 30,
      defense: pokemon.defense || 25,
      speed: pokemon.speed || 20,
      types: pokemon.types || ['normal'],
      sprite: pokemon.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemon_id || pokemon.id || 25}.png`,
      moves: pokemon.moves || ['Tackle', 'Scratch'],
      experience: pokemon.experience || 0
    }));
  };

  return (
    <div className="battle-arena">
      <div className="arena-header">
        <h1>Battle Arena</h1>
        <p>Challenge trainers or battle AI in the ultimate Pokémon arena!</p>
      </div>

      {/* Navigation */}
      <div className="arena-nav">
        <button 
          className={`nav-btn ${viewMode === 'challenges' ? 'active' : ''}`}
          onClick={() => setViewMode('challenges')}
        >
          Open Challenges
        </button>
        <button 
          className={`nav-btn ${viewMode === 'create' ? 'active' : ''}`}
          onClick={() => setViewMode('create')}
        >
          Create Challenge
        </button>
        <button 
          className={`nav-btn ${viewMode === 'history' ? 'active' : ''}`}
          onClick={() => setViewMode('history')}
        >
          My Battles
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className="message-banner">
          {message}
          <button onClick={() => setMessage('')} className="close-btn">×</button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="loading-spinner">
          <div className="pokeball-spinner"></div>
          <p>Loading...</p>
        </div>
      )}

      {/* Open Challenges View */}
      {viewMode === 'challenges' && (
        <div className="challenges-view">
          <div className="section-header">
            <h2>Open Challenges</h2>
            <button onClick={loadOpenChallenges} className="refresh-btn">
              🔄 Refresh
            </button>
          </div>

          {/* Challenge Table */}
          {openChallenges.length === 0 ? (
            <div className="no-challenges">
              <p>No open challenges available right now.</p>
              <p>Create your own challenge to get started!</p>
            </div>
          ) : (
            <div className="challenges-table-container">
              <table className="challenges-table">
                <thead>
                  <tr>
                    <th>Challenge ID</th>
                    <th>Trainer</th>
                    <th>Pokémon</th>
                    <th>Type</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {openChallenges.map((challenge) => (
                    <tr key={challenge.pokemon_battleid || 'unknown'}>
                      <td className="challenge-id">
                        #{(challenge.pokemon_battleid || 'unknown').slice(-6)}
                      </td>
                      <td className="trainer-cell">
                        <span className="trainer-name">
                          {challenge.pokemon_Player1?.firstname || `Trainer #${(challenge._pokemon_player1_value || 'unknown').slice(-4)}`}
                        </span>
                      </td>
                      <td className="pokemon-cell">
                        <span className="pokemon-name">
                          {challenge.pokemon_Player1Pokemon?.pokemon_Pokemon?.pokemon_name || `Pokémon #${(challenge._pokemon_player1pokemon_value || 'unknown').slice(-4)}`}
                        </span>
                      </td>
                      <td className="type-cell">
                        <span className={`challenge-type ${challenge.pokemon_challengetype === ChallengeTypes.TRAINING ? 'training' : 'pvp'}`}>
                          {challenge.pokemon_challengetype === ChallengeTypes.TRAINING ? 'Training' : 'PVP'}
                        </span>
                      </td>
                      <td className="created-cell">
                        {challenge.createdon ? new Date(challenge.createdon).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="status-cell">
                        <span className={`status ${challenge.statuscode === StatusCodes.OPEN ? 'open' : 'other'}`}>
                          {challenge.statuscode === StatusCodes.OPEN ? 'Open' : 'Pending'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          onClick={() => openPokemonSelection(challenge)}
                          disabled={loading}
                          className="accept-btn"
                          title="Accept this challenge"
                        >
                          Accept
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Challenge View */}
      {viewMode === 'create' && (
        <div className="create-view">
          <h2>Create New Challenge</h2>

          {/* Pokemon Selection */}
          <div className="pokemon-selection">
            <h3>Select Your Pokémon</h3>
            {userPokemon.length === 0 ? (
              <div className="no-pokemon">
                <p>You don't have any Pokemon yet!</p>
                <p>Visit the Pokemon Browser to discover Pokemon first.</p>
              </div>
            ) : (
              <div className="pokemon-grid">
                {userPokemon.map((pokemon, index) => (
                  <div 
                    key={index}
                    className={`pokemon-card ${selectedPokemon?.id === pokemon.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPokemon(pokemon)}
                  >
                    <img src={pokemon.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`} alt={pokemon.name} />
                    <h3>{pokemon.name}</h3>
                    <p>Level {pokemon.level || 5}</p>
                    <div className="hp-bar">
                      <div 
                        className="hp-fill"
                        style={{ width: `${((pokemon.hp || pokemon.maxHp) / (pokemon.maxHp || 100)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="pokemon-types">
                      {pokemon.types?.map((type: string) => (
                        <span key={type} className={`type-badge type-${type.toLowerCase()}`}>
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Challenge Type Selection */}
          {selectedPokemon && (
            <div className="challenge-options">
              <h3>Choose Challenge Type</h3>
              <div className="challenge-buttons">
                <button 
                  onClick={() => createChallenge('training')}
                  disabled={loading}
                  className="challenge-btn training"
                >
                  <div className="btn-icon">🤖</div>
                  <div className="btn-content">
                    <h4>Training Battle</h4>
                    <p>Battle against AI for practice</p>
                    <p>Immediate results</p>
                  </div>
                </button>
                <button 
                  onClick={() => createChallenge('open')}
                  disabled={loading}
                  className="challenge-btn open"
                >
                  <div className="btn-icon">⚔️</div>
                  <div className="btn-content">
                    <h4>Open Challenge</h4>
                    <p>Challenge other trainers</p>
                    <p>Wait for opponent to join</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Battle History View */}
      {viewMode === 'history' && (
        <div className="history-view">
          <div className="section-header">
            <h2>My Battle History</h2>
            <button onClick={loadUserChallenges} className="refresh-btn">
              🔄 Refresh
            </button>
          </div>

          <div className="challenge-list">
            {userChallenges.length === 0 ? (
              <div className="no-challenges">
                <p>No battles yet!</p>
                <p>Create a challenge to start battling.</p>
              </div>
            ) : (
              userChallenges.map((challenge) => (
                <div key={challenge.pokemon_battleid || 'unknown'} className="challenge-card history">
                  <div className="challenge-info">
                    <h3>
                      {challenge.pokemon_challengetype === ChallengeTypes.TRAINING ? '🤖 Training Battle' : 
                       challenge.pokemon_player2 ? '⚔️ Player Battle' : '🔄 Waiting for Opponent'}
                    </h3>
                    <p>Status: <span className={`status ${challenge.statuscode === StatusCodes.OPEN ? 'open' : 'completed'}`}>
                      {challenge.statuscode === StatusCodes.OPEN ? 'Open' : 'Completed'}
                    </span></p>
                    <p>Created: {challenge.createdon ? new Date(challenge.createdon).toLocaleString() : 'Unknown'}</p>
                    {challenge.modifiedon && challenge.modifiedon !== challenge.createdon && (
                      <p>Updated: {new Date(challenge.modifiedon).toLocaleString()}</p>
                    )}
                    {challenge.pokemon_winnercontact && (
                      <p>Winner: {challenge.pokemon_winnercontact === 'current-user-id' ? 'You!' : 'Opponent'}</p>
                    )}
                    <p>Your Pokémon: {challenge.pokemon_player1 === 'current-user-id' ? challenge.pokemon_player1pokemon : challenge.pokemon_player2pokemon}</p>
                    {challenge.pokemon_player2 && (
                      <p>Opponent Pokémon: {challenge.pokemon_player1 === 'current-user-id' ? challenge.pokemon_player2pokemon : challenge.pokemon_player1pokemon}</p>
                    )}
                  </div>
                  <div className="challenge-actions">
                    {challenge.statuscode === StatusCodes.COMPLETED && challenge.pokemon_battleresult && (
                      <button 
                        onClick={() => viewBattleResult(challenge)}
                        className="view-btn"
                      >
                        Watch Replay
                      </button>
                    )}
                    {challenge.statuscode === StatusCodes.OPEN && !challenge.pokemon_battleresult && (
                      <span className="battle-status">Battle in progress...</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Battle Replay View */}
      {viewMode === 'battle-replay' && battleResult && (
        <BattleReplay
          battleResult={battleResult}
          currentStep={currentStep}
          isReplaying={isReplaying}
          onNext={replayNextStep}
          onPrevious={replayPreviousStep}
          onAutoReplay={autoReplay}
          onClose={() => setViewMode('history')}
        />
      )}

      {/* Pokemon Selection Modal */}
      {showPokemonModal && (
        <div className="modal-overlay" onClick={closePokemonModal}>
          <div className="modal-content mobile-friendly" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Your Pokemon</h3>
              <button className="close-btn" onClick={closePokemonModal}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">Choose a Pokemon to accept this challenge:</p>
              
              {/* Convert and use user's actual Pokemon */}
              {(() => {
                const battlePokemon = convertToBattleArenaPokemon(userPokemon || []);
                
                if (battlePokemon.length === 0) {
                  return (
                    <div className="no-pokemon">
                      <div className="no-pokemon-icon">🔍</div>
                      <h4>No Pokemon Available</h4>
                      <p>You need to catch some Pokemon first!</p>
                      <p>Visit the <strong>Pokemon Browser</strong> or <strong>QR Scanner</strong> to add Pokemon to your collection.</p>
                    </div>
                  );
                }

                return (
                  <div className="pokemon-selection-grid">
                    {battlePokemon.map((pokemon) => (
                      <div 
                        key={pokemon.id}
                        className="pokemon-selection-card"
                        onClick={() => handlePokemonSelect(pokemon)}
                      >
                        <div className="pokemon-avatar">
                          <img 
                            src={pokemon.sprite}
                            alt={pokemon.name}
                            onError={(e) => {
                              e.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png`;
                            }}
                          />
                        </div>
                        <div className="pokemon-details">
                          <h4 className="pokemon-name">{pokemon.name}</h4>
                          <div className="pokemon-stats">
                            <span className="level-badge">Lv. {pokemon.level}</span>
                            <div className="hp-display">
                              <div className="hp-bar">
                                <div 
                                  className="hp-fill"
                                  style={{ width: `${(pokemon.hp / pokemon.maxHp) * 100}%` }}
                                ></div>
                              </div>
                              <span className="hp-text">{pokemon.hp}/{pokemon.maxHp}</span>
                            </div>
                          </div>
                          <div className="pokemon-combat-stats">
                            <span className="stat">⚔️ {pokemon.attack}</span>
                            <span className="stat">🛡️ {pokemon.defense}</span>
                            <span className="stat">⚡ {pokemon.speed}</span>
                          </div>
                          <div className="pokemon-types">
                            {pokemon.types.map((type, index) => (
                              <span key={index} className={`type-badge type-${type}`}>
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="selection-indicator">
                          <span className="select-text">Tap to Select</span>
                          <span className="arrow">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleArena;
