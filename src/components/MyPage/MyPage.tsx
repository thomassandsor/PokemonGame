import React, { useState, useEffect } from 'react';
import { Button, Spinner, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useMsal, useAccount } from '@azure/msal-react';
import { getCaughtPokemonByTrainer, getContactByEmail, type CaughtPokemon, type Contact } from '../../services/azureFunctionsDataverseService';
import { dataverseService } from '../../services/azureFunctionsDataverseService';
import { Pokemon } from '../../types/pokemon';
import { pokemonMasterDataService } from '../../services/pokemonMasterDataService';
import './MyPage.css';
import '../../styles/PokemonCard.css';

interface EnhancedCaughtPokemon extends CaughtPokemon {
  pokemonDetails?: Pokemon;
}

const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const account = useAccount(accounts[0] || {});
  
  const [pokemon, setPokemon] = useState<EnhancedCaughtPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contact, setContact] = useState<Contact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<EnhancedCaughtPokemon | null>(null);

  useEffect(() => {
    initializeUser();
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeUser = async () => {
    if (!account?.username) return;

    try {
      setLoading(true);
      
      console.log('User account info:', account);
      console.log('Looking for contact with email:', account.username);
      
      // Check if contact exists or create new one
      let userContact = await getContactByEmail(account.username);
      
      if (!userContact) {
        // Create contact with info from Azure AD External Identities claims
        console.log('Contact not found, creating new contact for:', account.username);
        try {
          userContact = await dataverseService.createContactFromAzureAD({
            name: account.name,
            email: account.username,
          });
          console.log('Successfully created contact:', userContact);
        } catch (createError) {
          console.error('Failed to create contact:', createError);
          setError('Failed to create user profile. Please try again.');
          return;
        }
      }
      
      // Load all Pokemon data for details
      const allPokemon = await pokemonMasterDataService.getAllPokemon();
      
      setContact(userContact);
      
      // Load user's Pokemon
      if (userContact?.contactid) {
        const userPokemon = await getCaughtPokemonByTrainer(userContact.contactid);
        
        // Enhance each caught Pokemon with full details from the Pokemon data
        const enhancedPokemon: EnhancedCaughtPokemon[] = userPokemon.map(caught => ({
          ...caught,
          pokemonDetails: allPokemon.find(p => p.name === caught.name.toLowerCase())
        }));
        
        setPokemon(enhancedPokemon);
      }
      
    } catch (error) {
      console.error('Error initializing user:', error);
      setError('Failed to load your Pokemon data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Pokemon card click
  const handlePokemonClick = (poke: EnhancedCaughtPokemon) => {
    setSelectedPokemon(poke);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedPokemon(null);
  };

  if (loading) {
    return (
      <div className="pokemon-page-container">
        <div className="pokemon-loading-container">
          <Spinner animation="border" role="status" className="spinner-border">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p>Loading your Pokemon...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pokemon-page-container">
      <div className="pokemon-page-header">
        <h1>Welcome, {contact?.firstname || 'Trainer'}! 🎯</h1>
        <p>You have caught {pokemon.length} Pokemon so far!</p>
      </div>

      {error && (
        <div className="pokemon-error-container">
          {error}
        </div>
      )}

      {pokemon.length === 0 ? (
        <div className="pokemon-grid">
          <div className="welcome-card">
            <h3>🎮 Start Your Pokemon Journey!</h3>
            <p>You haven't caught any Pokemon yet. Use the scanner to catch your first Pokemon and begin your adventure!</p>
            <Button 
              variant="light" 
              size="lg"
              onClick={() => navigate('/scan-pokemon')}
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                color: '#1a1a2e',
                fontWeight: '600',
                padding: '12px 24px',
                borderRadius: '12px'
              }}
            >
              Scan Your First Pokemon
            </Button>
          </div>
        </div>
      ) : (
        <div className="pokemon-grid">
          {pokemon.map((poke) => (
            <div 
              key={poke.pokedexId} 
              className="pokemon-card-container"
              onClick={() => handlePokemonClick(poke)}
            >
              <div className="pokemon-image-wrapper">
                {poke.pokemonDetails ? (
                  <img
                    src={poke.pokemonDetails.sprites.other?.['official-artwork']?.front_default || poke.pokemonDetails.sprites.front_default || ''}
                    alt={poke.pokemonDetails.name}
                  />
                ) : (
                  <div className="pokemon-placeholder">
                    🎮
                  </div>
                )}
              </div>
              
              {poke.pokemonDetails && (
                <div className="pokemon-number">
                  #{poke.pokemonDetails.id.toString().padStart(3, '0')}
                </div>
              )}
              
              <div className="pokemon-name">
                {poke.pokemonDetails ? poke.pokemonDetails.name : poke.name}
              </div>
              
              {poke.pokemonDetails && (
                <div className="pokemon-types-container">
                  {poke.pokemonDetails.types.map(typeInfo => (
                    <span 
                      key={typeInfo.type.name} 
                      className={`pokemon-type-badge type-${typeInfo.type.name}`}
                    >
                      {typeInfo.type.name}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="pokemon-caught-indicator">
                Caught Pokemon
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      <Button
        variant="primary"
        className="add-pokemon-btn"
        onClick={() => navigate('/scan-pokemon')}
        title="Scan New Pokemon"
      >
        +
      </Button>

      {/* Pokemon Detail Modal */}
      <Modal show={showDetailModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedPokemon?.pokemonDetails ? (
              <>
                #{selectedPokemon.pokemonDetails.id.toString().padStart(3, '0')} - {selectedPokemon.pokemonDetails.name}
              </>
            ) : (
              selectedPokemon?.name
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPokemon && (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '200px', textAlign: 'center' }}>
                {selectedPokemon.pokemonDetails ? (
                  <img
                    src={selectedPokemon.pokemonDetails.sprites.other?.['official-artwork']?.front_default || 
                         selectedPokemon.pokemonDetails.sprites.front_default || ''}
                    alt={selectedPokemon.pokemonDetails.name}
                    style={{
                      width: '200px',
                      height: '200px',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div 
                    className="pokemon-placeholder"
                    style={{
                      width: '200px',
                      height: '200px',
                      backgroundColor: '#f8f9fa',
                      border: '2px dashed #dee2e6',
                      borderRadius: '8px',
                      margin: '0 auto',
                      fontSize: '48px',
                      color: '#6c757d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    🎮
                  </div>
                )}
              </div>
              <div style={{ flex: '1', minWidth: '250px' }}>
                <h5>Details</h5>
                {selectedPokemon.pokemonDetails && (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Types:</strong>
                      <div style={{ marginTop: '8px' }}>
                        {selectedPokemon.pokemonDetails.types.map(typeInfo => (
                          <span 
                            key={typeInfo.type.name} 
                            className={`pokemon-type-badge type-${typeInfo.type.name}`}
                            style={{ marginRight: '8px' }}
                          >
                            {typeInfo.type.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Height:</strong> {(selectedPokemon.pokemonDetails.height / 10).toFixed(1)}m
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Weight:</strong> {(selectedPokemon.pokemonDetails.weight / 10).toFixed(1)}kg
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Base Experience:</strong> {selectedPokemon.pokemonDetails.base_experience}
                    </div>
                    {selectedPokemon.pokemonDetails.stats && (
                      <div>
                        <strong>Stats:</strong>
                        <div style={{ marginTop: '8px' }}>
                          {selectedPokemon.pokemonDetails.stats.map(stat => (
                            <div key={stat.stat.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ textTransform: 'capitalize' }}>{stat.stat.name.replace('-', ' ')}:</span>
                              <span><strong>{stat.base_stat}</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MyPage;
