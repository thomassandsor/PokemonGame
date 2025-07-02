import React, { useState } from 'react';
import './EvolutionLab.css';

interface EvolutionLabProps {
  userPokemon: any[];
  onPokemonUpdate: (pokemon: any) => void;
}

interface EvolutionOption {
  id: number;
  name: string;
  sprite: string;
  requiredLevel?: number;
  requiredItem?: string;
  method: string;
}

const EvolutionLab: React.FC<EvolutionLabProps> = ({ userPokemon, onPokemonUpdate }) => {
  const [selectedPokemon, setSelectedPokemon] = useState<any>(null);
  const [evolutionOptions, setEvolutionOptions] = useState<EvolutionOption[]>([]);
  const [isEvolving, setIsEvolving] = useState(false);

  // Mock evolution data - in a real app this would come from an API
  const evolutionMap: { [key: number]: EvolutionOption[] } = {
    1: [{ // Bulbasaur
      id: 2,
      name: 'Ivysaur',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png',
      requiredLevel: 16,
      method: 'Level up to 16'
    }],
    4: [{ // Charmander
      id: 5,
      name: 'Charmeleon',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png',
      requiredLevel: 16,
      method: 'Level up to 16'
    }],
    7: [{ // Squirtle
      id: 8,
      name: 'Wartortle',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/8.png',
      requiredLevel: 16,
      method: 'Level up to 16'
    }],
    25: [{ // Pikachu
      id: 26,
      name: 'Raichu',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png',
      requiredItem: 'Thunder Stone',
      method: 'Use Thunder Stone'
    }],
    // Add more evolution mappings as needed
  };

  const selectPokemon = (pokemon: any) => {
    setSelectedPokemon(pokemon);
    const pokemonId = pokemon.id || pokemon.pokemon_id || pokemon.pokemon_number;
    const evolutions = evolutionMap[pokemonId] || [];
    setEvolutionOptions(evolutions);
  };

  const canEvolve = (evolution: EvolutionOption): boolean => {
    if (!selectedPokemon) return false;
    
    const pokemonLevel = selectedPokemon.level || 5;
    
    if (evolution.requiredLevel && pokemonLevel < evolution.requiredLevel) {
      return false;
    }
    
    // In a real app, you'd check for required items in the user's inventory
    if (evolution.requiredItem) {
      // For demo purposes, let's assume they have the item
      return true;
    }
    
    return true;
  };

  const evolvePokemon = async (evolution: EvolutionOption) => {
    if (!selectedPokemon || !canEvolve(evolution)) return;
    
    setIsEvolving(true);
    
    // Simulate evolution process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const evolvedPokemon = {
      ...selectedPokemon,
      id: evolution.id,
      name: evolution.name,
      pokemon_id: evolution.id,
      pokemon_name: evolution.name,
      sprite: evolution.sprite,
      // Increase stats on evolution
      attack: (selectedPokemon.attack || 50) + 10,
      defense: (selectedPokemon.defense || 50) + 10,
      hp: (selectedPokemon.hp || 50) + 15,
      maxHp: (selectedPokemon.maxHp || 50) + 15
    };
    
    onPokemonUpdate(evolvedPokemon);
    setSelectedPokemon(evolvedPokemon);
    setEvolutionOptions([]);
    setIsEvolving(false);
    
    alert(`${selectedPokemon.name} evolved into ${evolution.name}!`);
  };

  return (
    <div className="evolution-lab">
      <div className="lab-header">
        <h1>Evolution Lab</h1>
        <p>Help your Pokemon reach their full potential!</p>
      </div>

      <div className="lab-content">
        <div className="pokemon-selection">
          <h2>Select a Pokemon to Evolve</h2>
          {userPokemon.length === 0 ? (
            <div className="no-pokemon">
              <p>You don't have any Pokemon yet!</p>
              <p>Visit the Pokemon Browser to discover Pokemon first.</p>
            </div>
          ) : (
            <div className="pokemon-grid">
              {userPokemon.map((pokemon, index) => {
                const pokemonId = pokemon.id || pokemon.pokemon_id || pokemon.pokemon_number;
                const hasEvolutions = evolutionMap[pokemonId]?.length > 0;
                
                return (
                  <div 
                    key={index}
                    className={`pokemon-card ${selectedPokemon === pokemon ? 'selected' : ''} ${!hasEvolutions ? 'no-evolution' : ''}`}
                    onClick={() => selectPokemon(pokemon)}
                  >
                    <img 
                      src={pokemon.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`} 
                      alt={pokemon.name || pokemon.pokemon_name} 
                    />
                    <h3>{pokemon.name || pokemon.pokemon_name}</h3>
                    <p>Level {pokemon.level || 5}</p>
                    {!hasEvolutions && (
                      <div className="no-evolution-indicator">
                        Cannot evolve
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedPokemon && evolutionOptions.length > 0 && (
          <div className="evolution-options">
            <h2>Evolution Options</h2>
            <div className="evolution-preview">
              <div className="current-pokemon">
                <h3>Current</h3>
                <img 
                  src={selectedPokemon.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPokemon.id || selectedPokemon.pokemon_id || selectedPokemon.pokemon_number}.png`} 
                  alt={selectedPokemon.name || selectedPokemon.pokemon_name} 
                />
                <p>{selectedPokemon.name || selectedPokemon.pokemon_name}</p>
                <p>Level {selectedPokemon.level || 5}</p>
              </div>

              <div className="evolution-arrow">→</div>

              <div className="evolution-grid">
                {evolutionOptions.map(evolution => (
                  <div key={evolution.id} className="evolution-option">
                    <img src={evolution.sprite} alt={evolution.name} />
                    <h3>{evolution.name}</h3>
                    <p className="evolution-method">{evolution.method}</p>
                    <button 
                      onClick={() => evolvePokemon(evolution)}
                      disabled={!canEvolve(evolution) || isEvolving}
                      className={`evolve-button ${canEvolve(evolution) ? 'available' : 'unavailable'}`}
                    >
                      {isEvolving ? 'Evolving...' : canEvolve(evolution) ? 'Evolve!' : 'Cannot Evolve'}
                    </button>
                    {!canEvolve(evolution) && evolution.requiredLevel && (
                      <p className="requirement">
                        Requires level {evolution.requiredLevel}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedPokemon && evolutionOptions.length === 0 && (
          <div className="no-evolutions">
            <h2>No Evolutions Available</h2>
            <p>{selectedPokemon.name || selectedPokemon.pokemon_name} cannot evolve further or evolution requirements are not met.</p>
          </div>
        )}

        {isEvolving && (
          <div className="evolution-animation">
            <div className="evolution-overlay">
              <div className="evolution-spinner"></div>
              <h2>Evolution in Progress...</h2>
              <p>Your Pokemon is evolving!</p>
            </div>
          </div>
        )}
      </div>

      <div className="lab-info">
        <h3>Evolution Guide</h3>
        <ul>
          <li>Most Pokemon evolve by reaching a certain level</li>
          <li>Some Pokemon require special items (stones, etc.)</li>
          <li>Evolved Pokemon have increased stats and abilities</li>
          <li>Evolution is permanent - choose wisely!</li>
        </ul>
      </div>
    </div>
  );
};

export default EvolutionLab;
