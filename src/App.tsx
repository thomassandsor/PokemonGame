import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import LoginPage from './components/Auth/LoginPage';
import MyPage from './components/MyPage/MyPage';
import QRScannerPage from './components/QRScanner/QRScannerPage';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { DataverseQueryBuilder } from './constants/dataverseSchema';
import BattleArena from './components/BattleArena/BattleArena';
import EvolutionLab from './components/EvolutionLab/EvolutionLab';
import PokemonBrowser from './components/PokemonBrowser/PokemonBrowser';
import Layout from './components/Layout/Layout';
import './App.css';

// Wrapper components to provide required props
const BattleArenaWrapper: React.FC = () => {
  const [userPokemon, setUserPokemon] = useState<any[]>([]);

  // Load user's Pokemon from Dataverse on component mount
  useEffect(() => {
    const loadUserPokemon = async () => {
      try {
        const response = await fetch(`/api/dataverse/${DataverseQueryBuilder.getAllPokemon()}`);
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

  const handlePokemonUpdate = (updatedPokemon: any) => {
    setUserPokemon(prev => 
      prev.map(p => p.id === updatedPokemon.id ? updatedPokemon : p)
    );
  };

  const handleEvolutionAvailable = (pokemon: any, options: any[]) => {
    console.log('Evolution available:', pokemon, options);
  };
  
  return (
    <BattleArena 
      userPokemon={userPokemon}
      onPokemonUpdate={handlePokemonUpdate}
      onEvolutionAvailable={handleEvolutionAvailable}
    />
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

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();
  
  // Demo mode for UI testing (temporary)
  const urlParams = new URLSearchParams(window.location.search);
  const isDemoMode = urlParams.get('demo') === 'true';
  const effectiveAuth = isAuthenticated || isDemoMode;
  
  // Debug logging
  React.useEffect(() => {
    console.log('Authentication status:', isAuthenticated);
    console.log('Demo mode:', isDemoMode);
    console.log('Effective auth:', effectiveAuth);
    console.log('Number of accounts:', accounts.length);
    console.log('Accounts:', accounts);
    console.log('MSAL config being used:', {
      authority: process.env.REACT_APP_AUTHORITY,
      clientId: process.env.REACT_APP_CLIENT_ID,
      redirectUri: process.env.REACT_APP_REDIRECT_URI
    });
  }, [isAuthenticated, accounts, isDemoMode, effectiveAuth]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route 
            path="/login" 
            element={!effectiveAuth ? <LoginPage /> : <Navigate to="/my-page" />} 
          />
          <Route 
            path="/my-page" 
            element={effectiveAuth ? <MyPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/scan-pokemon" 
            element={effectiveAuth ? <QRScannerPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/pokemon-browser" 
            element={effectiveAuth ? <PokemonBrowser /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/battle-arena" 
            element={effectiveAuth ? <BattleArenaWrapper /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/evolution-lab" 
            element={effectiveAuth ? <EvolutionLabWrapper /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin" 
            element={effectiveAuth ? <AdminPanel /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={effectiveAuth ? "/my-page" : "/login"} />} 
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
