import React, { useState, useEffect } from 'react';
import { Pokemon } from '../../types/pokemon';
import { getCaughtPokemonByTrainer } from '../../services/azureFunctionsDataverseService';
import { evolutionService } from '../../services/evolutionService';
import pokemonData from '../../data/pokemon.json';
import './PokemonBrowser.css';

interface CaughtPokemon {
  pokedexId: string;
  pokemonId: string;
  name: string;
}

interface PokemonBrowserProps {
  userId?: string;
}

const PokemonBrowser: React.FC<PokemonBrowserProps> = ({ userId }) => {
  const [allPokemon] = useState<Pokemon[]>(pokemonData as Pokemon[]);
  const [caughtPokemon, setCaughtPokemon] = useState<CaughtPokemon[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'caught' | 'uncaught'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEvolutionChain, setShowEvolutionChain] = useState(false);

  // Get unique types for filter
  const pokemonTypes = Array.from(
    new Set(allPokemon.flatMap(p => p.types))
  ).sort();

  useEffect(() => {
    if (userId) {
      loadCaughtPokemon();
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCaughtPokemon = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const caught = await getCaughtPokemonByTrainer(userId);
      setCaughtPokemon(caught);
    } catch (error) {
      console.error('Failed to load caught Pokemon:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPokemonCaught = (pokemonId: number): boolean => {
    return caughtPokemon.some(caught => parseInt(caught.pokemonId) === pokemonId);
  };

  const getFilteredPokemon = (): Pokemon[] => {
    let filtered = allPokemon;

    // Apply text search
    if (searchTerm) {
      filtered = filtered.filter(pokemon =>
        pokemon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pokemon.id.toString().includes(searchTerm)
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(pokemon =>
        pokemon.types.includes(typeFilter)
      );
    }

    // Apply caught/uncaught filter
    if (filter === 'caught') {
      filtered = filtered.filter(pokemon => isPokemonCaught(pokemon.id));
    } else if (filter === 'uncaught') {
      filtered = filtered.filter(pokemon => !isPokemonCaught(pokemon.id));
    }

    return filtered;
  };

  const handlePokemonClick = (pokemon: Pokemon) => {
    setSelectedPokemon(pokemon);
    setShowEvolutionChain(false);
  };

  const handleShowEvolutionChain = () => {
    setShowEvolutionChain(true);
  };

  const getEvolutionChain = (pokemon: Pokemon): Pokemon[] => {
    return evolutionService.getEvolutionChain(pokemon.id, allPokemon);
  };

  const formatStatName = (statName: string): string => {
    return statName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTotalStats = (pokemon: Pokemon): number => {
    return pokemon.stats.reduce((total, stat) => total + stat.base_stat, 0);
  };

  const filteredPokemon = getFilteredPokemon();

  return (
    <div className="pokemon-browser">
      <div className="browser-header">
        <h2>Pokédex Browser</h2>
        <p className="browser-stats">
          Showing {filteredPokemon.length} of {allPokemon.length} Pokémon
          {userId && (
            <span className="caught-stats">
              {' | '}Caught: {caughtPokemon.length} ({Math.round((caughtPokemon.length / allPokemon.length) * 100)}%)
            </span>
          )}
        </p>
      </div>

      <div className="browser-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search Pokémon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'caught' | 'uncaught')}
            className="filter-select"
          >
            <option value="all">All Pokémon</option>
            <option value="caught">Caught</option>
            <option value="uncaught">Not Caught</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            {pokemonTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="browser-content">
        <div className="pokemon-grid">
          {loading ? (
            <div className="loading">Loading Pokémon...</div>
          ) : (
            filteredPokemon.map(pokemon => (
              <div
                key={pokemon.id}
                className={`pokemon-card ${isPokemonCaught(pokemon.id) ? 'caught' : 'uncaught'} ${
                  selectedPokemon?.id === pokemon.id ? 'selected' : ''
                }`}
                onClick={() => handlePokemonClick(pokemon)}
              >
                <div className="pokemon-image">
                  <img
                    src={pokemon.sprites.official_artwork || pokemon.sprites.front_default || ''}
                    alt={pokemon.name}
                    loading="lazy"
                  />
                  {isPokemonCaught(pokemon.id) && (
                    <div className="caught-indicator">✓</div>
                  )}
                </div>
                <div className="pokemon-info">
                  <div className="pokemon-number">#{pokemon.id.toString().padStart(3, '0')}</div>
                  <div className="pokemon-name">{pokemon.name}</div>
                  <div className="pokemon-types">
                    {pokemon.types.map(type => (
                      <span key={type} className={`type-badge type-${type}`}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedPokemon && (
          <div className="pokemon-details">
            <div className="details-header">
              <h3>
                #{selectedPokemon.id.toString().padStart(3, '0')} {selectedPokemon.name}
                {isPokemonCaught(selectedPokemon.id) && (
                  <span className="caught-badge">Caught!</span>
                )}
              </h3>
              <button
                onClick={handleShowEvolutionChain}
                className="evolution-chain-btn"
                disabled={!selectedPokemon.evolution}
              >
                View Evolution Chain
              </button>
            </div>

            <div className="details-content">
              <div className="pokemon-sprite">
                <img
                  src={selectedPokemon.sprites.official_artwork || selectedPokemon.sprites.front_default || ''}
                  alt={selectedPokemon.name}
                />
              </div>

              <div className="pokemon-data">
                <div className="basic-info">
                  <p><strong>Height:</strong> {selectedPokemon.height / 10} m</p>
                  <p><strong>Weight:</strong> {selectedPokemon.weight / 10} kg</p>
                  <p><strong>Types:</strong> {selectedPokemon.types.map(type => 
                    <span key={type} className={`type-badge type-${type}`}>{type}</span>
                  )}</p>
                  <p><strong>Abilities:</strong> {selectedPokemon.abilities.join(', ')}</p>
                </div>

                <div className="stats">
                  <h4>Base Stats (Total: {getTotalStats(selectedPokemon)})</h4>
                  {selectedPokemon.stats.map(stat => (
                    <div key={stat.name} className="stat-row">
                      <span className="stat-name">{formatStatName(stat.name)}</span>
                      <div className="stat-bar">
                        <div
                          className="stat-fill"
                          style={{ width: `${(stat.base_stat / 255) * 100}%` }}
                        />
                        <span className="stat-value">{stat.base_stat}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedPokemon.evolution && (
                  <div className="evolution-info">
                    <h4>Evolution Info</h4>
                    {selectedPokemon.evolution.evolves_from && (
                      <p><strong>Evolves from:</strong> {selectedPokemon.evolution.evolves_from}</p>
                    )}
                    {selectedPokemon.evolution.can_evolve && (
                      <div>
                        <p><strong>Can evolve into:</strong></p>
                        {selectedPokemon.evolution.evolves_to.map((evolution, index) => (
                          <div key={index} className="evolution-option">
                            <span>{evolution.name}</span>
                            {evolution.requirement && (
                              <span className="evolution-requirement">
                                {evolution.requirement.level && ` (Level ${evolution.requirement.level})`}
                                {evolution.requirement.item && ` (${evolution.requirement.item})`}
                                {evolution.requirement.trigger && evolution.requirement.trigger !== 'level-up' && ` (${evolution.requirement.trigger})`}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {showEvolutionChain && (
              <div className="evolution-chain">
                <h4>Evolution Chain</h4>
                <div className="chain-display">
                  {getEvolutionChain(selectedPokemon).map((pokemon, index, chain) => (
                    <React.Fragment key={pokemon.id}>
                      <div
                        className={`chain-pokemon ${pokemon.id === selectedPokemon.id ? 'current' : ''} ${
                          isPokemonCaught(pokemon.id) ? 'caught' : 'uncaught'
                        }`}
                        onClick={() => handlePokemonClick(pokemon)}
                      >
                        <img
                          src={pokemon.sprites.front_default || ''}
                          alt={pokemon.name}
                        />
                        <div className="chain-pokemon-name">
                          #{pokemon.id} {pokemon.name}
                        </div>
                        {isPokemonCaught(pokemon.id) && <div className="chain-caught">✓</div>}
                      </div>
                      {index < chain.length - 1 && (
                        <div className="evolution-arrow">→</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PokemonBrowser;
