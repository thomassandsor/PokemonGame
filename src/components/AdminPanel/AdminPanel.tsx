import React, { useState } from 'react';
import { PokemonImportService, ImportResult } from '../../services/pokemonImportService';
import { PortalSettingsService } from '../../services/portalSettingsService';
import { useDemoMode } from '../../contexts/DemoContext';
import AdminPortalSettings from '../Admin/AdminPortalSettings';
import defaultSettings from '../../data/defaultPortalSettings.json';
import '../../styles/AdminPanel.css';

interface AdminPanelProps {}

export const AdminPanel: React.FC<AdminPanelProps> = () => {
  const [selectedTab, setSelectedTab] = useState<'pokemon' | 'users' | 'system' | 'settings'>('pokemon');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [customPokemonIds, setCustomPokemonIds] = useState<string>('');
  const [pokemonCount, setPokemonCount] = useState<number>(20); // New state for Pokemon count
  const { isDemoMode, setDemoMode, demoUser, loading: demoLoading } = useDemoMode();
  const [settingsImportStatus, setSettingsImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [settingsImportResult, setSettingsImportResult] = useState<{ imported: number; skipped: number; failed: number; errors: string[] } | null>(null);

  const handleQuickImport = async () => {
    setImportStatus('importing');
    setImportResult(null);
    
    try {
      const popularIds = PokemonImportService.getPopularPokemonIds().slice(0, pokemonCount);
      const result = await PokemonImportService.importAndSave(popularIds);
      
      setImportResult(result);
      setImportStatus(result.success ? 'success' : 'error');
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        failed: pokemonCount,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      setImportStatus('error');
    }
  };

  const handleCustomImport = async () => {
    if (!customPokemonIds.trim()) {
      alert('Please enter Pokemon IDs');
      return;
    }

    setImportStatus('importing');
    setImportResult(null);
    
    try {
      const ids = customPokemonIds
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0);
      
      if (ids.length === 0) {
        throw new Error('No valid Pokemon IDs provided');
      }

      const result = await PokemonImportService.importAndSave(ids);
      
      setImportResult(result);
      setImportStatus(result.success ? 'success' : 'error');
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      setImportStatus('error');
    }
  };

  const handleTestDataverseConnection = async () => {
    try {
      const response = await fetch('/api/dataverse/cr6b1_pokemons?$top=1');
      if (response.ok) {
        alert('✅ Dataverse connection successful!');
      } else {
        alert(`❌ Dataverse connection failed: ${response.statusText}`);
      }
    } catch (error) {
      alert(`❌ Dataverse connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSettingsImport = async () => {
    setSettingsImportStatus('importing');
    setSettingsImportResult(null);
    
    try {
      // Import from the JSON file
      const settings = defaultSettings.portal_settings.settings.map(setting => ({
        key: setting.key,
        value: setting.value,
        description: setting.description
      }));
      
      // Import with skipIfSameValue option to avoid unnecessary updates
      const result = await PortalSettingsService.importDefaultSettings(settings, { skipIfSameValue: true });
      
      setSettingsImportResult(result);
      setSettingsImportStatus(result.failed === 0 ? 'success' : 'error');
    } catch (error) {
      setSettingsImportResult({
        imported: 0,
        skipped: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      setSettingsImportStatus('error');
    }
  };

  return (
    <div className="pokemon-page-container">
      <div className="pokemon-page-header">
        <h1>🔧 Admin Panel</h1>
        <p>Manage your Pokémon game system</p>
      </div>

      <div className="admin-nav">
        <button 
          className={`nav-button ${selectedTab === 'pokemon' ? 'active' : ''}`}
          onClick={() => setSelectedTab('pokemon')}
        >
          🐾 Pokemon Management
        </button>
        <button 
          className={`nav-button ${selectedTab === 'users' ? 'active' : ''}`}
          onClick={() => setSelectedTab('users')}
        >
          👥 User Management
        </button>
        <button 
          className={`nav-button ${selectedTab === 'system' ? 'active' : ''}`}
          onClick={() => setSelectedTab('system')}
        >
          ⚙️ System Settings
        </button>
        <button 
          className={`nav-button ${selectedTab === 'settings' ? 'active' : ''}`}
          onClick={() => setSelectedTab('settings')}
        >
          🔧 Portal Settings
        </button>
      </div>

      <div className="admin-content">
        {selectedTab === 'pokemon' && (
          <div className="admin-section">
            <h2>🐾 Pokemon Data Management</h2>
            
            <div className="admin-cards">
              <div className="admin-card">
                <h3>📥 Quick Import Popular Pokemon</h3>
                <p>Import the most popular Pokemon from PokeAPI</p>
                <div className="pokemon-count-selector">
                  <label htmlFor="pokemonCount">Number of Pokemon to import:</label>
                  <input
                    id="pokemonCount"
                    type="range"
                    min="1"
                    max="150"
                    value={pokemonCount}
                    onChange={(e) => setPokemonCount(Number(e.target.value))}
                    className="pokemon-range"
                    disabled={importStatus === 'importing'}
                  />
                  <div className="range-display">
                    <span className="range-value">{pokemonCount}</span>
                    <span className="range-label">Pokemon</span>
                  </div>
                </div>
                <button 
                  className="admin-button primary"
                  onClick={handleQuickImport}
                  disabled={importStatus === 'importing'}
                >
                  {importStatus === 'importing' ? `🔄 Importing ${pokemonCount} Pokemon...` : `📥 Import ${pokemonCount} Pokemon`}
                </button>
              </div>

              <div className="admin-card">
                <h3>🎯 Custom Pokemon Import</h3>
                <p>Import specific Pokemon by their IDs (comma separated)</p>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., 1,4,7,25,133"
                  value={customPokemonIds}
                  onChange={(e) => setCustomPokemonIds(e.target.value)}
                  disabled={importStatus === 'importing'}
                />
                <button 
                  className="admin-button primary"
                  onClick={handleCustomImport}
                  disabled={importStatus === 'importing' || !customPokemonIds.trim()}
                >
                  {importStatus === 'importing' ? '🔄 Importing...' : '📥 Import Custom'}
                </button>
              </div>

              <div className="admin-card">
                <h3>🔌 Test Dataverse Connection</h3>
                <p>Verify connection to Microsoft Dataverse</p>
                <button 
                  className="admin-button secondary"
                  onClick={handleTestDataverseConnection}
                >
                  🔍 Test Connection
                </button>
              </div>
            </div>

            {importResult && (
              <div className={`import-result ${importStatus}`}>
                <h3>📊 Import Results</h3>
                <div className="result-stats">
                  <div className="stat success">
                    <span className="stat-label">✅ Imported:</span>
                    <span className="stat-value">{importResult.imported}</span>
                  </div>
                  <div className="stat error">
                    <span className="stat-label">❌ Failed:</span>
                    <span className="stat-value">{importResult.failed}</span>
                  </div>
                </div>
                
                {importResult.errors.length > 0 && (
                  <div className="error-details">
                    <h4>⚠️ Errors:</h4>
                    <ul>
                      {importResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'users' && (
          <div className="admin-section">
            <h2>👥 User Management</h2>
            <div className="admin-cards">
              <div className="admin-card">
                <h3>📊 User Statistics</h3>
                <p>View user registration and activity stats</p>
                <button className="admin-button">📈 View Stats</button>
              </div>
              <div className="admin-card">
                <h3>🔍 User Search</h3>
                <p>Search and manage user accounts</p>
                <button className="admin-button">🔍 Search Users</button>
              </div>
              <div className="admin-card">
                <h3>🏆 Leaderboards</h3>
                <p>Manage Pokemon collection leaderboards</p>
                <button className="admin-button">🏆 Manage Leaderboards</button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'system' && (
          <div className="admin-section">
            <h2>⚙️ System Settings</h2>
            <div className="admin-cards">
              <div className="admin-card">
                <h3>📥 Portal Settings Import</h3>
                <p>Import default portal settings from JSON configuration</p>
                {settingsImportResult && (
                  <div className={`import-result ${settingsImportStatus}`}>
                    <p><strong>Import Results:</strong></p>
                    <p>✅ Imported: {settingsImportResult.imported}</p>
                    <p>⏭️ Skipped (unchanged): {settingsImportResult.skipped}</p>
                    <p>❌ Failed: {settingsImportResult.failed}</p>
                    {settingsImportResult.errors.length > 0 && (
                      <div className="import-errors">
                        <p><strong>Errors:</strong></p>
                        <ul>
                          {settingsImportResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <button 
                  className="admin-button primary"
                  onClick={handleSettingsImport}
                  disabled={settingsImportStatus === 'importing'}
                >
                  {settingsImportStatus === 'importing' ? '🔄 Importing Settings...' : '📥 Import Portal Settings'}
                </button>
              </div>
              
              <div className="admin-card">
                <h3>🎭 Demo Mode</h3>
                <p>Enable testing mode to bypass authentication</p>
                <div className="demo-mode-info">
                  <p><strong>Status:</strong> {demoLoading ? '🔄 Loading...' : (isDemoMode ? '✅ Enabled' : '❌ Disabled')}</p>
                  {isDemoMode && !demoLoading && (
                    <p><strong>Demo User:</strong> {demoUser.email}</p>
                  )}
                  <p><strong>Storage:</strong> Dataverse (pokemon_portalsetting)</p>
                </div>
                <div className="demo-mode-controls">
                  <button 
                    className={`admin-button ${isDemoMode ? 'secondary' : 'primary'}`}
                    onClick={() => setDemoMode(!isDemoMode)}
                    disabled={demoLoading}
                  >
                    {demoLoading ? '🔄 Updating...' : (isDemoMode ? '🔒 Disable Demo Mode' : '🎭 Enable Demo Mode')}
                  </button>
                </div>
                <div className="demo-mode-help">
                  <p><small>💡 <strong>URL Bypass:</strong> Add <code>?demo=true</code> or <code>?bypass=true</code> to any URL to enable demo mode</small></p>
                  <p><small>Example: <code>http://localhost:3000/battle-arena?demo=true</code></small></p>
                  <p><small>⚙️ Setting is stored in Dataverse and affects all users globally</small></p>
                </div>
              </div>
              
              <div className="admin-card">
                <h3>🔧 API Configuration</h3>
                <p>Configure API endpoints and authentication</p>
                <button className="admin-button">⚙️ Configure APIs</button>
              </div>
              <div className="admin-card">
                <h3>🗃️ Database Management</h3>
                <p>Backup and maintenance operations</p>
                <button 
                  className="admin-button"
                  onClick={handleTestDataverseConnection}
                >
                  🔗 Test Dataverse Connection
                </button>
              </div>
              <div className="admin-card">
                <h3>📱 App Settings</h3>
                <p>Configure app-wide settings and features</p>
                <button className="admin-button">📱 View All Settings</button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'settings' && (
          <div className="admin-section">
            <AdminPortalSettings />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
