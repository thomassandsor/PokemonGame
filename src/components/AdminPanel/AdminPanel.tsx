import React, { useState } from 'react';
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

export const AdminPanel: React.FC = () => {
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    currentPokemon: '',
    isRunning: false
  });
  
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pokemonCount, setPokemonCount] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

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

  React.useEffect(() => {
    refreshPokemonCount();
  }, []);

  return (
    <div className="admin-panel">
      <h2>🔧 Pokemon Admin Panel</h2>
      
      <div className="admin-section">
        <h3>📊 Current Status</h3>
        <p>
          <strong>Pokemon in Dataverse:</strong> {pokemonCount !== null ? `${pokemonCount} Pokemon` : 'Loading...'}
        </p>
        <button onClick={refreshPokemonCount} disabled={progress.isRunning}>
          🔄 Refresh Count
        </button>
      </div>

      <div className="admin-section">
        <h3>📥 Import Pokemon Data</h3>
        <p>This will import all 151 original Pokemon from the GitHub data to Dataverse.</p>
        
        <button 
          onClick={handleImportPokemon} 
          disabled={progress.isRunning}
          className="import-button"
        >
          {progress.isRunning ? '🔄 Importing...' : '📥 Import All Pokemon'}
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
          <div className={`result ${result.success ? 'success' : 'error'}`}>
            {result.success ? (
              <p>✅ Successfully imported {result.importedCount} new Pokemon!</p>
            ) : (
              <p>❌ Import failed: {result.error}</p>
            )}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h3>✅ Validate Import</h3>
        <p>Check if all expected Pokemon are properly imported to Dataverse.</p>
        
        <button onClick={handleValidateImport} disabled={progress.isRunning}>
          🔍 Validate Import
        </button>

        {validationResult && (
          <div className={`result ${validationResult.isComplete ? 'success' : 'error'}`}>
            {validationResult.error ? (
              <p>❌ Validation failed: {validationResult.error}</p>
            ) : validationResult.isComplete ? (
              <p>✅ All {validationResult.total} Pokemon are properly imported!</p>
            ) : (
              <div>
                <p>⚠️ Missing {validationResult.missing.length} Pokemon out of {validationResult.total}</p>
                <details>
                  <summary>Show missing Pokemon IDs</summary>
                  <p>{validationResult.missing.join(', ')}</p>
                </details>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h3>ℹ️ Instructions</h3>
        <ol>
          <li><strong>Import Pokemon:</strong> Run this once to populate Dataverse with Pokemon data</li>
          <li><strong>Validate:</strong> Verify all Pokemon were imported correctly</li>
          <li><strong>Re-run safely:</strong> The import checks for existing Pokemon and skips duplicates</li>
        </ol>
        <p><em>Note: This panel should only be accessible to administrators.</em></p>
      </div>
    </div>
  );
};
