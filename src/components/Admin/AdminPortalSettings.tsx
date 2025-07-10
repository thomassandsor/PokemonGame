import React, { useState, useEffect } from 'react';
import { PortalSettingsService, TypedPortalSetting } from '../../services/portalSettingsService';
import MobileDebugPanel from '../Debug/MobileDebugPanel';
import './AdminPortalSettings.css';

interface AdminPortalSettingsProps {
  onClose?: () => void;
}

const KNOWN_SETTINGS = [
  {
    key: 'battle_turns',
    label: 'Battle Turn Limit',
    description: 'Maximum number of turns allowed in a Pokemon battle before timeout',
    type: 'number',
    defaultValue: 50,
    min: 1,
    max: 100
  }
];

export default function AdminPortalSettings({ onClose }: AdminPortalSettingsProps) {
  const [settings, setSettings] = useState<TypedPortalSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showMobileDebug, setShowMobileDebug] = useState(false);

  // Load all settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const allSettings = await PortalSettingsService.getAllSettings();
      setSettings(allSettings);
    } catch (err) {
      setError('Failed to load portal settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string | number) => {
    setSaving(key);
    setError(null);
    setMessage(null);
    
    try {
      const setting: TypedPortalSetting = {
        key,
        value,
        description: KNOWN_SETTINGS.find(s => s.key === key)?.description
      };
      
      await PortalSettingsService.setSetting(setting);
      setMessage(`✅ Setting "${key}" saved successfully`);
      
      // Reload settings to get updated values
      await loadSettings();
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(`Failed to save setting "${key}"`);
      console.error('Error saving setting:', err);
    } finally {
      setSaving(null);
    }
  };

  const getCurrentValue = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    if (setting) {
      return String(setting.value);
    }
    const knownSetting = KNOWN_SETTINGS.find(s => s.key === key);
    return knownSetting ? String(knownSetting.defaultValue) : '';
  };

  const handleInputChange = (key: string, value: string, type: string) => {
    if (type === 'number') {
      const parsedValue = parseInt(value);
      if (isNaN(parsedValue)) return;
      saveSetting(key, parsedValue);
    } else {
      saveSetting(key, value);
    }
  };

  return (
    <div className="admin-portal-settings">
      <div className="admin-header">
        <h2>🔧 Portal Settings Administration</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading settings...</div>
      ) : (
        <div className="settings-grid">
          {KNOWN_SETTINGS.map(setting => {
            const currentValue = getCurrentValue(setting.key);
            const isSaving = saving === setting.key;
            
            return (
              <div key={setting.key} className="setting-card">
                <div className="setting-header">
                  <h3>{setting.label}</h3>
                  <span className="setting-key">{setting.key}</span>
                </div>
                
                <p className="setting-description">{setting.description}</p>
                
                <div className="setting-input-group">
                  <label htmlFor={setting.key}>Value:</label>
                  <input
                    id={setting.key}
                    type={setting.type}
                    value={currentValue}
                    min={setting.min}
                    max={setting.max}
                    disabled={isSaving}
                    onChange={(e) => handleInputChange(setting.key, e.target.value, setting.type)}
                    className={isSaving ? 'saving' : ''}
                  />
                  {isSaving && <span className="saving-indicator">💾</span>}
                </div>
                
                <div className="setting-constraints">
                  {setting.type === 'number' && (
                    <small>Range: {setting.min} - {setting.max}</small>
                  )}
                  <small>Default: {setting.defaultValue}</small>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="admin-actions">
        <button 
          onClick={loadSettings} 
          disabled={loading}
          className="refresh-btn"
        >
          🔄 Refresh Settings
        </button>
        
        <button 
          onClick={() => setShowMobileDebug(!showMobileDebug)}
          className="debug-btn"
        >
          📱 {showMobileDebug ? 'Hide' : 'Show'} Mobile Debug
        </button>
        
        <button 
          onClick={() => {
            // Import the debug function for testing
            import('../../services/pvpBattleService').then(module => {
              module.debugPortalSettings();
            });
          }}
          className="debug-btn"
        >
          🔍 Debug Settings
        </button>
      </div>

      {showMobileDebug && (
        <div className="mobile-debug-section">
          <MobileDebugPanel />
        </div>
      )}
    </div>
  );
}
