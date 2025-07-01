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
        
        // Enhance with Pokemon details from JSON data
        const allPokemonData = pokemonData as Pokemon[];
        const enhancedPokemon: EnhancedCaughtPokemon[] = userPokemon.map(caught => {
          const pokemonDetails = allPokemonData.find(p => p.id.toString() === caught.pokemonId);
          return {
            ...caught,
            pokemonDetails
          };
        });
        
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
                {poke.pokemonDetails && (
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
                    />
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
                      <div className="pokemon-name text-capitalize">{poke.name}</div>
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
                  
                  <Card.Text className="text-muted text-center">
                    <small>Caught Pokemon</small>
                  </Card.Text>
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
