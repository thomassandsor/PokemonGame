import React, { useState } from 'react';
import { PokemonImportService, ImportResult } from '../../services/pokemonImportService';
import '../../styles/AdminPanel.css';

interface AdminPanelProps {}

export const AdminPanel: React.FC<AdminPanelProps> = () => {
  const [selectedTab, setSelectedTab] = useState<'pokemon' | 'users' | 'system'>('pokemon');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [customPokemonIds, setCustomPokemonIds] = useState<string>('');

  const handleQuickImport = async () => {
    setImportStatus('importing');
    setImportResult(null);
    
    try {
      const popularIds = PokemonImportService.getPopularPokemonIds().slice(0, 20); // Import first 20
      const result = await PokemonImportService.importAndSave(popularIds);
      
      setImportResult(result);
      setImportStatus(result.success ? 'success' : 'error');
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        failed: 20,
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
      </div>

      <div className="admin-content">
        {selectedTab === 'pokemon' && (
          <div className="admin-section">
            <h2>🐾 Pokemon Data Management</h2>
            
            <div className="admin-cards">
              <div className="admin-card">
                <h3>📥 Quick Import Popular Pokemon</h3>
                <p>Import the first 20 most popular Pokemon from PokeAPI</p>
                <button 
                  className="admin-button primary"
                  onClick={handleQuickImport}
                  disabled={importStatus === 'importing'}
                >
                  {importStatus === 'importing' ? '🔄 Importing...' : '📥 Quick Import'}
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
                <h3>🔧 API Configuration</h3>
                <p>Configure API endpoints and authentication</p>
                <button className="admin-button">⚙️ Configure APIs</button>
              </div>
              <div className="admin-card">
                <h3>🗃️ Database Management</h3>
                <p>Backup and maintenance operations</p>
                <button className="admin-button">🗃️ Database Tools</button>
              </div>
              <div className="admin-card">
                <h3>📱 App Settings</h3>
                <p>Configure app-wide settings and features</p>
                <button className="admin-button">📱 App Settings</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
