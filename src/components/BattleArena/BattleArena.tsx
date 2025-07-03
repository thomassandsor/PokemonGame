import React, { useState, useEffect } from 'react';
import { BattleChallengeService, PokemonBattle, PokemonBattleExpanded, BattleResult } from '../../services/battleChallengeService';
import { StatusCodes, ChallengeTypes } from '../../constants/dataverseMappings';
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
  const [selectedChallenge, setSelectedChallenge] = useState<PokemonBattle | null>(null);
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
        setSelectedChallenge(challenge);
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
        <div className="battle-replay">
          <div className="replay-header">
            <button onClick={() => setViewMode('history')} className="back-btn">
              ← Back to History
            </button>
            <h2>Battle Replay</h2>
            <div className="replay-controls">
              <button onClick={replayPreviousStep} disabled={currentStep === 0}>
                ← Previous
              </button>
              <button onClick={autoReplay} disabled={isReplaying}>
                ▶ Auto Replay
              </button>
              <button onClick={replayNextStep} disabled={currentStep >= battleResult.battleSteps.length}>
                Next →
              </button>
            </div>
          </div>

          {/* Battle Field */}
          <div className="battle-field replay">
            <div className="battle-display">
              <div className="pokemon-battle-card player">
                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${battleResult.players.player1.pokemon.id}.png`} 
                     alt={battleResult.players.player1.pokemon.name} />
                <h3>{battleResult.players.player1.pokemon.name}</h3>
                <div className="hp-bar">
                  <div 
                    className="hp-fill"
                    style={{ 
                      width: `${currentStep > 0 && battleResult.battleSteps[currentStep - 1] 
                        ? (battleResult.battleSteps[currentStep - 1].attackerHpRemaining / battleResult.players.player1.pokemon.maxHp) * 100
                        : 100}%` 
                    }}
                  ></div>
                </div>
                <p>Level {battleResult.players.player1.pokemon.level}</p>
              </div>
              
              <div className="vs-indicator">VS</div>
              
              <div className="pokemon-battle-card opponent">
                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${battleResult.players.player2.pokemon.id}.png`} 
                     alt={battleResult.players.player2.pokemon.name} />
                <h3>{battleResult.players.player2.pokemon.name}</h3>
                <div className="hp-bar">
                  <div 
                    className="hp-fill"
                    style={{ 
                      width: `${currentStep > 0 && battleResult.battleSteps[currentStep - 1] 
                        ? (battleResult.battleSteps[currentStep - 1].defenderHpRemaining / battleResult.players.player2.pokemon.maxHp) * 100
                        : 100}%` 
                    }}
                  ></div>
                </div>
                <p>Level {battleResult.players.player2.pokemon.level}</p>
              </div>
            </div>

            {/* Current Step Info */}
            <div className="step-info">
              <p>Step {currentStep} of {battleResult.battleSteps.length}</p>
              {currentStep > 0 && battleResult.battleSteps[currentStep - 1] && (
                <div className="step-details">
                  <p className="step-message">{battleResult.battleSteps[currentStep - 1].message}</p>
                  <p>Damage: {battleResult.battleSteps[currentStep - 1].damage}</p>
                  {battleResult.battleSteps[currentStep - 1].critical && (
                    <p className="critical">Critical Hit!</p>
                  )}
                </div>
              )}
            </div>

            {/* Battle Summary */}
            {currentStep >= battleResult.battleSteps.length && (
              <div className="battle-summary">
                <h3>Battle Complete!</h3>
                <p>Winner: {battleResult.result.winner === 'player1' ? battleResult.players.player1.pokemon.name : battleResult.players.player2.pokemon.name}</p>
                <p>Total Turns: {battleResult.result.totalTurns}</p>
                <p>Duration: {battleResult.result.battleDuration}</p>
                <p>Experience Gained: Player 1: {battleResult.result.experienceGained.player1}, Player 2: {battleResult.result.experienceGained.player2}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pokemon Selection Modal */}
      {showPokemonModal && (
        <div className="modal-overlay" onClick={closePokemonModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Your Pokemon</h3>
              <button className="close-btn" onClick={closePokemonModal}>×</button>
            </div>
            <div className="modal-body">
              <p>Choose a Pokemon to accept this challenge:</p>
              <div className="pokemon-grid">
                {userPokemon && userPokemon.length > 0 ? (
                  userPokemon.map((pokemon) => (
                    <div 
                      key={pokemon.pokemon_pokedexid}
                      className="pokemon-card selectable"
                      onClick={() => handlePokemonSelect({
                        id: pokemon.pokemon_pokedexid,
                        name: pokemon.pokemon_nickname || pokemon.pokemon_Pokemon?.pokemon_name || 'Unknown',
                        level: pokemon.pokemon_level || 1,
                        hp: pokemon.pokemon_current_hp || 100,
                        maxHp: pokemon.pokemon_max_hp || 100,
                        attack: 50, // Default values - can be enhanced later
                        defense: 50,
                        speed: 50,
                        types: ['normal'], // Can be enhanced later
                        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemon_Pokemon?.pokemon_id || 1}.png`
                      })}
                    >
                      <div className="pokemon-image">
                        <img 
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemon_Pokemon?.pokemon_id || 1}.png`}
                          alt={pokemon.pokemon_nickname || pokemon.pokemon_Pokemon?.pokemon_name || 'Unknown'}
                          onError={(e) => {
                            e.currentTarget.src = '/pokemon-placeholder.png';
                          }}
                        />
                      </div>
                      <div className="pokemon-info">
                        <h4>{pokemon.pokemon_nickname || pokemon.pokemon_Pokemon?.pokemon_name || 'Unknown'}</h4>
                        <p>Level {pokemon.pokemon_level || 1}</p>
                        <div className="hp-bar">
                          <div 
                            className="hp-fill"
                            style={{ width: `${((pokemon.pokemon_current_hp || 100) / (pokemon.pokemon_max_hp || 100)) * 100}%` }}
                          ></div>
                        </div>
                        <p>HP: {pokemon.pokemon_current_hp || 100}/{pokemon.pokemon_max_hp || 100}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-pokemon">
                    <p>No Pokemon available for battle!</p>
                    <p>Visit the QR Scanner to catch some Pokemon first.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleArena;
