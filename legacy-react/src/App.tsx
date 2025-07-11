import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import FloatingMobileDebug from './components/Debug/FloatingMobileDebug';
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
  const { authenticated, loading, user } = useAuth();
  const { isDemoMode } = useDemoMode();
  
  // Use demo mode OR actual authentication
  const isUserLoggedIn = isDemoMode || authenticated;
  
  // Debug logging
  React.useEffect(() => {
    console.log('=== AUTHENTICATION STATE DEBUG ===');
    console.log('Authentication status:', authenticated);
    console.log('Demo mode:', isDemoMode);
    console.log('User logged in (combined):', isUserLoggedIn);
    console.log('Loading state:', loading);
    console.log('Current URL:', window.location.href);
    console.log('User details:', user);
    console.log('=====================================');
  }, [authenticated, isDemoMode, isUserLoggedIn, loading, user]);

  // Show loading while auth is being checked
  if (loading) {
    console.log('🔄 Showing loading screen: Checking authentication...');
    
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Checking authentication...</p>
          <small className="text-muted">
            If this takes too long, try refreshing the page.
          </small>
        </div>
        {/* Add debug button even during loading */}
        <FloatingMobileDebug />
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
        <FloatingMobileDebug />
      </Layout>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <DemoProvider>
        <AppContent />
      </DemoProvider>
    </AuthProvider>
  );
}

export default App;
