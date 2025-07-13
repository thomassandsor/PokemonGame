import React, { useState, useEffect } from 'react';
import { pokemonMasterDataService } from '../../services/pokemonMasterDataService';
import { Pokemon } from '../../types/pokemon';
import './PokemonBrowser.css';
import '../../styles/PokemonCard.css';

interface PokemonBrowserProps {}

const PokemonBrowser: React.FC<PokemonBrowserProps> = () => {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    loadPokemon();
  }, []);

  const loadPokemon = async () => {
    try {
      setLoading(true);
      const pokemonData = await pokemonMasterDataService.getAllPokemon();
      setPokemon(pokemonData);
      setError(null);
    } catch (err) {
      setError('Failed to load Pokemon data');
      console.error('Error loading Pokemon:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPokemon = pokemon.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.id.toString().includes(searchTerm);
    const matchesType = !selectedType || 
                       (p.types && p.types.some(type => type.type.name === selectedType));
    return matchesSearch && matchesType;
  });

  const pokemonTypes = Array.from(new Set(
    pokemon.flatMap(p => p.types?.map(t => t.type.name) || [])
  )).sort();

  if (loading) {
    return (
      <div className="pokemon-page-container">
        <div className="pokemon-loading-container">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading Pokemon...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pokemon-page-container">
        <div className="pokemon-error-container">
          <p>{error}</p>
          <button onClick={loadPokemon}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pokemon-page-container">
      <div className="pokemon-page-header">
        <h1>Pokemon Browser</h1>
        <p>Discover and explore Pokemon from all generations</p>
      </div>

      <div className="pokemon-filters">
        <div className="pokemon-search-box">
          <input
            type="text"
            placeholder="Search Pokemon by name or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pokemon-search-input"
          />
        </div>
        <div className="pokemon-type-filter">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="pokemon-type-select"
          >
            <option value="">All Types</option>
            {pokemonTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pokemon-results-info">
        <p>Showing {filteredPokemon.length} of {pokemon.length} Pokemon</p>
      </div>

      <div className="pokemon-grid">
        {filteredPokemon.map(p => (
          <div key={p.id} className="pokemon-card-container">
            <div className="pokemon-image-wrapper">
              <img
                src={p.sprites?.other?.['official-artwork']?.front_default || 
                     p.sprites?.front_default || 
                     '/placeholder-pokemon.png'}
                alt={p.name}
                loading="lazy"
              />
            </div>
            <div className="pokemon-number">#{p.id.toString().padStart(3, '0')}</div>
            <div className="pokemon-name">{p.name}</div>
            <div className="pokemon-types-container">
              {p.types?.map(typeInfo => (
                <span 
                  key={typeInfo.type.name} 
                  className={`pokemon-type-badge type-${typeInfo.type.name}`}
                >
                  {typeInfo.type.name}
                </span>
              ))}
            </div>
            <div className="pokemon-stats-container">
              <div className="pokemon-stat">
                <span className="pokemon-stat-label">Height:</span>
                <span className="pokemon-stat-value">{(p.height / 10).toFixed(1)}m</span>
              </div>
              <div className="pokemon-stat">
                <span className="pokemon-stat-label">Weight:</span>
                <span className="pokemon-stat-value">{(p.weight / 10).toFixed(1)}kg</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPokemon.length === 0 && (
        <div className="pokemon-no-results">
          <p>No Pokemon found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default PokemonBrowser;
