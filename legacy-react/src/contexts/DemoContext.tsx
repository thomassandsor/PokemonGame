import React, { createContext, useContext, useState, useEffect } from 'react';
import { PortalSettingsService } from '../services/portalSettingsService';

interface DemoContextType {
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  demoUser: {
    email: string;
    name: string;
    id: string;
  };
  loading: boolean;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const useDemoMode = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoProvider');
  }
  return context;
};

interface DemoProviderProps {
  children: React.ReactNode;
}

export const DemoProvider: React.FC<DemoProviderProps> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Demo user data
  const demoUser = {
    email: 'sandsor@outlook.com',
    name: 'Demo User',
    id: 'demo-user-123'
  };

  useEffect(() => {
    const initializeDemoMode = async () => {
      try {
        // First, try to get demo mode setting from Dataverse
        let dataverseDemoMode = false;
        let demoSetting = null;
        try {
          demoSetting = await PortalSettingsService.getSetting<boolean>('demo_mode');
          if (demoSetting) {
            dataverseDemoMode = demoSetting.value;
            console.log('Demo mode setting from Dataverse:', dataverseDemoMode);
          }
        } catch (error) {
          console.warn('Failed to load demo mode from Dataverse:', error);
        }

        // Check URL parameters only if Dataverse demo mode is enabled
        const urlParams = new URLSearchParams(window.location.search);
        const demoParam = urlParams.get('demo');
        const bypassParam = urlParams.get('bypass');
        
        if ((demoParam === 'true' || bypassParam === 'true') && dataverseDemoMode) {
          setIsDemoMode(true);
          console.log('Demo mode activated via URL parameter (allowed by Dataverse setting)');
          setLoading(false);
          return;
        } else if ((demoParam === 'true' || bypassParam === 'true') && !dataverseDemoMode) {
          console.warn('URL demo mode parameter ignored - demo mode disabled in Dataverse');
        }

        // Use the Dataverse setting as the primary source
        setIsDemoMode(dataverseDemoMode);
        
        if (!demoSetting) {
          // Fallback to localStorage only if Dataverse setting doesn't exist
          const savedDemoMode = localStorage.getItem('pokemonGameDemoMode');
          if (savedDemoMode === 'true') {
            setIsDemoMode(true);
            console.log('Demo mode activated from localStorage (fallback)');
          }
        }
      } catch (error) {
        console.error('Error initializing demo mode:', error);
        // Final fallback to localStorage
        const savedDemoMode = localStorage.getItem('pokemonGameDemoMode');
        if (savedDemoMode === 'true') {
          setIsDemoMode(true);
          console.log('Demo mode activated from localStorage (error fallback)');
        }
      } finally {
        setLoading(false);
      }
    };

    initializeDemoMode();
  }, []);

  const setDemoMode = async (enabled: boolean) => {
    try {
      setLoading(true);
      
      // Update Dataverse setting
      await PortalSettingsService.setSetting({
        key: 'demo_mode',
        value: enabled,
        description: 'Enable demo mode to bypass authentication for testing. Values: true/false'
      });
      
      setIsDemoMode(enabled);
      
      // Also update localStorage as backup
      localStorage.setItem('pokemonGameDemoMode', enabled.toString());
      
      if (enabled) {
        console.log('Demo mode enabled - acting as user:', demoUser.email);
      } else {
        console.log('Demo mode disabled');
      }
    } catch (error) {
      console.error('Failed to update demo mode setting:', error);
      
      // Fallback to localStorage only
      setIsDemoMode(enabled);
      localStorage.setItem('pokemonGameDemoMode', enabled.toString());
      
      if (enabled) {
        console.log('Demo mode enabled (localStorage fallback) - acting as user:', demoUser.email);
      } else {
        console.log('Demo mode disabled (localStorage fallback)');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoContext.Provider value={{
      isDemoMode,
      setDemoMode,
      demoUser,
      loading
    }}>
      {children}
    </DemoContext.Provider>
  );
};
