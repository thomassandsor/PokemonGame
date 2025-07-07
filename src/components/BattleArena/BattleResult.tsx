import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BattleChallengeService } from '../../services/battleChallengeService';
import { CompleteBattleData } from '../../types/battleTypes';
import '../../styles/PokemonCard.css';
import './BattleResult.css';

interface BattleResultProps {}

const BattleResult: React.FC<BattleResultProps> = () => {
  const navigate = useNavigate();
  const { battleId } = useParams<{ battleId: string }>();
  
  const [battleData, setBattleData] = useState<CompleteBattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  useEffect(() => {
    loadBattleResult();
  }, [battleId]);

  const loadBattleResult = async () => {
    if (!battleId) {
      setError('No battle ID provided');
      setLoading(false);
      return;
    }

    try {
      const result = await BattleChallengeService.getBattleResult(battleId);
      
      if (result && result.completeBattleData) {
        setBattleData(result.completeBattleData);
      } else {
        setError('Battle result not found or battle not completed yet');
      }
    } catch (err) {
      setError('Failed to load battle result');
      console.error('Error loading battle result:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSpeedDelay = (): number => {
    switch (playbackSpeed) {
      case 'slow': return 3000;
      case 'fast': return 500;
      default: return 1500;
    }
  };

  const playBattle = () => {
    if (!battleData || isPlaying) return;
    
    setIsPlaying(true);
    setCurrentTurn(0);
    
    const playTurn = (turnIndex: number) => {
      if (turnIndex >= battleData.battle_turns.length) {
        setIsPlaying(false);
        return;
      }
      
      setCurrentTurn(turnIndex);
      
      setTimeout(() => {
        if (isPlaying) {
          playTurn(turnIndex + 1);
        }
      }, getSpeedDelay());
    };
    
    playTurn(0);
  };

  const stopBattle = () => {
    setIsPlaying(false);
  };

  const skipToEnd = () => {
    if (!battleData) return;
    setCurrentTurn(battleData.battle_turns.length - 1);
    setIsPlaying(false);
  };

  const skipToBeginning = () => {
    setCurrentTurn(0);
    setIsPlaying(false);
  };

  const getPokemonSprite = (pokemonId: number): string => {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
  };

  if (loading) {
    return (
      <div className="pokemon-page-container">
        <div className="pokemon-loading-container">
          <div className="pokeball-spinner"></div>
          <p>Loading battle result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pokemon-page-container">
        <div className="pokemon-error-container">
          <h2>⚠️ Battle Result Not Available</h2>
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

  if (!battleData) {
    return (
      <div className="pokemon-page-container">
        <div className="pokemon-error-container">
          <h2>📄 No Battle Data</h2>
          <p>No battle data available for this battle.</p>
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

  const currentBattleTurn = battleData.battle_turns[currentTurn];
  const player1Pokemon = battleData.pokemon_teams.player1_team[0];
  const player2Pokemon = battleData.pokemon_teams.player2_team[0];
  
  // Get current HP from battle state
  const currentP1HP = currentBattleTurn?.battlefield_state.player1_active_pokemon.hp ?? player1Pokemon.hp;
  const currentP2HP = currentBattleTurn?.battlefield_state.player2_active_pokemon.hp ?? player2Pokemon.hp;

  return (
    <div className="pokemon-page-container">
      <div className="pokemon-page-header">
        <h1>⚔️ Battle Result</h1>
        <p>
          {battleData.metadata.player1_name} vs {battleData.metadata.player2_name} • 
          Winner: <strong>{battleData.final_result.winner_name}</strong>
        </p>
      </div>

      {/* Battle Replay Area */}
      <div className="battle-replay-container">
        <div className="battle-arena">
          <div className="battle-pokemon-side">
            <h3>{battleData.metadata.player1_name}</h3>
            <div className="battle-pokemon-display">
              <img 
                src={getPokemonSprite(player1Pokemon.pokemon_id)}
                alt={player1Pokemon.name}
                className={`pokemon-sprite ${currentP1HP <= 0 ? 'fainted' : ''}`}
              />
              <div className="pokemon-info">
                <div className="pokemon-name">{player1Pokemon.name}</div>
                <div className="pokemon-level">Level {player1Pokemon.level}</div>
                <div className="hp-display">
                  <div className="hp-bar">
                    <div 
                      className="hp-fill"
                      style={{ width: `${(currentP1HP / player1Pokemon.max_hp) * 100}%` }}
                    ></div>
                  </div>
                  <span>{currentP1HP}/{player1Pokemon.max_hp} HP</span>
                </div>
              </div>
            </div>
          </div>

          <div className="battle-vs">
            <div className="vs-indicator">
              <span>VS</span>
            </div>
          </div>

          <div className="battle-pokemon-side">
            <h3>{battleData.metadata.player2_name}</h3>
            <div className="battle-pokemon-display">
              <img 
                src={getPokemonSprite(player2Pokemon.pokemon_id)}
                alt={player2Pokemon.name}
                className={`pokemon-sprite ${currentP2HP <= 0 ? 'fainted' : ''}`}
              />
              <div className="pokemon-info">
                <div className="pokemon-name">{player2Pokemon.name}</div>
                <div className="pokemon-level">Level {player2Pokemon.level}</div>
                <div className="hp-display">
                  <div className="hp-bar">
                    <div 
                      className="hp-fill"
                      style={{ width: `${(currentP2HP / player2Pokemon.max_hp) * 100}%` }}
                    ></div>
                  </div>
                  <span>{currentP2HP}/{player2Pokemon.max_hp} HP</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Battle Commentary */}
        <div className="battle-commentary">
          <h4>Turn {currentTurn + 1} of {battleData.battle_turns.length}</h4>
          {currentBattleTurn && (
            <div className="turn-actions">
              <p><strong>{currentBattleTurn.player1_action.action_description}</strong></p>
              <p><strong>{currentBattleTurn.player2_action.action_description}</strong></p>
              <p className="turn-summary">{currentBattleTurn.turn_result.turn_summary}</p>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="playback-controls">
          <div className="control-buttons">
            <button 
              className="btn btn-secondary"
              onClick={skipToBeginning}
              disabled={isPlaying}
            >
              ⏮️ Start
            </button>
            
            {!isPlaying ? (
              <button 
                className="btn btn-primary"
                onClick={playBattle}
              >
                ▶️ Play Battle
              </button>
            ) : (
              <button 
                className="btn btn-secondary"
                onClick={stopBattle}
              >
                ⏸️ Pause
              </button>
            )}
            
            <button 
              className="btn btn-secondary"
              onClick={skipToEnd}
              disabled={isPlaying}
            >
              ⏭️ End
            </button>
          </div>

          <div className="speed-controls">
            <label>Speed: </label>
            <select 
              value={playbackSpeed} 
              onChange={(e) => setPlaybackSpeed(e.target.value as any)}
              disabled={isPlaying}
            >
              <option value="slow">🐌 Slow</option>
              <option value="normal">⚡ Normal</option>
              <option value="fast">🚀 Fast</option>
            </select>
          </div>

          <div className="turn-scrubber">
            <input
              type="range"
              min="0"
              max={battleData.battle_turns.length - 1}
              value={currentTurn}
              onChange={(e) => setCurrentTurn(parseInt(e.target.value))}
              disabled={isPlaying}
              className="turn-slider"
            />
            <span>{currentTurn + 1} / {battleData.battle_turns.length}</span>
          </div>
        </div>

        {/* Battle Summary */}
        <div className="battle-summary">
          <h3>🏆 Battle Summary</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <strong>Winner:</strong> {battleData.final_result.winner_name}
            </div>
            <div className="stat-item">
              <strong>Total Turns:</strong> {battleData.battle_turns.length}
            </div>
            <div className="stat-item">
              <strong>Duration:</strong> {battleData.metadata.duration_seconds} seconds
            </div>
            <div className="stat-item">
              <strong>Victory Condition:</strong> {battleData.final_result.victory_condition}
            </div>
          </div>
        </div>

        <div className="result-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/battle-arena')}
          >
            ← Back to Battle Arena
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/my-page')}
          >
            View My Pokemon
          </button>
        </div>
      </div>
    </div>
  );
};

export default BattleResult;
