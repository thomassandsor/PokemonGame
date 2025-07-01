import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useMsal, useAccount } from '@azure/msal-react';
import { getCaughtPokemonByTrainer, getContactByEmail, type CaughtPokemon, type Contact } from '../../services/azureFunctionsDataverseService';
import { dataverseService } from '../../services/azureFunctionsDataverseService';
import { Pokemon } from '../../types/pokemon';
import pokemonData from '../../data/pokemon.json';
import './MyPage.css';

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
      
      setContact(userContact);
      
      // Load user's Pokemon
      if (userContact?.contactid) {
        const userPokemon = await getCaughtPokemonByTrainer(userContact.contactid);
        console.log('Raw caught Pokemon data:', userPokemon);
        
        // Enhance with Pokemon details from JSON data
        const allPokemonData = pokemonData as Pokemon[];
        const enhancedPokemon: EnhancedCaughtPokemon[] = userPokemon.map(caught => {
          console.log(`Looking for Pokemon with ID: ${caught.pokemonId}, Name: ${caught.name}`);
          
          let pokemonDetails: Pokemon | undefined;
          
          // Strategy 1: Extract Pokemon number from name (format: "123 - Pokemonname")
          if (caught.name && caught.name.includes(' - ')) {
            const match = caught.name.match(/^(\d+)\s*-\s*(.+)$/);
            if (match) {
              const pokemonNumber = parseInt(match[1]);
              const pokemonName = match[2].trim();
              
              // Try to find by number first (most reliable)
              pokemonDetails = allPokemonData.find(p => p.id === pokemonNumber);
              
              // If not found by number, try by name
              if (!pokemonDetails) {
                pokemonDetails = allPokemonData.find(p => 
                  p.name.toLowerCase() === pokemonName.toLowerCase()
                );
              }
              
              console.log(`Extracted from name: number=${pokemonNumber}, name=${pokemonName}`);
            }
          }
          
          // Strategy 2: Try by pokemonId if it's a valid number
          if (!pokemonDetails && caught.pokemonId && !isNaN(Number(caught.pokemonId))) {
            const numericId = Number(caught.pokemonId);
            pokemonDetails = allPokemonData.find(p => p.id === numericId);
            console.log(`Tried by pokemonId: ${numericId}`);
          }
          
          // Strategy 3: Try by exact string match on pokemonId
          if (!pokemonDetails && caught.pokemonId) {
            pokemonDetails = allPokemonData.find(p => p.id.toString() === caught.pokemonId);
            console.log(`Tried by string pokemonId: ${caught.pokemonId}`);
          }
          
          // Strategy 4: Try by name matching (fallback)
          if (!pokemonDetails && caught.name) {
            // Clean up the name - remove numbers and hyphens if present
            const cleanName = caught.name.replace(/^\d+\s*-\s*/, '').trim();
            pokemonDetails = allPokemonData.find(p => 
              p.name.toLowerCase() === cleanName.toLowerCase()
            );
            console.log(`Tried by clean name: ${cleanName}`);
          }
          
          if (pokemonDetails) {
            console.log(`✅ Pokemon ${caught.pokemonId} successfully mapped to: ${pokemonDetails.name} (#${pokemonDetails.id})`);
          } else {
            console.warn(`❌ Failed to map Pokemon: ID=${caught.pokemonId}, Name=${caught.name}`);
          }
          
          return {
            ...caught,
            pokemonDetails
          };
        });
        
        console.log('Enhanced Pokemon data:', enhancedPokemon);
        setPokemon(enhancedPokemon);
      }
      
    } catch (error) {
      console.error('Error initializing user:', error);
      setError('Failed to load your Pokemon data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get Pokemon type colors
  const getTypeColor = (type: string): string => {
    const typeColors: { [key: string]: string } = {
      normal: '#a8a878',
      fire: '#f08030',
      water: '#6890f0',
      electric: '#f8d030',
      grass: '#78c850',
      ice: '#98d8d8',
      fighting: '#c03028',
      poison: '#a040a0',
      ground: '#e0c068',
      flying: '#a890f0',
      psychic: '#f85888',
      bug: '#a8b820',
      rock: '#b8a038',
      ghost: '#705898',
      dragon: '#7038f8',
      dark: '#705848',
      steel: '#b8b8d0',
      fairy: '#ee99ac'
    };
    return typeColors[type] || '#68a090';
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading your Pokemon...</p>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1>Welcome, {contact?.firstname || 'Trainer'}! 🎯</h1>
              <p className="text-muted">
                You have caught {pokemon.length} Pokemon so far!
              </p>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {pokemon.length === 0 ? (
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <Card className="p-4">
              <Card.Body>
                <h3>No Pokemon Yet! 🔍</h3>
                <p className="text-muted mb-4">
                  Start your Pokemon journey by scanning QR codes to catch your first Pokemon!
                </p>
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => navigate('/scan-pokemon')}
                >
                  Scan Your First Pokemon
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row className="pokemon-grid">
          {pokemon.map((poke) => (
            <Col key={poke.pokedexId} lg={4} md={6} className="mb-4">
              <Card className="pokemon-card h-100">
                {poke.pokemonDetails ? (
                  <div className="pokemon-image-container text-center pt-3">
                    <img
                      src={poke.pokemonDetails.sprites.official_artwork || poke.pokemonDetails.sprites.front_default || ''}
                      alt={poke.pokemonDetails.name}
                      className="pokemon-image"
                      style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        // Fallback to front_default if official_artwork fails
                        const img = e.target as HTMLImageElement;
                        if (img.src !== poke.pokemonDetails?.sprites.front_default) {
                          img.src = poke.pokemonDetails?.sprites.front_default || '';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="pokemon-image-container text-center pt-3">
                    <div 
                      className="pokemon-placeholder"
                      style={{
                        width: '120px',
                        height: '120px',
                        backgroundColor: '#f8f9fa',
                        border: '2px dashed #dee2e6',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        flexDirection: 'column'
                      }}
                    >
                      <span className="text-muted" style={{ fontSize: '12px' }}>No Image</span>
                      {poke.name && poke.name.includes(' - ') && (
                        <span className="text-muted" style={{ fontSize: '10px', marginTop: '4px' }}>
                          #{poke.name.split(' - ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <Card.Body>
                  <Card.Title className="text-center">
                    {poke.pokemonDetails ? (
                      <>
                        <div className="pokemon-number text-muted small">
                          #{poke.pokemonDetails.id.toString().padStart(3, '0')}
                        </div>
                        <div className="pokemon-name text-capitalize">
                          {poke.pokemonDetails.name}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="pokemon-number text-muted small">
                          {/* Try to extract Pokemon number from name if available */}
                          {poke.name && poke.name.includes(' - ') ? (
                            <>#{poke.name.split(' - ')[0].padStart(3, '0')}</>
                          ) : (
                            <>ID: {poke.pokemonId}</>
                          )}
                        </div>
                        <div className="pokemon-name text-capitalize">
                          {/* Display the clean Pokemon name */}
                          {poke.name && poke.name.includes(' - ') ? (
                            poke.name.split(' - ')[1]
                          ) : (
                            poke.name || 'Unknown Pokemon'
                          )}
                        </div>
                      </>
                    )}
                  </Card.Title>
                  
                  {poke.pokemonDetails && (
                    <div className="pokemon-types text-center mb-3">
                      {poke.pokemonDetails.types.map(type => (
                        <span 
                          key={type} 
                          className={`badge me-1 type-${type}`}
                          style={{
                            backgroundColor: getTypeColor(type),
                            color: 'white'
                          }}
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-muted text-center">
                    <small>Caught Pokemon</small>
                    {poke.pokemonDetails && (
                      <div className="text-success small">✓ Data loaded</div>
                    )}
                    {!poke.pokemonDetails && (
                      <div className="text-warning">
                        <small>⚠️ Details not found in database</small>
                        <br />
                        <small className="text-muted">
                          Showing cached data
                        </small>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
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
    </Container>
  );
};

export default MyPage;
