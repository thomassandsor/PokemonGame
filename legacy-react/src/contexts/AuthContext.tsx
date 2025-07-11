import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  pokemonCount: number;
  level: number;
  lastPlayed: string;
  loginTime: string;
}

interface AuthContextType {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://pokemongame-functions-2025.azurewebsites.net/api/whoami', {
        credentials: 'include' // Include cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser({
            email: data.email,
            name: data.name,
            pokemonCount: data.pokemonCount,
            level: data.level,
            lastPlayed: data.lastPlayed,
            loginTime: data.loginTime
          });
          setAuthenticated(true);
        } else {
          setUser(null);
          setAuthenticated(false);
        }
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Redirect to our server-side OAuth
    window.location.href = 'https://pokemongame-functions-2025.azurewebsites.net/api/MicrosoftLogin';
  };

  const logout = () => {
    // Clear local state and redirect to logout
    setUser(null);
    setAuthenticated(false);
    // You can add a logout endpoint later if needed
    window.location.href = '/';
  };

  useEffect(() => {
    // Check auth on mount
    checkAuth();
    
    // Check for token in URL (OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      // Token found in URL, clean up URL and check auth
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(checkAuth, 100); // Small delay to ensure token is processed
    }
  }, []);

  const value = {
    user,
    authenticated,
    loading,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
