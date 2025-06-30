import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useMsal, useAccount } from '@azure/msal-react';
import { getPokemonByTrainer, getContactByEmail, type Pokemon, type Contact } from '../../services/backendDataverseService';
import { dataverseService } from '../../services/backendDataverseService';

const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0] || {});
  
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contact, setContact] = useState<Contact | null>(null);

  useEffect(() => {
    initializeUser();
  }, [account]);

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
        const userPokemon = await getPokemonByTrainer(userContact.contactid);
        setPokemon(userPokemon);
      }
      
    } catch (error) {
      console.error('Error initializing user:', error);
      setError('Failed to load your Pokemon data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
            <Col key={poke.new_pokemonid} lg={4} md={6} className="mb-4">
              <Card className="pokemon-card h-100">
                {poke.new_imageurl && (
                  <Card.Img 
                    variant="top" 
                    src={poke.new_imageurl} 
                    className="pokemon-image"
                    alt={poke.new_name}
                  />
                )}
                <Card.Body>
                  <Card.Title>{poke.new_name}</Card.Title>
                  {poke.new_species && (
                    <Card.Text>
                      <strong>Species:</strong> {poke.new_species}
                    </Card.Text>
                  )}
                  {poke.new_type && (
                    <Card.Text>
                      <strong>Type:</strong> {poke.new_type}
                    </Card.Text>
                  )}
                  {poke.new_level && (
                    <Card.Text>
                      <strong>Level:</strong> {poke.new_level}
                    </Card.Text>
                  )}
                  {poke.new_caughtdate && (
                    <Card.Text className="text-muted">
                      <small>Caught: {formatDate(poke.new_caughtdate)}</small>
                    </Card.Text>
                  )}
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
