import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import LoginPage from './components/Auth/LoginPage';
import MyPage from './components/MyPage/MyPage';
import QRScannerPage from './components/QRScanner/QRScannerPage';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { DataverseQueryBuilder } from './constants/dataverseSchema';
import { API_CONFIG } from './config/api';
import BattleArena from './components/BattleArena/BattleArena';
import BattleJoin from './components/BattleArena/BattleJoin';
import BattleResult from './components/BattleArena/BattleResult';
import EvolutionLab from './components/EvolutionLab/EvolutionLab';
import PokemonBrowser from './components/PokemonBrowser/PokemonBrowser';
import Layout from './components/Layout/Layout';
import { DemoProvider, useDemoMode } from './contexts/DemoContext';
import './App.css';

// Wrapper components to provide required props
const BattleArenaWrapper: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userPokemon, setUserPokemon] = useState<any[]>([]);

  // Load user's Pokemon from Dataverse on component mount
  useEffect(() => {
    const loadUserPokemon = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/${DataverseQueryBuilder.getAllPokemon()}`);
        if (response.ok) {
          const data = await response.json();
          // Transform Dataverse data to expected format
          const transformedPokemon = data.value?.map((p: any) => ({
            id: p.pokemon_id,
            pokemon_id: p.pokemon_id, 
            name: p.pokemon_name,
            pokemon_name: p.pokemon_name,
            level: 5, // Default level
            hp: 50, // Default HP
            maxHp: 50,
            attack: 30,
            defense: 25,
            speed: 20,
            types: ['normal'], // Default type
            sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.pokemon_id}.png`,
            moves: ['Tackle', 'Scratch']
          })) || [];
          setUserPokemon(transformedPokemon);
        }
      } catch (error) {
        console.error('Failed to load user Pokemon:', error);
        // Fallback to demo Pokemon if API fails
        setUserPokemon([
          {
            id: '25',
            pokemon_id: 25,
            name: 'Pikachu',
            pokemon_name: 'Pikachu',
            level: 10,
            hp: 60,
            maxHp: 60,
            attack: 35,
            defense: 20,
            speed: 30,
            types: ['electric'],
            sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
            moves: ['Thunderbolt', 'Quick Attack']
          }
        ]);
      }
    };

    loadUserPokemon();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePokemonUpdate = (updatedPokemon: any) => {
    setUserPokemon(prev => 
      prev.map(p => p.id === updatedPokemon.id ? updatedPokemon : p)
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEvolutionAvailable = (pokemon: any, options: any[]) => {
    console.log('Evolution available:', pokemon, options);
  };
  
  return (
    <BattleArena />
  );
};

const EvolutionLabWrapper: React.FC = () => {
  // Mock data for now - in a real app this would come from context or be fetched
  const mockUserPokemon: any[] = [];
  const handlePokemonUpdate = (updatedPokemon: any) => {
    console.log('Pokemon updated:', updatedPokemon);
  };
  
  return (
    <EvolutionLab 
      userPokemon={mockUserPokemon}
      onPokemonUpdate={handlePokemonUpdate}
    />
  );
};

function AppContent() {
  const isAuthenticated = useIsAuthenticated();
  const { accounts, inProgress } = useMsal();
  const { isDemoMode } = useDemoMode();
  const [isLoading, setIsLoading] = useState(true);
  
  // Use demo mode OR actual authentication
  const isUserLoggedIn = isDemoMode || isAuthenticated;
  
  // Handle loading state - wait for MSAL to finish processing
  useEffect(() => {
    // If we're not doing any authentication operations, stop loading
    if (inProgress === 'none') {
      setIsLoading(false);
      return;
    }
    
    // For authentication in progress, give it more time
    const timer = setTimeout(() => {
      console.log('Authentication timeout reached, stopping loading state');
      setIsLoading(false);
    }, 5000); // Increased to 5 seconds for slower connections
    
    return () => clearTimeout(timer);
  }, [inProgress]);
  
  // Separate effect to handle immediate authentication completion
  useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      console.log('User authenticated successfully, stopping loading');
      setIsLoading(false);
    }
  }, [isAuthenticated, accounts]);
  
  // Debug logging
  React.useEffect(() => {
    console.log('=== AUTHENTICATION STATE DEBUG ===');
    console.log('Authentication status:', isAuthenticated);
    console.log('MSAL in progress:', inProgress);
    console.log('Demo mode:', isDemoMode);
    console.log('User logged in (combined):', isUserLoggedIn);
    console.log('Number of accounts:', accounts.length);
    console.log('Loading state:', isLoading);
    console.log('Current URL:', window.location.href);
    console.log('URL hash:', window.location.hash);
    console.log('Accounts details:', accounts.map(acc => ({
      username: acc.username,
      name: acc.name,
      homeAccountId: acc.homeAccountId
    })));
    console.log('MSAL config being used:', {
      authority: process.env.REACT_APP_AUTHORITY,
      clientId: process.env.REACT_APP_CLIENT_ID,
      redirectUri: process.env.REACT_APP_REDIRECT_URI
    });
    console.log('=====================================');
  }, [isAuthenticated, accounts, isDemoMode, isUserLoggedIn, inProgress, isLoading]);

  // Show loading while MSAL processes authentication
  if (isLoading || inProgress !== 'none') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Processing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route 
            path="/login" 
            element={!isUserLoggedIn ? <LoginPage /> : <Navigate to="/my-page" />} 
          />
          <Route 
            path="/my-page" 
            element={isUserLoggedIn ? <MyPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/scan-pokemon" 
            element={isUserLoggedIn ? <QRScannerPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/pokemon-browser" 
            element={isUserLoggedIn ? <PokemonBrowser /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/battle-arena" 
            element={isUserLoggedIn ? <BattleArenaWrapper /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/battle/join/:battleId" 
            element={isUserLoggedIn ? <BattleJoin /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/battle/result/:battleId" 
            element={isUserLoggedIn ? <BattleResult /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/evolution-lab" 
            element={isUserLoggedIn ? <EvolutionLabWrapper /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin" 
            element={isUserLoggedIn ? <AdminPanel /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={isUserLoggedIn ? "/my-page" : "/login"} />} 
          />
        </Routes>
      </Layout>
    </Router>
  );
}

function App() {
  return (
    <DemoProvider>
      <AppContent />
    </DemoProvider>
  );
}

export default App;
