import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMsal, useAccount } from '@azure/msal-react';
import { getContactByEmail, getCaughtPokemonByTrainer } from '../../services/azureFunctionsDataverseService';
import { BattleChallengeService } from '../../services/battleChallengeService';

// MSAL is more secure because it uses OAuth2/OpenID Connect flows to validate the user's identity with Azure AD, ensuring tokens are issued by a trusted authority and not spoofed or guessed on the client.

interface UserPokemon {
  id: string;
  pokemon_id: number;
  pokemon_name: string;
  pokemon_level?: number;
  pokemon_nickname?: string;
  pokemon_current_hp?: number;
  pokemon_max_hp?: number;
  pokemon_experience?: number;
  pokemon_is_shiny?: boolean;
  sprite?: string;
}

const BattleCreateSelectPokemon: React.FC = () => {
  const navigate = useNavigate();
  const { challengeType } = useParams<{ challengeType: 'open' | 'training' }>();
  const { accounts } = useMsal();
  const account = useAccount(accounts[0] || {});
  const [userPokemon, setUserPokemon] = useState<UserPokemon[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<UserPokemon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadUserPokemon();
    // eslint-disable-next-line
  }, [account]);

  const loadUserPokemon = async () => {
    setLoading(true);
    setError('');
    try {
      if (!account?.username) throw new Error('User not authenticated');
      const contact = await getContactByEmail(account.username);
      if (!contact?.contactid) throw new Error('User profile not found.');
      const pokemonList = await getCaughtPokemonByTrainer(contact.contactid);
      setUserPokemon(pokemonList.filter(p => (typeof p.pokemon_current_hp === 'undefined' || p.pokemon_current_hp > 0)));
    } catch (err: any) {
      setError(err.message || 'Failed to load your Pokémon.');
    }
    setLoading(false);
  };

  const handleSelect = async (pokemon: UserPokemon) => {
    setSelectedPokemon(pokemon);
    setLoading(true);
    try {
      if (!account?.username) throw new Error('User not authenticated');
      const contact = await getContactByEmail(account.username);
      if (!contact?.contactid) throw new Error('User profile not found.');
      const result = await BattleChallengeService.createChallenge(
        contact.contactid,
        pokemon.id,
        challengeType as 'open' | 'training'
      );
      if (result.success) {
        navigate('/battle-arena');
      } else {
        setError(result.error || 'Failed to create challenge');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating challenge');
    }
    setLoading(false);
  };

  if (loading) return <div className="loading-spinner"><div className="pokeball-spinner"></div><p>Loading...</p></div>;
  if (error) return <div className="arena-empty">{error}</div>;

  return (
    <div className="pokemon-page-container">
      <div className="pokemon-page-header">
        <h1>Select a Pokémon</h1>
        <p>Choose a Pokémon to use for your {challengeType === 'training' ? 'Training Battle' : 'Open Challenge'}.</p>
      </div>
      <div className="pokemon-grid">
        {userPokemon.length === 0 ? (
          <div className="welcome-card">
            <h3>🎮 No Pokémon Available!</h3>
            <p>You don't have any eligible Pokémon. Visit My Pokémon to heal or catch more!</p>
            <button className="btn btn-primary" onClick={() => navigate('/my-page')}>Go to My Pokémon</button>
          </div>
        ) : (
          userPokemon.map((p) => (
            <div
              key={p.id}
              className={`pokemon-card-container${selectedPokemon?.id === p.id ? ' selected' : ''}`}
              onClick={() => handleSelect(p)}
              style={{
                border: selectedPokemon?.id === p.id ? '3px solid #1976d2' : '2px solid #ccc',
                background: selectedPokemon?.id === p.id ? '#e3f2fd' : '#fff',
                borderRadius: '12px',
                padding: '12px 16px',
                cursor: 'pointer',
                minWidth: '120px',
                maxWidth: '160px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: selectedPokemon?.id === p.id ? '0 2px 8px #1976d233' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <div className="pokemon-image-wrapper">
                <img src={p.sprite} alt={p.pokemon_name} style={{ width: 56, height: 56, marginBottom: 4 }} />
                {p.pokemon_is_shiny && <span className="pokemon-shiny-indicator">✨</span>}
              </div>
              <div className="pokemon-number">#{p.pokemon_id.toString().padStart(3, '0')}</div>
              <div className="pokemon-name">{p.pokemon_nickname || p.pokemon_name}</div>
              <div className="pokemon-level-badge">Level {p.pokemon_level}</div>
              <div className="pokemon-hp-display">
                <span>HP: {p.pokemon_current_hp ?? 100}/{p.pokemon_max_hp ?? 100}</span>
                <div className="pokemon-hp-bar" style={{ width: 80, height: 8, background: '#eee', borderRadius: 4, margin: '2px auto' }}>
                  <div
                    className="pokemon-hp-fill"
                    style={{
                      width: `${((p.pokemon_current_hp ?? 100) / (p.pokemon_max_hp ?? 100)) * 100}%`,
                      height: 8,
                      background: '#4caf50',
                      borderRadius: 4
                    }}
                  ></div>
                </div>
              </div>
              <div className="pokemon-caught-indicator" style={{ fontSize: 12, color: '#1976d2', marginTop: 4 }}>
                {selectedPokemon?.id === p.id ? 'Selected' : 'Select for Battle'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BattleCreateSelectPokemon;
