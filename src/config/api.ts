// API configuration for the Pokemon Game

// Determine the base URL based on environment
const getBaseUrl = (): string => {
  // If environment variable is set, use it
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // If running in production (on azurestaticapps.net), use production URL
  if (window.location.hostname.includes('azurestaticapps.net')) {
    return 'https://pokemongame-functions-2025.azurewebsites.net/api/dataverse';
  }
  
  // Otherwise, assume local development
  return 'http://localhost:7071/api/dataverse';
};

export const API_CONFIG = {
  // Azure Functions base URL - smart detection of environment
  BASE_URL: getBaseUrl(),
  
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
