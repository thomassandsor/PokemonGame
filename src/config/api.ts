// API configuration for the Pokemon Game
export const API_CONFIG = {
  // Azure Functions base URL - uses environment variable or localhost for development
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:7071/api/dataverse',
  
  // API endpoints
  ENDPOINTS: {
    CONTACTS: '/contacts',
    POKEMON: '/cr6b1_pokemons',
    BATTLES: '/pokemon_battles',
    HEALTH: '/health',
    HELLO: '/hello'
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string, params?: string): string => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  return params ? `${url}?${params}` : url;
};
