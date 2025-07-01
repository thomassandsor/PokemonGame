import React, { useState, useEffect } from 'react';
import { pokemonMasterDataService } from '../../services/pokemonMasterDataService';
import { importAllPokemon, validatePokemonImport, getPokemonCount } from '../../services/pokemonImportService';
import '../../styles/AdminPanel.css';

interface ImportProgress {
  current: number;
  total: number;
  currentPokemon: string;
  isRunning: boolean;
}

interface ImportResult {
  success: boolean;
  importedCount?: number;
  error?: string;
}

interface MasterDataImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
}

export const EnhancedAdminPanel: React.FC = () => {
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    currentPokemon: '',
    isRunning: false
  });
  
  const [result, setResult] = useState<ImportResult | null>(null);
  const [masterDataResult, setMasterDataResult] = useState<MasterDataImportResult | null>(null);
  const [pokemonCount, setPokemonCount] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [dataValidationResult, setDataValidationResult] = useState<any>(null);
  const [importStatus, setImportStatus] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    loadImportStatus();
    refreshPokemonCount();
  }, []);

  const loadImportStatus = async () => {
    try {
      const status = await pokemonMasterDataService.getImportStatus();
      setImportStatus(status);
    } catch (error) {
      console.error('Failed to load import status:', error);
    }
  };

  const handleImportMasterData = async () => {
    setIsImporting(true);
    setMasterDataResult(null);
    
    try {
      const result = await pokemonMasterDataService.importAllPokemonToDataverse();
      setMasterDataResult(result);
      await loadImportStatus(); // Refresh status
      await refreshPokemonCount(); // Refresh count
    } catch (error) {
      setMasterDataResult({
        success: false,
        imported: 0,
        updated: 0,
        errors: [`Master data import failed: ${error}`]
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleValidateData = async () => {
    setIsValidating(true);
    setDataValidationResult(null);
    
    try {
      const result = await pokemonMasterDataService.validateDataConsistency();
      setDataValidationResult(result);
    } catch (error) {
      setDataValidationResult({
        isConsistent: false,
        error: `Validation failed: ${error}`
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImportPokemon = async () => {
    setProgress({ current: 0, total: 0, currentPokemon: '', isRunning: true });
    setResult(null);
    
    try {
      const importedCount = await importAllPokemon((current: number, total: number, name: string) => {
        setProgress({
          current,
          total,
          currentPokemon: name,
          isRunning: true
        });
      });
      
      setResult({ success: true, importedCount });
      
      // Refresh count after import
      await refreshPokemonCount();
      
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setProgress(prev => ({ ...prev, isRunning: false }));
    }
  };

  const refreshPokemonCount = async () => {
    try {
      const count = await getPokemonCount();
      setPokemonCount(count);
    } catch (error) {
      console.error('Failed to get Pokemon count:', error);
    }
  };

  const handleValidateImport = async () => {
    try {
      const validation = await validatePokemonImport();
      setValidationResult(validation);
    } catch (error) {
      setValidationResult({ error: error instanceof Error ? error.message : 'Validation failed' });
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>🔧 Pokemon Game Admin Panel</h2>
        <p>Manage Pokemon data import and validation for battle system</p>
      </div>

      {/* Import Status */}
      {importStatus && (
        <div className="admin-section status-section">
          <h3>📊 Data Status</h3>
          <div className="status-grid">
            <div className="status-card">
              <div className="status-label">Pokemon in JSON</div>
              <div className="status-value">{importStatus.totalInJson}</div>
            </div>
            <div className="status-card">
              <div className="status-label">Pokemon in Dataverse Master</div>
              <div className="status-value">{importStatus.totalInDataverse}</div>
            </div>
            <div className="status-card">
              <div className="status-label">User Collection Count</div>
              <div className="status-value">{pokemonCount !== null ? pokemonCount : '...'}</div>
            </div>
            <div className="status-card">
              <div className="status-label">Master Data Status</div>
              <div className={`status-value ${importStatus.isUpToDate ? 'up-to-date' : 'needs-update'}`}>
                {importStatus.isUpToDate ? '✅ Up to Date' : '⚠️ Needs Update'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Data Import */}
      <div className="admin-section">
        <h3>🗃️ Master Data Import</h3>
        <p>Import Pokemon data from JSON file to Dataverse master table (pokemon_pokemon). This is required for the battle system to work properly.</p>
        
        <div className="action-buttons">
          <button 
            onClick={handleImportMasterData}
            disabled={isImporting || progress.isRunning}
            className="import-btn master-data"
          >
            {isImporting ? '⏳ Importing Master Data...' : '📥 Import Master Data'}
          </button>
          
          <button 
            onClick={handleValidateData}
            disabled={isValidating || progress.isRunning}
            className="validate-btn"
          >
            {isValidating ? '⏳ Validating...' : '🔍 Validate Master Data'}
          </button>
          
          <button onClick={loadImportStatus} disabled={isImporting || isValidating}>
            🔄 Refresh Status
          </button>
        </div>

        {masterDataResult && (
          <div className={`result-panel ${masterDataResult.success ? 'success' : 'error'}`}>
            <h4>{masterDataResult.success ? '✅ Master Data Import Complete' : '❌ Master Data Import Failed'}</h4>
            <div className="result-stats">
              <div>📈 Imported: {masterDataResult.imported}</div>
              <div>🔄 Updated: {masterDataResult.updated}</div>
              {masterDataResult.errors.length > 0 && (
                <div>❌ Errors: {masterDataResult.errors.length}</div>
              )}
            </div>
            
            {masterDataResult.errors.length > 0 && (
              <div className="error-details">
                <h5>Error Details:</h5>
                <ul>
                  {masterDataResult.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {masterDataResult.errors.length > 10 && (
                    <li>... and {masterDataResult.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Master Data Validation Results */}
        {dataValidationResult && (
          <div className="validation-section">
            <h4>🔍 Master Data Validation Results</h4>
            
            {dataValidationResult.error ? (
              <div className="result-panel error">
                <h5>❌ Validation Error</h5>
                <p>{dataValidationResult.error}</p>
              </div>
            ) : (
              <div className={`result-panel ${dataValidationResult.isConsistent ? 'success' : 'warning'}`}>
                <h5>{dataValidationResult.isConsistent ? '✅ Master Data is Consistent' : '⚠️ Master Data Inconsistencies Found'}</h5>
                
                <div className="validation-stats">
                  <div className="validation-stat">
                    <span className="stat-label">Missing in Dataverse:</span>
                    <span className="stat-value">{dataValidationResult.missingInDataverse?.length || 0}</span>
                  </div>
                  <div className="validation-stat">
                    <span className="stat-label">Extra in Dataverse:</span>
                    <span className="stat-value">{dataValidationResult.extraInDataverse?.length || 0}</span>
                  </div>
                  <div className="validation-stat">
                    <span className="stat-label">Data Mismatches:</span>
                    <span className="stat-value">{dataValidationResult.inconsistentData?.length || 0}</span>
                  </div>
                </div>

                {dataValidationResult.missingInDataverse?.length > 0 && (
                  <div className="validation-details">
                    <h6>Missing Pokemon IDs:</h6>
                    <p>{dataValidationResult.missingInDataverse.slice(0, 20).join(', ')}
                    {dataValidationResult.missingInDataverse.length > 20 && '...'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Pokemon Import */}
      <div className="admin-section">
        <h3>👤 User Pokemon Import (Testing)</h3>
        <p>Import Pokemon to user collections for testing battle and evolution features.</p>
        
        <button 
          onClick={handleImportPokemon}
          disabled={progress.isRunning || isImporting}
          className="import-btn user-data"
        >
          {progress.isRunning ? '⏳ Importing User Data...' : '👤 Import to User Collection'}
        </button>

        {progress.isRunning && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p>
              Importing {progress.current} / {progress.total}: <strong>{progress.currentPokemon}</strong>
            </p>
          </div>
        )}

        {result && (
          <div className={`result-panel ${result.success ? 'success' : 'error'}`}>
            {result.success ? (
              <p>✅ Successfully imported {result.importedCount} new Pokemon to user collection!</p>
            ) : (
              <p>❌ User data import failed: {result.error}</p>
            )}
          </div>
        )}

        <div className="action-buttons">
          <button onClick={handleValidateImport} disabled={progress.isRunning || isImporting}>
            🔍 Validate User Collection
          </button>
          <button onClick={refreshPokemonCount} disabled={progress.isRunning || isImporting}>
            🔄 Refresh Count
          </button>
        </div>

        {validationResult && (
          <div className={`result-panel ${validationResult.isComplete ? 'success' : 'error'}`}>
            {validationResult.error ? (
              <p>❌ Validation failed: {validationResult.error}</p>
            ) : validationResult.isComplete ? (
              <p>✅ All {validationResult.total} Pokemon are properly imported to user collection!</p>
            ) : (
              <div>
                <p>⚠️ Missing {validationResult.missing?.length || 0} Pokemon out of {validationResult.total}</p>
                {validationResult.missing && validationResult.missing.length > 0 && (
                  <details>
                    <summary>Show missing Pokemon IDs</summary>
                    <p>{validationResult.missing.join(', ')}</p>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="admin-section help-section">
        <h3>ℹ️ Setup Guide for Battle System</h3>
        <div className="help-content">
          <div className="help-step">
            <h4>1. Import Master Data First</h4>
            <p>Run "Import Master Data" to populate the pokemon_pokemon table. This creates the reference data that the battle system uses to look up Pokemon stats, types, and evolution chains.</p>
          </div>
          <div className="help-step">
            <h4>2. Import User Collection (Optional)</h4>
            <p>Run "Import to User Collection" to add Pokemon to a test user's collection. This is useful for testing battle and evolution features without manually catching Pokemon.</p>
          </div>
          <div className="help-step">
            <h4>3. Validate Data</h4>
            <p>Use the validation tools to ensure all data was imported correctly and is consistent between the JSON source and Dataverse.</p>
          </div>
          <div className="help-step">
            <h4>4. Battle System Ready!</h4>
            <p>Once master data is imported, users can:</p>
            <ul>
              <li>🥊 Battle wild Pokemon and other trainers</li>
              <li>⚡ Evolve Pokemon when they meet requirements</li>
              <li>📖 Browse the complete Pokedex with evolution chains</li>
              <li>📊 Track battle statistics and Pokemon progress</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminPanel;
