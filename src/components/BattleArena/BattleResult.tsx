import React, { useState, useEffect, useCallback } from 'react';
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

  const loadBattleResult = useCallback(async () => {
    if (!battleId) {
      setError('No battle ID provided');
      setLoading(false);
      return;
    }

    try {
      const result = await BattleChallengeService.getBattleResult(battleId);
      
      if (result) {
        // Result is now directly CompleteBattleData, not wrapped in BattleResult
        setBattleData(result);
      } else {
        setError('Battle result not found or battle not completed yet');
      }
    } catch (err) {
      setError('Failed to load battle result');
      console.error('Error loading battle result:', err);
    } finally {
      setLoading(false);
    }
  }, [battleId]);

  useEffect(() => {
    loadBattleResult();
  }, [loadBattleResult]);

  const nextTurn = () => {
    if (!battleData) return;
    setCurrentTurn(prev => Math.min(prev + 1, battleData.battle_turns.length - 1));
  };

  const previousTurn = () => {
    setCurrentTurn(prev => Math.max(prev - 1, 0));
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

      {/* Compact Battle Display */}
      <div className="battle-replay-container">
        <div className="compact-battle-arena">
          <div className="trainer-pokemon">
            <div className="trainer-name">{battleData.metadata.player1_name}</div>
            <div className="pokemon-compact">
              <img 
                src={getPokemonSprite(player1Pokemon.pokemon_id)}
                alt={player1Pokemon.name}
                className={`pokemon-sprite-small ${currentP1HP <= 0 ? 'fainted' : ''}`}
              />
              <div className="pokemon-compact-info">
                <div className="pokemon-name-small">{player1Pokemon.name} (Lv.{player1Pokemon.level})</div>
                <div className="hp-bar-small">
                  <div 
                    className="hp-fill-small"
                    style={{ width: `${(currentP1HP / player1Pokemon.max_hp) * 100}%` }}
                  ></div>
                </div>
                <div className="hp-text-small">{currentP1HP}/{player1Pokemon.max_hp}</div>
              </div>
            </div>
          </div>

          <div className="vs-divider">
            <span>VS</span>
          </div>

          <div className="trainer-pokemon">
            <div className="trainer-name">{battleData.metadata.player2_name}</div>
            <div className="pokemon-compact">
              <img 
                src={getPokemonSprite(player2Pokemon.pokemon_id)}
                alt={player2Pokemon.name}
                className={`pokemon-sprite-small ${currentP2HP <= 0 ? 'fainted' : ''}`}
              />
              <div className="pokemon-compact-info">
                <div className="pokemon-name-small">{player2Pokemon.name} (Lv.{player2Pokemon.level})</div>
                <div className="hp-bar-small">
                  <div 
                    className="hp-fill-small"
                    style={{ width: `${(currentP2HP / player2Pokemon.max_hp) * 100}%` }}
                  ></div>
                </div>
                <div className="hp-text-small">{currentP2HP}/{player2Pokemon.max_hp}</div>
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

        {/* Battle Navigation */}
        <div className="battle-navigation">
          <button 
            className="btn btn-secondary"
            onClick={previousTurn}
            disabled={currentTurn === 0}
          >
            ← Previous Turn
          </button>
          
          <div className="turn-counter">
            <span>Turn {currentTurn + 1} of {battleData.battle_turns.length}</span>
          </div>
          
          <button 
            className="btn btn-secondary"
            onClick={nextTurn}
            disabled={currentTurn === battleData.battle_turns.length - 1}
          >
            Next Turn →
          </button>
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
