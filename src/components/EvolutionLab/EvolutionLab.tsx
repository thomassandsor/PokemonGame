import React, { useState } from 'react';
import { Pokemon } from '../../types/pokemon';
import { UserPokemon } from '../../services/battleService';
import { evolutionService, EvolutionOption, EvolutionResult } from '../../services/evolutionService';
import pokemonData from '../../data/pokemon.json';
import './EvolutionLab.css';

interface EvolutionLabProps {
  userPokemon: UserPokemon[];
  onPokemonUpdate: (updatedPokemon: UserPokemon) => void;
}

const EvolutionLab: React.FC<EvolutionLabProps> = ({ userPokemon, onPokemonUpdate }) => {
  const [allPokemon] = useState<Pokemon[]>(pokemonData as Pokemon[]);
  const [selectedPokemon, setSelectedPokemon] = useState<UserPokemon | null>(null);
  const [evolutionOptions, setEvolutionOptions] = useState<EvolutionOption[]>([]);
  const [evolvingPokemon, setEvolvingPokemon] = useState<UserPokemon | null>(null);
  const [evolutionResult, setEvolutionResult] = useState<EvolutionResult | null>(null);
  const [userItems] = useState<string[]>(['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone']); // Mock items

  const handlePokemonSelect = (pokemon: UserPokemon) => {
    setSelectedPokemon(pokemon);
    setEvolutionResult(null);
    
    const options = evolutionService.getEvolutionOptions(pokemon, allPokemon, userItems);
    setEvolutionOptions(options);
  };

  const handleEvolution = async (targetPokemonId: number) => {
    if (!selectedPokemon) return;

    setEvolvingPokemon(selectedPokemon);
    
    try {
      const result = await evolutionService.evolvePokemon(
        selectedPokemon,
        targetPokemonId,
        allPokemon
      );
      
      setEvolutionResult(result);
      
      if (result.success) {
        // Create updated Pokemon with new ID
        const updatedPokemon = {
          ...selectedPokemon,
          pokemonId: targetPokemonId
        };
        
        setSelectedPokemon(updatedPokemon);
        onPokemonUpdate(updatedPokemon);
        
        // Refresh evolution options for the evolved Pokemon
        const newOptions = evolutionService.getEvolutionOptions(updatedPokemon, allPokemon, userItems);
        setEvolutionOptions(newOptions);
      }
    } catch (error) {
      console.error('Evolution failed:', error);
      setEvolutionResult({
        success: false,
        error: 'Evolution failed due to system error'
      });
    } finally {
      setEvolvingPokemon(null);
    }
  };

  const getPokemonData = (pokemonId: number): Pokemon | undefined => {
    return allPokemon.find(p => p.id === pokemonId);
  };

  const getEvolutionChain = (pokemon: UserPokemon): Pokemon[] => {
    return evolutionService.getEvolutionChain(pokemon.pokemonId, allPokemon);
  };

  const formatRequirement = (requirement: any): string => {
    if (!requirement) return 'No special requirements';
    
    const parts = [];
    if (requirement.level) parts.push(`Level ${requirement.level}`);
    if (requirement.item) parts.push(`${requirement.item.replace('-', ' ')}`);
    if (requirement.trigger && requirement.trigger !== 'level-up') parts.push(requirement.trigger);
    if (requirement.time_of_day) parts.push(`${requirement.time_of_day} time`);
    if (requirement.min_happiness) parts.push(`${requirement.min_happiness} happiness`);
    if (requirement.location) parts.push(`at ${requirement.location}`);
    if (requirement.known_move) parts.push(`knowing ${requirement.known_move}`);
    
    return parts.length > 0 ? parts.join(', ') : 'No special requirements';
  };

  const canEvolvePokemon = userPokemon.filter(pokemon => {
    const options = evolutionService.getEvolutionOptions(pokemon, allPokemon, userItems);
    return options.some(option => option.canEvolveNow);
  });

  return (
    <div className="evolution-lab">
      <div className="lab-header">
        <h2>Evolution Laboratory</h2>
        <p>Help your Pokémon reach their full potential!</p>
      </div>

      {userPokemon.length === 0 ? (
        <div className="no-pokemon">
          <h3>No Pokémon Available</h3>
          <p>You need to catch some Pokémon before you can evolve them!</p>
        </div>
      ) : (
        <>
          <div className="evolution-summary">
            <div className="summary-card">
              <h3>Evolution Ready</h3>
              <div className="summary-number">{canEvolvePokemon.length}</div>
              <p>Pokémon can evolve now</p>
            </div>
            <div className="summary-card">
              <h3>Total Pokémon</h3>
              <div className="summary-number">{userPokemon.length}</div>
              <p>In your collection</p>
            </div>
            <div className="summary-card">
              <h3>Evolution Items</h3>
              <div className="summary-number">{userItems.length}</div>
              <p>Available for use</p>
            </div>
          </div>

          <div className="pokemon-selection">
            <h3>Select a Pokémon</h3>
            <div className="pokemon-grid">
              {userPokemon.map(pokemon => {
                const pokemonData = getPokemonData(pokemon.pokemonId);
                const options = evolutionService.getEvolutionOptions(pokemon, allPokemon, userItems);
                const canEvolve = options.some(option => option.canEvolveNow);
                
                return (
                  <div
                    key={pokemon.id}
                    className={`pokemon-card ${selectedPokemon?.id === pokemon.id ? 'selected' : ''} ${
                      canEvolve ? 'can-evolve' : ''
                    }`}
                    onClick={() => handlePokemonSelect(pokemon)}
                  >
                    <div className="pokemon-image">
                      <img
                        src={pokemonData?.sprites.official_artwork || pokemonData?.sprites.front_default || ''}
                        alt={pokemonData?.name}
                      />
                      {canEvolve && <div className="evolution-indicator">⚡</div>}
                    </div>
                    <div className="pokemon-info">
                      <div className="pokemon-name">
                        {pokemon.nickname || pokemonData?.name}
                      </div>
                      <div className="pokemon-level">Level {pokemon.level}</div>
                      <div className="evolution-status">
                        {canEvolve ? 'Can Evolve!' : 'Not Ready'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedPokemon && (
            <div className="evolution-details">
              <div className="current-pokemon">
                <h3>Current Pokémon</h3>
                <div className="pokemon-display">
                  <img
                    src={getPokemonData(selectedPokemon.pokemonId)?.sprites.official_artwork || ''}
                    alt={getPokemonData(selectedPokemon.pokemonId)?.name}
                  />
                  <div className="pokemon-info">
                    <h4>{selectedPokemon.nickname || getPokemonData(selectedPokemon.pokemonId)?.name}</h4>
                    <p>Level {selectedPokemon.level}</p>
                    <p>Experience: {selectedPokemon.experience}</p>
                    <div className="types">
                      {getPokemonData(selectedPokemon.pokemonId)?.types.map(type => (
                        <span key={type} className={`type-badge type-${type}`}>
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="evolution-chain-display">
                <h3>Evolution Chain</h3>
                <div className="chain">
                  {getEvolutionChain(selectedPokemon).map((pokemon, index, chain) => (
                    <React.Fragment key={pokemon.id}>
                      <div
                        className={`chain-pokemon ${
                          pokemon.id === selectedPokemon.pokemonId ? 'current' : ''
                        }`}
                      >
                        <img
                          src={pokemon.sprites.front_default || ''}
                          alt={pokemon.name}
                        />
                        <div className="chain-name">
                          #{pokemon.id} {pokemon.name}
                        </div>
                      </div>
                      {index < chain.length - 1 && (
                        <div className="evolution-arrow">→</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {evolutionOptions.length > 0 ? (
                <div className="evolution-options">
                  <h3>Evolution Options</h3>
                  {evolutionOptions.map((option, index) => (
                    <div
                      key={index}
                      className={`evolution-option ${option.canEvolveNow ? 'available' : 'unavailable'}`}
                    >
                      <div className="option-pokemon">
                        <img
                          src={option.targetPokemon.sprites.official_artwork || option.targetPokemon.sprites.front_default || ''}
                          alt={option.targetPokemon.name}
                        />
                        <div className="option-info">
                          <h4>{option.targetPokemon.name}</h4>
                          <div className="types">
                            {option.targetPokemon.types.map(type => (
                              <span key={type} className={`type-badge type-${type}`}>
                                {type}
                              </span>
                            ))}
                          </div>
                          <div className="requirements">
                            <strong>Requirements:</strong> {formatRequirement(option.requirement)}
                          </div>
                          {!option.canEvolveNow && (
                            <div className="missing-requirements">
                              <strong>Missing:</strong>
                              <ul>
                                {option.missingRequirements.map((req, reqIndex) => (
                                  <li key={reqIndex}>{req}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      {option.canEvolveNow && (
                        <button
                          className="evolve-btn"
                          onClick={() => handleEvolution(option.targetPokemon.id)}
                          disabled={!!evolvingPokemon}
                        >
                          {evolvingPokemon?.id === selectedPokemon.id ? 'Evolving...' : 'Evolve!'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-evolution">
                  <h3>No Evolution Available</h3>
                  <p>This Pokémon cannot evolve further or doesn't meet evolution requirements yet.</p>
                </div>
              )}

              {evolutionResult && (
                <div className={`evolution-result ${evolutionResult.success ? 'success' : 'error'}`}>
                  {evolutionResult.success ? (
                    <div className="success-message">
                      <h3>🎉 Evolution Successful!</h3>
                      <p>
                        {selectedPokemon.nickname || getPokemonData(selectedPokemon.pokemonId)?.name} evolved into{' '}
                        {evolutionResult.newPokemonName}!
                      </p>
                    </div>
                  ) : (
                    <div className="error-message">
                      <h3>❌ Evolution Failed</h3>
                      <p>{evolutionResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="available-items">
            <h3>Available Evolution Items</h3>
            <div className="items-grid">
              {userItems.map(item => (
                <div key={item} className="item-card">
                  <div className="item-name">{item.replace('-', ' ')}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EvolutionLab;
