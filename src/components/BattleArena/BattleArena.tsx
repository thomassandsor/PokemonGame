import React, { useState, useEffect } from 'react';
import { Pokemon } from '../../types/pokemon';
import { UserPokemon, battleService, BattleResult, WildPokemon } from '../../services/battleService';
import pokemonData from '../../data/pokemon.json';
import './BattleArena.css';

interface BattleArenaProps {
  userPokemon: UserPokemon[];
  onPokemonUpdate: (updatedPokemon: UserPokemon) => void;
  onEvolutionAvailable: (pokemon: UserPokemon, evolutionOptions: any[]) => void;
}

const BattleArena: React.FC<BattleArenaProps> = ({
  userPokemon,
  onPokemonUpdate,
  onEvolutionAvailable
}) => {
  const [allPokemon] = useState<Pokemon[]>(pokemonData as Pokemon[]);
  const [selectedPokemon, setSelectedPokemon] = useState<UserPokemon | null>(null);
  const [wildPokemon, setWildPokemon] = useState<{ pokemon: Pokemon; wild: WildPokemon } | null>(null);
  const [battleInProgress, setBattleInProgress] = useState(false);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);

  useEffect(() => {
    // Auto-select first Pokemon if available
    if (userPokemon.length > 0 && !selectedPokemon) {
      setSelectedPokemon(userPokemon[0]);
    }
  }, [userPokemon, selectedPokemon]);

  const findWildPokemon = () => {
    const encounter = battleService.getRandomWildPokemon(allPokemon);
    setWildPokemon(encounter);
    setBattleResult(null);
    setBattleLog([`A wild ${encounter.pokemon.name} appears!`]);
  };

  const startBattle = async () => {
    if (!selectedPokemon || !wildPokemon) return;

    setBattleInProgress(true);
    setBattleLog(prev => [...prev, `${selectedPokemon.nickname || getSelectedPokemonData()?.name}, I choose you!`]);

    // Simulate battle delay for effect
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const result = battleService.simulateBattle(selectedPokemon, wildPokemon.wild, allPokemon);
      setBattleResult(result);

      const logMessages = [
        `${selectedPokemon.nickname || getSelectedPokemonData()?.name} ${result.won ? 'wins' : 'loses'} the battle!`,
        `Gained ${result.experienceGained} experience points!`
      ];

      if (result.newLevel) {
        logMessages.push(`${selectedPokemon.nickname || getSelectedPokemonData()?.name} leveled up to level ${result.newLevel}!`);
      }

      if (result.canEvolve && result.evolutionOptions) {
        logMessages.push(`${selectedPokemon.nickname || getSelectedPokemonData()?.name} can evolve!`);
      }

      setBattleLog(prev => [...prev, ...logMessages]);

      // Update Pokemon stats
      const updatedPokemon = await battleService.updatePokemonAfterBattle(selectedPokemon, result, allPokemon);
      setSelectedPokemon(updatedPokemon);
      onPokemonUpdate(updatedPokemon);

      // Trigger evolution if available
      if (result.canEvolve && result.evolutionOptions) {
        onEvolutionAvailable(updatedPokemon, result.evolutionOptions);
      }

    } catch (error) {
      console.error('Battle error:', error);
      setBattleLog(prev => [...prev, 'Battle encountered an error!']);
    } finally {
      setBattleInProgress(false);
    }
  };

  const getSelectedPokemonData = (): Pokemon | undefined => {
    return selectedPokemon ? allPokemon.find(p => p.id === selectedPokemon.pokemonId) : undefined;
  };

  const getWildPokemonData = (): Pokemon | undefined => {
    return wildPokemon ? wildPokemon.pokemon : undefined;
  };

  const calculateHealthPercentage = (current: number, max: number): number => {
    return Math.max(0, Math.min(100, (current / max) * 100));
  };

  const getHealthBarColor = (percentage: number): string => {
    if (percentage > 50) return '#10b981';
    if (percentage > 25) return '#f59e0b';
    return '#ef4444';
  };

  const selectedData = getSelectedPokemonData();
  const wildData = getWildPokemonData();

  if (userPokemon.length === 0) {
    return (
      <div className="battle-arena">
        <div className="no-pokemon">
          <h3>No Pokémon Available</h3>
          <p>You need to catch some Pokémon before you can battle!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="battle-arena">
      <div className="arena-header">
        <h2>Battle Arena</h2>
        <p>Train your Pokémon in epic battles!</p>
      </div>

      <div className="pokemon-selection">
        <h3>Choose Your Pokémon</h3>
        <div className="pokemon-selector">
          {userPokemon.map(pokemon => {
            const pokemonData = allPokemon.find(p => p.id === pokemon.pokemonId);
            return (
              <div
                key={pokemon.id}
                className={`selectable-pokemon ${selectedPokemon?.id === pokemon.id ? 'selected' : ''}`}
                onClick={() => setSelectedPokemon(pokemon)}
              >
                <img
                  src={pokemonData?.sprites.front_default || ''}
                  alt={pokemonData?.name}
                />
                <div className="pokemon-info">
                  <div className="pokemon-name">
                    {pokemon.nickname || pokemonData?.name}
                  </div>
                  <div className="pokemon-level">Level {pokemon.level}</div>
                  <div className="pokemon-stats">
                    <div className="stat-summary">
                      HP: {pokemon.currentStats.hp} | ATK: {pokemon.currentStats.attack}
                    </div>
                    <div className="experience-bar">
                      <div 
                        className="exp-fill"
                        style={{ width: `${(pokemon.experience % 100)}%` }}
                      />
                      <span className="exp-text">
                        {pokemon.experience % 100}/100 XP to next level
                      </span>
                    </div>
                  </div>
                  <div className="battle-record">
                    W: {pokemon.battleStats.wins} | L: {pokemon.battleStats.losses}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="battle-controls">
        <button
          onClick={findWildPokemon}
          className="find-pokemon-btn"
          disabled={battleInProgress}
        >
          {wildPokemon ? 'Find Another Pokémon' : 'Find Wild Pokémon'}
        </button>

        {wildPokemon && selectedPokemon && (
          <button
            onClick={startBattle}
            className="battle-btn"
            disabled={battleInProgress}
          >
            {battleInProgress ? 'Battling...' : 'Start Battle!'}
          </button>
        )}
      </div>

      {wildPokemon && (
        <div className="battle-field">
          <div className="battle-participants">
            <div className="your-pokemon">
              <div className="pokemon-display">
                <h4>Your Pokémon</h4>
                <div className="pokemon-card">
                  <img
                    src={selectedData?.sprites.front_default || ''}
                    alt={selectedData?.name}
                    className="pokemon-sprite"
                  />
                  <div className="pokemon-details">
                    <div className="name-level">
                      {selectedPokemon?.nickname || selectedData?.name} (Level {selectedPokemon?.level})
                    </div>
                    <div className="health-bar">
                      <div 
                        className="health-fill"
                        style={{ 
                          width: `${calculateHealthPercentage(selectedPokemon?.currentStats.hp || 0, selectedPokemon?.currentStats.hp || 1)}%`,
                          backgroundColor: getHealthBarColor(100)
                        }}
                      />
                      <span className="health-text">
                        {selectedPokemon?.currentStats.hp}/{selectedPokemon?.currentStats.hp} HP
                      </span>
                    </div>
                    <div className="types">
                      {selectedData?.types.map(type => (
                        <span key={type} className={`type-badge type-${type}`}>
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="vs-indicator">
              <span>VS</span>
            </div>

            <div className="wild-pokemon">
              <div className="pokemon-display">
                <h4>Wild Pokémon</h4>
                <div className="pokemon-card">
                  <img
                    src={wildData?.sprites.front_default || ''}
                    alt={wildData?.name}
                    className="pokemon-sprite"
                  />
                  <div className="pokemon-details">
                    <div className="name-level">
                      {wildData?.name} (Level {wildPokemon.wild.level})
                    </div>
                    <div className="health-bar">
                      <div 
                        className="health-fill"
                        style={{ 
                          width: `${calculateHealthPercentage(wildPokemon.wild.stats.hp, wildPokemon.wild.stats.hp)}%`,
                          backgroundColor: getHealthBarColor(100)
                        }}
                      />
                      <span className="health-text">
                        {wildPokemon.wild.stats.hp}/{wildPokemon.wild.stats.hp} HP
                      </span>
                    </div>
                    <div className="types">
                      {wildData?.types.map(type => (
                        <span key={type} className={`type-badge type-${type}`}>
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {battleResult && (
            <div className={`battle-result ${battleResult.won ? 'victory' : 'defeat'}`}>
              <h3>{battleResult.won ? '🎉 Victory!' : '😞 Defeat'}</h3>
              <div className="result-details">
                <p>Experience Gained: +{battleResult.experienceGained}</p>
                {battleResult.newLevel && (
                  <p className="level-up">Level Up! Now Level {battleResult.newLevel}!</p>
                )}
                {battleResult.canEvolve && (
                  <p className="evolution-ready">Your Pokémon can evolve!</p>
                )}
              </div>
            </div>
          )}

          <div className="battle-log">
            <h4>Battle Log</h4>
            <div className="log-messages">
              {battleLog.map((message, index) => (
                <div key={index} className="log-message">
                  {message}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleArena;
