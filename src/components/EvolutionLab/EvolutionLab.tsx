import React, { useState } from 'react';
import { EvolutionService, EvolutionOption as ServiceEvolutionOption } from '../../services/evolutionService';
import './EvolutionLab.css';

interface EvolutionLabProps {
  userPokemon: any[];
  onPokemonUpdate: (pokemon: any) => void;
}

const EvolutionLab: React.FC<EvolutionLabProps> = ({ userPokemon, onPokemonUpdate }) => {
  const [selectedPokemon, setSelectedPokemon] = useState<any>(null);
  const [evolutionOptions, setEvolutionOptions] = useState<ServiceEvolutionOption[]>([]);
  const [isEvolving, setIsEvolving] = useState(false);

  const selectPokemon = (pokemon: any) => {
    setSelectedPokemon(pokemon);
    const pokemonId = pokemon.id || pokemon.pokemon_id || pokemon.pokemon_number;
    const evolutions = EvolutionService.getEvolutionOptions(pokemonId);
    setEvolutionOptions(evolutions);
  };

  const canEvolve = (evolution: ServiceEvolutionOption): boolean => {
    if (!selectedPokemon) return false;
    return EvolutionService.canEvolve(selectedPokemon, evolution);
  };

  const evolvePokemon = async (evolution: ServiceEvolutionOption) => {
    if (!selectedPokemon || !canEvolve(evolution)) return;
    
    setIsEvolving(true);
    
    try {
      const evolvedPokemon = await EvolutionService.evolvePokemon(selectedPokemon, evolution);
      
      onPokemonUpdate(evolvedPokemon);
      setSelectedPokemon(evolvedPokemon);
      
      // Get new evolution options for the evolved Pokemon  
      const newEvolutions = EvolutionService.getEvolutionOptions(evolvedPokemon.id);
      setEvolutionOptions(newEvolutions);
      
      alert(`${selectedPokemon.name || selectedPokemon.pokemon_name} evolved into ${evolution.name}!`);
    } catch (error) {
      console.error('Evolution failed:', error);
      alert('Evolution failed! Please try again.');
    } finally {
      setIsEvolving(false);
    }
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
                const hasEvolutions = EvolutionService.getEvolutionOptions(pokemonId).length > 0;
                
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
                    <p className="evolution-method">{evolution.description}</p>
                    <button 
                      onClick={() => evolvePokemon(evolution)}
                      disabled={!canEvolve(evolution) || isEvolving}
                      className={`evolve-button ${canEvolve(evolution) ? 'available' : 'unavailable'}`}
                    >
                      {isEvolving ? 'Evolving...' : canEvolve(evolution) ? 'Evolve!' : 'Cannot Evolve'}
                    </button>
                    {!canEvolve(evolution) && (
                      <p className="requirement">
                        {evolution.description}
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
