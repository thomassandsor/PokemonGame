// Mobile-friendly Battle Replay Component
import React from 'react';
import { BattleResult } from '../../services/battleChallengeService';
import { CompleteBattleData } from '../../types/battleTypes';

interface BattleReplayProps {
  battleResult: BattleResult;
  currentStep: number;
  isReplaying: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onAutoReplay: () => void;
  onClose: () => void;
}

const BattleReplay: React.FC<BattleReplayProps> = ({
  battleResult,
  currentStep,
  isReplaying,
  onNext,
  onPrevious,
  onAutoReplay,
  onClose
}) => {
  // Use the new battle data if available, otherwise fall back to legacy format
  const battleData = battleResult.completeBattleData;
  const isNewFormat = !!battleData;

  if (!isNewFormat) {
    // Legacy format fallback
    return (
      <div className="battle-replay legacy-format">
        <div className="replay-header">
          <h2>Battle Replay (Legacy)</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="legacy-content">
          <div className="winner-announcement">
            <h3>🏆 Winner: {battleResult.winner}</h3>
          </div>
          
          <div className="battle-log">
            <h4>Battle Log:</h4>
            <div className="log-entries">
              {battleResult.battleLog.map((entry, index) => (
                <div key={index} className="log-entry">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New mobile-friendly battle replay
  const totalTurns = battleData.battle_turns.length;
  const currentTurn = Math.min(currentStep, totalTurns);
  const currentTurnData = currentTurn > 0 ? battleData.battle_turns[currentTurn - 1] : null;
  
  // Get Pokemon data
  const player1Pokemon = battleData.pokemon_teams.player1_team[0];
  const player2Pokemon = battleData.pokemon_teams.player2_team[0];
  
  // Get current HP values
  const player1HP = currentTurnData ? currentTurnData.turn_result.player1_pokemon_hp : player1Pokemon.hp;
  const player2HP = currentTurnData ? currentTurnData.turn_result.player2_pokemon_hp : player2Pokemon.hp;

  return (
    <div className="battle-replay mobile-friendly">
      {/* Header */}
      <div className="replay-header">
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h2>Battle Replay</h2>
        <div className="turn-counter">
          Turn {currentTurn}/{totalTurns}
        </div>
      </div>

      {/* Battle Status */}
      <div className="battle-status">
        {currentTurn === 0 ? (
          <div className="battle-start">
            <h3>⚔️ Battle Beginning!</h3>
            <p>{battleData.metadata.player1_name} vs {battleData.metadata.player2_name}</p>
          </div>
        ) : currentTurn >= totalTurns ? (
          <div className="battle-end">
            <h3>🏆 {battleData.final_result.winner_name} Wins!</h3>
            <p>{battleData.final_result.battle_summary}</p>
          </div>
        ) : (
          <div className="turn-summary">
            <p className="turn-description">
              {currentTurnData?.turn_result.turn_summary}
            </p>
          </div>
        )}
      </div>

      {/* Pokemon Display */}
      <div className="pokemon-battle-display">
        {/* Player 1 Pokemon */}
        <div className="pokemon-side player1">
          <div className="pokemon-card battle-card">
            <div className="pokemon-image">
              <img 
                src={player1Pokemon.sprite_url}
                alt={player1Pokemon.name}
                className={player1HP <= 0 ? 'fainted' : ''}
              />
            </div>
            <div className="pokemon-info">
              <h4>{player1Pokemon.name}</h4>
              <p className="trainer-name">{battleData.metadata.player1_name}</p>
              <div className="hp-display">
                <div className="hp-bar">
                  <div 
                    className="hp-fill"
                    style={{ 
                      width: `${(player1HP / player1Pokemon.max_hp) * 100}%`,
                      backgroundColor: player1HP <= 0 ? '#dc3545' : player1HP < player1Pokemon.max_hp * 0.2 ? '#fd7e14' : '#28a745'
                    }}
                  />
                </div>
                <span className="hp-text">{player1HP}/{player1Pokemon.max_hp}</span>
              </div>
              <div className="level-badge">Lv. {player1Pokemon.level}</div>
            </div>
          </div>
        </div>

        {/* VS Indicator */}
        <div className="vs-indicator">
          <span className="vs-text">VS</span>
          {currentTurn > 0 && (
            <div className="action-display">
              <div className="action player1-action">
                {currentTurnData?.player1_action.action_description}
              </div>
              <div className="action player2-action">
                {currentTurnData?.player2_action.action_description}
              </div>
            </div>
          )}
        </div>

        {/* Player 2 Pokemon */}
        <div className="pokemon-side player2">
          <div className="pokemon-card battle-card">
            <div className="pokemon-image">
              <img 
                src={player2Pokemon.sprite_url}
                alt={player2Pokemon.name}
                className={player2HP <= 0 ? 'fainted' : ''}
              />
            </div>
            <div className="pokemon-info">
              <h4>{player2Pokemon.name}</h4>
              <p className="trainer-name">{battleData.metadata.player2_name}</p>
              <div className="hp-display">
                <div className="hp-bar">
                  <div 
                    className="hp-fill"
                    style={{ 
                      width: `${(player2HP / player2Pokemon.max_hp) * 100}%`,
                      backgroundColor: player2HP <= 0 ? '#dc3545' : player2HP < player2Pokemon.max_hp * 0.2 ? '#fd7e14' : '#28a745'
                    }}
                  />
                </div>
                <span className="hp-text">{player2HP}/{player2Pokemon.max_hp}</span>
              </div>
              <div className="level-badge">Lv. {player2Pokemon.level}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="replay-controls">
        <button 
          className="control-btn"
          onClick={onPrevious}
          disabled={currentStep <= 0}
        >
          ⏮️ Previous
        </button>
        
        <button 
          className={`control-btn auto-btn ${isReplaying ? 'active' : ''}`}
          onClick={onAutoReplay}
        >
          {isReplaying ? '⏸️ Pause' : '▶️ Auto Play'}
        </button>
        
        <button 
          className="control-btn"
          onClick={onNext}
          disabled={currentStep >= totalTurns}
        >
          Next ⏭️
        </button>
      </div>

      {/* Battle Log (Collapsible on Mobile) */}
      <details className="battle-log-section">
        <summary>📋 Battle Log</summary>
        <div className="battle-log">
          {battleData.battle_log.slice(0, currentStep * 2 + 2).map((entry, index) => (
            <div key={index} className="log-entry">
              {entry}
            </div>
          ))}
        </div>
      </details>

      {/* Battle Stats (Final Results) */}
      {currentTurn >= totalTurns && (
        <div className="final-stats">
          <h4>📊 Battle Statistics</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Duration:</span>
              <span className="stat-value">{battleData.metadata.duration_seconds}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Turns:</span>
              <span className="stat-value">{totalTurns}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Victory:</span>
              <span className="stat-value">{battleData.final_result.victory_condition}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Experience:</span>
              <span className="stat-value">+{battleData.final_result.rewards?.experience_gained || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleReplay;
