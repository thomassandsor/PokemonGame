import React, { useState, useEffect } from 'react';
import './BattleArena.css';
import { BattleChallengeService, PokemonBattleExpanded, PokemonBattle, BattleResult } from '../../services/battleChallengeService';
import BattleReplay from './BattleReplay';
import { useNavigate } from 'react-router-dom';
import { useMsal, useAccount } from '@azure/msal-react';
import { getCaughtPokemonByTrainer, getContactByEmail } from '../../services/azureFunctionsDataverseService';

const NAV_OPTIONS = [
  { key: 'challenges', label: 'Open Challenges' },
  { key: 'create', label: 'Create Challenge' },
  { key: 'history', label: 'My Battles' },
];

export default function BattleArena() {
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const account = useAccount(accounts[0] || {});
  const [nav, setNav] = useState('challenges');
  const [battles, setBattles] = useState<PokemonBattleExpanded[]>([]);
  const [userBattles, setUserBattles] = useState<PokemonBattle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [replay, setReplay] = useState<{ battle: BattleResult, step: number } | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPokemonId, setSelectedPokemonId] = useState<string>('');
  const [pendingChallengeType, setPendingChallengeType] = useState<null | 'open' | 'training'>(null);
  const [userId, setUserId] = useState<string>('');
  const [userPokemon, setUserPokemon] = useState<any[]>([]);
  const [pokemonLoading, setPokemonLoading] = useState(false);
  const [pokemonError, setPokemonError] = useState<string | null>(null);

  // Fetch user ID and Pokémon on mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!account?.username) return;
      setPokemonLoading(true);
      setPokemonError(null);
      try {
        const contact = await getContactByEmail(account.username);
        if (!contact?.contactid) {
          setPokemonError('User profile not found.');
          return;
        }
        setUserId(contact.contactid);
        const pokemon = await getCaughtPokemonByTrainer(contact.contactid);
        setUserPokemon(pokemon);
        // Set default selected Pokémon if available
        if (pokemon && pokemon.length > 0) {
          const eligible = pokemon.filter((p: any) => (typeof p.hp === 'undefined' || p.hp > 0));
          setSelectedPokemonId(eligible[0]?.pokedexId || '');
        }
      } catch (err) {
        setPokemonError('Failed to load your Pokémon.');
      } finally {
        setPokemonLoading(false);
      }
    };
    fetchUserData();
  }, [account]);

  // Load open challenges
  const loadBattles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await BattleChallengeService.getOpenChallenges();
      setBattles(data);
    } catch (err) {
      setError('Failed to load battles');
    } finally {
      setLoading(false);
    }
  };

  // Load user battles
  const loadUserBattles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await BattleChallengeService.getUserChallenges(userId);
      setUserBattles(data);
    } catch (err) {
      setError('Failed to load your battles');
    } finally {
      setLoading(false);
    }
  };

  // Create challenge (now only called after selecting a Pokémon)
  const createChallenge = async (challengeType: 'open' | 'training', pokemonId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await BattleChallengeService.createChallenge(
        userId,
        pokemonId,
        challengeType
      );
      if (result.success) {
        setMessage(challengeType === 'training' ? 'Training battle started! Check your history for results.' : 'Challenge created! Other players can now join.');
        setNav('history');
        loadUserBattles();
      } else {
        setMessage(result.error || 'Failed to create challenge');
      }
    } catch (err) {
      setMessage('Error creating challenge');
    }
    setLoading(false);
    setPendingChallengeType(null);
  };

  // View replay
  const viewBattleResult = async (challenge: PokemonBattle) => {
    if (!challenge.pokemon_battleid) return;
    setLoading(true);
    try {
      const result = await BattleChallengeService.getBattleResult(challenge.pokemon_battleid);
      if (result) {
        setReplay({ battle: result, step: 0 });
        setCurrentStep(0);
        setIsReplaying(false);
      } else {
        setMessage('Battle result not ready yet.');
      }
    } catch (err) {
      setMessage('Failed to load battle result');
    }
    setLoading(false);
  };

  // Navigation effect
  useEffect(() => {
    setError(null);
    setMessage(null);
    setReplay(null);
    if (nav === 'challenges') loadBattles();
    if (nav === 'history') loadUserBattles();
  }, [nav]);

  // Navigation bar
  const navBar = (
    <nav className="arena-nav">
      {NAV_OPTIONS.map(opt => (
        <button
          key={opt.key}
          className={`arena-nav-btn${nav === opt.key ? ' active' : ''}`}
          onClick={() => setNav(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </nav>
  );

  // Message banner
  const messageBanner = message && (
    <div className="message-banner">
      {message}
      <button onClick={() => setMessage(null)} className="close-btn">×</button>
    </div>
  );

  // Loading spinner
  const loadingSpinner = loading && (
    <div className="loading-spinner">
      <div className="pokeball-spinner"></div>
      <p>Loading...</p>
    </div>
  );

  // Open Challenges View
  const openChallengesView = (
    <section className="arena-table-section">
      {loadingSpinner}
      {error && <div className="arena-empty">{error}</div>}
      {!loading && !error && (
        <table className="arena-battles-table">
          <thead>
            <tr>
              <th>Trainer</th>
              <th>Pokémon</th>
              <th>Type</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {battles.length === 0 ? (
              <tr><td colSpan={5} className="arena-empty">No active battles found.</td></tr>
            ) : (
              battles.map(battle => (
                <tr key={battle.pokemon_battleid}>
                  <td>{battle.pokemon_Player1?.firstname || 'Unknown'}</td>
                  <td>{battle.pokemon_Player1Pokemon?.pokemon_Pokemon?.pokemon_name || 'Unknown'}</td>
                  <td>
                    <span className={`arena-type-badge ${battle.pokemon_challengetype === 2 ? 'training' : 'pvp'}`}>
                      {battle.pokemon_challengetype === 2 ? 'Training' : 'PvP'}
                    </span>
                  </td>
                  <td>{battle.createdon ? new Date(battle.createdon).toLocaleDateString() : 'Unknown'}</td>
                  <td>
                    <button
                      className="arena-open-btn"
                      onClick={() => {
                        if (battle.pokemon_battleid) {
                          navigate(`/battle/join/${battle.pokemon_battleid}`);
                        }
                      }}
                      title="Accept this battle"
                    >
                      Accept
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  );

  // Pokémon selection view for challenge creation (matching accept challenge flow)
  const eligiblePokemon = userPokemon; // All caught Pokémon are eligible for now (adjust if you add HP/fainted logic)
  const pokemonSelectView = pendingChallengeType && (
    <section className="pokemon-select-view">
      <div className="pokemon-select-modal" style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px #0002', maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <h3 style={{ marginBottom: 18 }}>Select a Pokémon for {pendingChallengeType === 'training' ? 'Training Battle' : 'Open Challenge'}</h3>
        {pokemonLoading ? (
          <div className="loading-spinner"><div className="pokeball-spinner"></div><p>Loading your Pokémon...</p></div>
        ) : pokemonError ? (
          <div className="arena-empty">{pokemonError}</div>
        ) : eligiblePokemon.length === 0 ? (
          <div className="pokemon-grid">
            <div className="welcome-card">
              <h3>🎮 No Pokémon Available!</h3>
              <p>You don't have any eligible Pokémon. Visit My Pokémon to heal or catch more!</p>
              <button className="btn btn-primary" onClick={() => { setPendingChallengeType(null); navigate('/my-page'); }}>Go to My Pokémon</button>
            </div>
          </div>
        ) : (
          <div className="pokemon-grid" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
            {eligiblePokemon.map((p: any) => (
              <div
                key={p.pokedexId}
                className={`pokemon-card-container${selectedPokemonId === p.pokedexId ? ' selected' : ''}`}
                onClick={() => setSelectedPokemonId(p.pokedexId)}
                style={{
                  border: selectedPokemonId === p.pokedexId ? '3px solid #1976d2' : '2px solid #ccc',
                  background: selectedPokemonId === p.pokedexId ? '#e3f2fd' : '#fff',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  minWidth: '120px',
                  maxWidth: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxShadow: selectedPokemonId === p.pokedexId ? '0 2px 8px #1976d233' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <div className="pokemon-image-wrapper">
                  {/* You may want to fetch sprite from master data if available */}
                  <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.pokemonId}.png`} alt={p.name} style={{ width: 56, height: 56, marginBottom: 4 }} />
                </div>
                <div className="pokemon-number">#{p.pokemonId?.toString().padStart(3, '0')}</div>
                <div className="pokemon-name">{p.name}</div>
                <div className="pokemon-caught-indicator" style={{ fontSize: 12, color: '#1976d2', marginTop: 4 }}>
                  {selectedPokemonId === p.pokedexId ? 'Selected' : 'Select for Battle'}
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          className="challenge-btn confirm"
          style={{ marginRight: 12 }}
          disabled={loading || !selectedPokemonId || eligiblePokemon.length === 0}
          onClick={() => createChallenge(pendingChallengeType, selectedPokemonId)}
        >
          Confirm
        </button>
        <button
          className="challenge-btn cancel"
          onClick={() => setPendingChallengeType(null)}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </section>
  );

  // Create Challenge View
  const createChallengeView = (
    <section className="create-view">
      <div className="challenge-options" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '18px' }}>Choose Challenge Type</h3>
        <div className="challenge-buttons">
          <button
            onClick={() => setPendingChallengeType('training')}
            disabled={loading}
            className="challenge-btn training"
          >
            <div className="btn-icon">🤖</div>
            <div className="btn-content">
              <h4>Training Battle</h4>
              <p>Battle against AI for practice</p>
              <p>Immediate results</p>
            </div>
          </button>
          <button
            onClick={() => setPendingChallengeType('open')}
            disabled={loading}
            className="challenge-btn open"
          >
            <div className="btn-icon">⚔️</div>
            <div className="btn-content">
              <h4>Open Challenge</h4>
              <p>Challenge other trainers</p>
              <p>Wait for opponent to join</p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );

  // My Battles View
  const myBattlesView = (
    <section className="history-view">
      <div className="section-header">
        <h2>My Battle History</h2>
        <button onClick={loadUserBattles} className="refresh-btn">🔄 Refresh</button>
      </div>
      {loadingSpinner}
      {error && <div className="arena-empty">{error}</div>}
      {!loading && !error && (
        <div className="challenge-list">
          {userBattles.length === 0 ? (
            <div className="no-challenges">
              <p>No battles yet!</p>
              <p>Create a challenge to start battling.</p>
            </div>
          ) : (
            userBattles.map((challenge) => (
              <div key={challenge.pokemon_battleid || 'unknown'} className="challenge-card history">
                <div className="challenge-info">
                  <h3>
                    {challenge.pokemon_challengetype === 2 ? '🤖 Training Battle' : challenge.pokemon_player2 ? '⚔️ Player Battle' : '🔄 Waiting for Opponent'}
                  </h3>
                  <p>Status: <span className={`status ${challenge.statuscode === 1 ? 'open' : 'completed'}`}>
                    {challenge.statuscode === 1 ? 'Open' : 'Completed'}
                  </span></p>
                  <p>Created: {challenge.createdon ? new Date(challenge.createdon).toLocaleString() : 'Unknown'}</p>
                  {challenge.modifiedon && challenge.modifiedon !== challenge.createdon && (
                    <p>Updated: {new Date(challenge.modifiedon).toLocaleString()}</p>
                  )}
                  {challenge.pokemon_winnercontact && (
                    <p>Winner: {challenge.pokemon_winnercontact === userId ? 'You!' : 'Opponent'}</p>
                  )}
                  <p>Your Pokémon: {challenge.pokemon_player1 === userId ? challenge.pokemon_player1pokemon : challenge.pokemon_player2pokemon}</p>
                  {challenge.pokemon_player2 && (
                    <p>Opponent Pokémon: {challenge.pokemon_player1 === userId ? challenge.pokemon_player2pokemon : challenge.pokemon_player1pokemon}</p>
                  )}
                </div>
                <div className="challenge-actions">
                  {challenge.statuscode === 895550002 && challenge.pokemon_battleresult && (
                    <button
                      onClick={() => viewBattleResult(challenge)}
                      className="view-btn"
                    >
                      Watch Replay
                    </button>
                  )}
                  {challenge.statuscode === 1 && !challenge.pokemon_battleresult && (
                    <span className="battle-status">Battle in progress...</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );

  // Battle Replay View
  const battleReplayView = replay && (
    <BattleReplay
      battleResult={replay.battle}
      currentStep={currentStep}
      isReplaying={isReplaying}
      onNext={() => setCurrentStep((s) => s + 1)}
      onPrevious={() => setCurrentStep((s) => Math.max(0, s - 1))}
      onAutoReplay={() => {
        if (!isReplaying) {
          setIsReplaying(true);
          setCurrentStep(0);
          const interval = setInterval(() => {
            setCurrentStep((cur) => {
              if (!replay.battle.completeBattleData) return cur;
              if (cur >= replay.battle.completeBattleData.battle_turns.length) {
                clearInterval(interval);
                setIsReplaying(false);
                return cur;
              }
              return cur + 1;
            });
          }, 1500);
        } else {
          setIsReplaying(false);
        }
      }}
      onClose={() => setReplay(null)}
    />
  );

  return (
    <div className="battle-arena-container">
      <header className="arena-header">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Poké Ball" className="arena-logo" />
        <h1>Battle Arena</h1>
        <p>Challenge trainers and view all active Pokémon battles!</p>
      </header>
      {navBar}
      {messageBanner}
      {pokemonSelectView}
      {!pokemonSelectView && (replay ? battleReplayView : (
        nav === 'challenges' ? openChallengesView :
        nav === 'create' ? createChallengeView :
        nav === 'history' ? myBattlesView : null
      ))}
    </div>
  );
}
