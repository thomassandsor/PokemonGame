import React, { useState } from 'react';
import './BattleArena.css';

interface BattleArenaPokemon {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  types: string[];
  sprite: string;
}

interface BattleArenaProps {
  userPokemon: any[];
  onPokemonUpdate: (pokemon: any) => void;
  onEvolutionAvailable: (pokemon: any, options: any[]) => void;
}

const BattleArena: React.FC<BattleArenaProps> = ({
  userPokemon,
  onPokemonUpdate,
  onEvolutionAvailable
}) => {
  const [selectedPokemon, setSelectedPokemon] = useState<BattleArenaPokemon | null>(null);
  const [opponent, setOpponent] = useState<BattleArenaPokemon | null>(null);
  const [battleInProgress, setBattleInProgress] = useState(false);
  const [battleLog, setBattleLog] = useState<string[]>([]);

  // Mock opponent Pokemon
  const mockOpponents: BattleArenaPokemon[] = [
    {
      id: '1',
      name: 'Wild Pikachu',
      level: 5,
      hp: 35,
      maxHp: 35,
      attack: 55,
      defense: 40,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
    },
    {
      id: '2',
      name: 'Wild Charmander',
      level: 5,
      hp: 39,
      maxHp: 39,
      attack: 52,
      defense: 43,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png'
    },
    {
      id: '3',
      name: 'Wild Squirtle',
      level: 5,
      hp: 44,
      maxHp: 44,
      attack: 48,
      defense: 65,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png'
    }
  ];

  const startBattle = (opponentPokemon: BattleArenaPokemon) => {
    if (!selectedPokemon) {
      alert('Please select a Pokemon first!');
      return;
    }

    setOpponent(opponentPokemon);
    setBattleInProgress(true);
    setBattleLog([`Battle started! ${selectedPokemon.name} vs ${opponentPokemon.name}!`]);
  };

  const attack = () => {
    if (!selectedPokemon || !opponent || !battleInProgress) return;

    // Simple battle calculation
    const damage = Math.max(1, Math.floor((selectedPokemon.attack - opponent.defense) * 0.4));
    const newOpponentHp = Math.max(0, opponent.hp - damage);
    
    const updatedOpponent = { ...opponent, hp: newOpponentHp };
    setOpponent(updatedOpponent);
    
    const newLog = [...battleLog, `${selectedPokemon.name} attacks for ${damage} damage!`];
    
    if (newOpponentHp <= 0) {
      newLog.push(`${opponent.name} fainted! You win!`);
      setBattleInProgress(false);
      setBattleLog(newLog);
      return;
    }

    // Opponent attacks back
    const opponentDamage = Math.max(1, Math.floor((opponent.attack - selectedPokemon.defense) * 0.4));
    const newPlayerHp = Math.max(0, selectedPokemon.hp - opponentDamage);
    
    const updatedPlayer = { ...selectedPokemon, hp: newPlayerHp };
    setSelectedPokemon(updatedPlayer);
    
    newLog.push(`${opponent.name} attacks for ${opponentDamage} damage!`);
    
    if (newPlayerHp <= 0) {
      newLog.push(`${selectedPokemon.name} fainted! You lose!`);
      setBattleInProgress(false);
    }
    
    setBattleLog(newLog);
  };

  const resetBattle = () => {
    setBattleInProgress(false);
    setOpponent(null);
    setBattleLog([]);
    if (selectedPokemon) {
      setSelectedPokemon({ ...selectedPokemon, hp: selectedPokemon.maxHp });
    }
  };

  return (
    <div className="battle-arena">
      <div className="arena-header">
        <h1>Battle Arena</h1>
        <p>Challenge wild Pokemon to battle!</p>
      </div>

      {!battleInProgress && (
        <div className="pokemon-selection">
          <h2>Select Your Pokemon</h2>
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!battleInProgress && selectedPokemon && (
        <div className="opponent-selection">
          <h2>Choose Your Opponent</h2>
          <div className="opponent-grid">
            {mockOpponents.map(opponent => (
              <div 
                key={opponent.id}
                className="opponent-card"
                onClick={() => startBattle(opponent)}
              >
                <img src={opponent.sprite} alt={opponent.name} />
                <h3>{opponent.name}</h3>
                <p>Level {opponent.level}</p>
                <div className="types">
                  {opponent.types.map(type => (
                    <span key={type} className={`type-badge type-${type}`}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {battleInProgress && selectedPokemon && opponent && (
        <div className="battle-field">
          <div className="battle-display">
            <div className="pokemon-battle-card player">
              <img src={selectedPokemon.sprite} alt={selectedPokemon.name} />
              <h3>{selectedPokemon.name}</h3>
              <div className="hp-bar">
                <div 
                  className="hp-fill"
                  style={{ width: `${(selectedPokemon.hp / selectedPokemon.maxHp) * 100}%` }}
                ></div>
              </div>
              <p>{selectedPokemon.hp}/{selectedPokemon.maxHp} HP</p>
            </div>
            
            <div className="vs-indicator">VS</div>
            
            <div className="pokemon-battle-card opponent">
              <img src={opponent.sprite} alt={opponent.name} />
              <h3>{opponent.name}</h3>
              <div className="hp-bar">
                <div 
                  className="hp-fill"
                  style={{ width: `${(opponent.hp / opponent.maxHp) * 100}%` }}
                ></div>
              </div>
              <p>{opponent.hp}/{opponent.maxHp} HP</p>
            </div>
          </div>

          <div className="battle-controls">
            <button 
              onClick={attack} 
              disabled={!battleInProgress}
              className="attack-button"
            >
              Attack
            </button>
            <button onClick={resetBattle} className="reset-button">
              Reset Battle
            </button>
          </div>
        </div>
      )}

      {battleLog.length > 0 && (
        <div className="battle-log">
          <h3>Battle Log</h3>
          <div className="log-entries">
            {battleLog.map((entry, index) => (
              <p key={index}>{entry}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleArena;
