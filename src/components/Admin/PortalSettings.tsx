import React, { useState, useEffect } from 'react';
import { PortalSettingsService, TypedPortalSetting } from '../../services/portalSettingsService';
import './PortalSettings.css';

const PortalSettings: React.FC = () => {
  const [battleTurns, setBattleTurns] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load current settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load battle turns setting
      const battleTurnsSetting = await PortalSettingsService.getSetting<number>('battle_turns');
      if (battleTurnsSetting?.value) {
        setBattleTurns(parseInt(String(battleTurnsSetting.value)));
      }
    } catch (err) {
      console.error('Error loading portal settings:', err);
      setError('Failed to load portal settings');
    } finally {
      setLoading(false);
    }
  };

  const saveBattleTurns = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const setting: TypedPortalSetting<number> = {
        key: 'battle_turns',
        value: battleTurns,
        description: 'Maximum number of turns allowed in Pokemon battles'
      };

      await PortalSettingsService.setSetting(setting);
      setMessage('✅ Battle turns setting saved successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving battle turns:', err);
      setError('Failed to save battle turns setting');
    } finally {
      setSaving(false);
    }
  };

  const handleBattleTurnsChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 100) {
      setBattleTurns(numValue);
    }
  };

  if (loading) {
    return (
      <div className="portal-settings">
        <div className="loading-message">🔄 Loading portal settings...</div>
      </div>
    );
  }

  return (
    <div className="portal-settings">
      <div className="settings-header">
        <h2>🔧 Portal Settings</h2>
        <p>Configure system-wide game settings</p>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="settings-section">
        <h3>⚔️ Battle Configuration</h3>
        
        <div className="setting-item">
          <label htmlFor="battle-turns">
            <strong>Maximum Battle Turns:</strong>
            <span className="setting-description">
              Maximum number of turns allowed before a battle times out
            </span>
          </label>
          <div className="setting-control">
            <input
              id="battle-turns"
              type="number"
              min="1"
              max="100"
              value={battleTurns}
              onChange={(e) => handleBattleTurnsChange(e.target.value)}
              className="number-input"
            />
            <button 
              onClick={saveBattleTurns}
              disabled={saving}
              className="save-btn"
            >
              {saving ? '💾 Saving...' : '💾 Save'}
            </button>
          </div>
          <div className="setting-info">
            Current value: <strong>{battleTurns} turns</strong>
          </div>
        </div>
      </div>

      <div className="settings-footer">
        <p>💡 <strong>Note:</strong> Changes take effect immediately for new battles.</p>
      </div>
    </div>
  );
};

export default PortalSettings;
