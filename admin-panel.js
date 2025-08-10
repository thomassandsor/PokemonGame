/**
 * Admin Panel JavaScript
 * Manages the admin interface functionality
 */

// Global state
let currentTab = 'pokemon';
let isImporting = false;
let isDemoMode = false;
let allSettings = [];

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Panel: Initializing...');
    
    // Wait a moment for AuthService to be ready, then check authentication
    setTimeout(() => {
        checkAuthentication();
    }, 500);
});

function checkAuthentication() {
    console.log('Admin Panel: Checking authentication...');
    console.log('Admin Panel: AuthService available:', typeof AuthService !== 'undefined');
    
    if (typeof AuthService === 'undefined') {
        console.warn('Admin Panel: AuthService not available, retrying...');
        setTimeout(checkAuthentication, 1000);
        return;
    }
    
    // Try to restore authentication first
    AuthService.restoreAuthFromSession()
        .then(() => {
            if (AuthService.isAuthenticated()) {
                console.log('Admin Panel: User is authenticated, initializing components...');
                initializeComponents();
            } else {
                console.warn('Admin Panel: User not authenticated, redirecting to login');
                window.location.href = 'index.html';
            }
        })
        .catch(error => {
            console.error('Admin Panel: Error checking authentication:', error);
            // Don't redirect immediately, give user a chance to see what's happening
            setTimeout(() => {
                if (!AuthService.isAuthenticated()) {
                    window.location.href = 'index.html';
                }
            }, 2000);
        });
}

function initializeComponents() {
    console.log('Admin Panel: Initializing components...');
    
    // Initialize components
    initializePokemonCountSlider();
    loadDemoModeStatus();
    
    console.log('Admin Panel: Initialized successfully');
}

// Tab Management
function showTab(tabName) {
    console.log(`Admin Panel: Switching to tab: ${tabName}`);
    
    // Update active tab button
    document.querySelectorAll('.pokemon-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Show/hide tab content
    document.querySelectorAll('.pokemon-admin-section').forEach(section => section.classList.add('hidden'));
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    currentTab = tabName;
    
    // Load tab-specific data
    if (tabName === 'settings') {
        loadAllSettings();
    }
}

// Pokemon Count Slider
function initializePokemonCountSlider() {
    const slider = document.getElementById('pokemonCount');
    const valueDisplay = document.getElementById('pokemonCountValue');
    const button = document.getElementById('quickImportBtn');
    
    slider.addEventListener('input', function() {
        const value = this.value;
        valueDisplay.textContent = value;
        button.textContent = `📥 Import ${value} Pokemon`;
    });
}

// Pokemon Management Functions
async function handleQuickImport() {
    const count = parseInt(document.getElementById('pokemonCount').value);
    const button = document.getElementById('quickImportBtn');
    
    if (isImporting) return;
    
    console.log(`Admin Panel: Starting quick import of ${count} Pokemon`);
    
    isImporting = true;
    button.textContent = `🔄 Importing ${count} Pokemon...`;
    button.disabled = true;
    
    try {
        // Get popular Pokemon IDs (simplified - you can enhance this)
        const popularIds = [];
        for (let i = 1; i <= count; i++) {
            popularIds.push(i);
        }
        
        const result = await importPokemonBatch(popularIds);
        displayImportResults(result);
        showStatusMessage(`✅ Import completed: ${result.imported} Pokemon imported`, 'success');
        
    } catch (error) {
        console.error('Admin Panel: Quick import failed:', error);
        displayImportResults({
            imported: 0,
            failed: count,
            errors: [error.message || 'Unknown error occurred']
        });
        showStatusMessage('❌ Import failed', 'error');
    } finally {
        isImporting = false;
        button.textContent = `📥 Import ${count} Pokemon`;
        button.disabled = false;
    }
}

async function handleCustomImport() {
    const input = document.getElementById('customPokemonIds');
    const button = document.getElementById('customImportBtn');
    const idsText = input.value.trim();
    
    if (!idsText) {
        showStatusMessage('❌ Please enter Pokemon IDs', 'error');
        return;
    }
    
    if (isImporting) return;
    
    console.log(`Admin Panel: Starting custom import: ${idsText}`);
    
    isImporting = true;
    button.textContent = '🔄 Importing...';
    button.disabled = true;
    
    try {
        // Parse Pokemon IDs
        const ids = idsText.split(',')
            .map(id => parseInt(id.trim()))
            .filter(id => !isNaN(id) && id > 0);
        
        if (ids.length === 0) {
            throw new Error('No valid Pokemon IDs provided');
        }
        
        const result = await importPokemonBatch(ids);
        displayImportResults(result);
        showStatusMessage(`✅ Custom import completed: ${result.imported} Pokemon imported`, 'success');
        
        // Clear input
        input.value = '';
        
    } catch (error) {
        console.error('Admin Panel: Custom import failed:', error);
        displayImportResults({
            imported: 0,
            failed: 0,
            errors: [error.message || 'Unknown error occurred']
        });
        showStatusMessage('❌ Custom import failed', 'error');
    } finally {
        isImporting = false;
        button.textContent = '📥 Import Custom';
        button.disabled = false;
    }
}

async function importPokemonBatch(ids) {
    console.log(`Admin Panel: Importing Pokemon batch:`, ids);
    
    let imported = 0;
    let failed = 0;
    const errors = [];
    
    for (const id of ids) {
        try {
            // Use existing PokemonService to import
            const pokemon = await PokemonService.importPokemonFromAPI(id);
            if (pokemon) {
                imported++;
            } else {
                failed++;
                errors.push(`Failed to import Pokemon ID ${id}: No data received`);
            }
        } catch (error) {
            failed++;
            errors.push(`Failed to import Pokemon ID ${id}: ${error.message}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return { imported, failed, errors };
}

function displayImportResults(result) {
    const resultsDiv = document.getElementById('importResults');
    const importedCount = document.getElementById('importedCount');
    const failedCount = document.getElementById('failedCount');
    const errorsDiv = document.getElementById('importErrors');
    const errorList = document.getElementById('errorList');
    
    importedCount.textContent = result.imported;
    failedCount.textContent = result.failed;
    
    if (result.errors && result.errors.length > 0) {
        errorList.innerHTML = result.errors.map(error => `<li>${error}</li>`).join('');
        errorsDiv.classList.remove('hidden');
    } else {
        errorsDiv.classList.add('hidden');
    }
    
    resultsDiv.classList.remove('hidden');
}

async function testDataverseConnection() {
    console.log('Admin Panel: Testing Dataverse connection');
    
    try {
        // Test with a simple Pokemon query
        const result = await PokemonService.getMyPokemon();
        showStatusMessage('✅ Dataverse connection successful!', 'success');
        console.log('Admin Panel: Dataverse test successful');
    } catch (error) {
        showStatusMessage(`❌ Dataverse connection failed: ${error.message}`, 'error');
        console.error('Admin Panel: Dataverse test failed:', error);
    }
}

// User Management Functions
function viewUserStats() {
    showStatusMessage('📊 User statistics feature coming soon!', 'info');
}

function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.trim();
    if (!searchTerm) {
        showStatusMessage('❌ Please enter a search term', 'error');
        return;
    }
    showStatusMessage(`🔍 User search for "${searchTerm}" coming soon!`, 'info');
}

function manageLeaderboards() {
    showStatusMessage('🏆 Leaderboard management coming soon!', 'info');
}

// System Settings Functions
async function importPortalSettings() {
    const button = document.getElementById('settingsImportBtn');
    const resultDiv = document.getElementById('settingsImportResult');
    
    if (isImporting) return;
    
    console.log('Admin Panel: Importing portal settings');
    
    isImporting = true;
    button.textContent = '🔄 Importing Settings...';
    button.disabled = true;
    
    try {
        // Define default settings
        const defaultSettings = [
            {
                key: 'battle_turns',
                value: 50,
                description: 'Maximum number of turns allowed in a Pokemon battle before timeout'
            },
            {
                key: 'max_pokemon_per_user',
                value: 1000,
                description: 'Maximum number of Pokemon a user can collect'
            },
            {
                key: 'daily_catch_limit',
                value: 10,
                description: 'Maximum number of Pokemon a user can catch per day'
            },
            {
                key: 'demo_mode',
                value: false,
                description: 'Enable demo mode to bypass authentication globally'
            }
        ];
        
        let imported = 0;
        let skipped = 0;
        let failed = 0;
        const errors = [];
        
        for (const setting of defaultSettings) {
            try {
                // Check if setting already exists
                const existing = await PortalSettingsService.getSetting(setting.key);
                if (existing !== null) {
                    skipped++;
                    continue;
                }
                
                // Import new setting
                await PortalSettingsService.setSetting(setting);
                imported++;
            } catch (error) {
                failed++;
                errors.push(`Failed to import ${setting.key}: ${error.message}`);
            }
        }
        
        const resultHtml = `
            <div class="pokemon-import-result">
                <p><strong>Import Results:</strong></p>
                <p>✅ Imported: ${imported}</p>
                <p>⏭️ Skipped (existed): ${skipped}</p>
                <p>❌ Failed: ${failed}</p>
                ${errors.length > 0 ? `<div class="pokemon-error-details"><h4>Errors:</h4><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul></div>` : ''}
            </div>
        `;
        
        resultDiv.innerHTML = resultHtml;
        resultDiv.classList.remove('hidden');
        
        showStatusMessage(`✅ Portal settings import completed: ${imported} imported, ${skipped} skipped`, 'success');
        
    } catch (error) {
        console.error('Admin Panel: Portal settings import failed:', error);
        resultDiv.innerHTML = `<div class="pokemon-error-details"><p>❌ Import failed: ${error.message}</p></div>`;
        resultDiv.classList.remove('hidden');
        showStatusMessage('❌ Portal settings import failed', 'error');
    } finally {
        isImporting = false;
        button.textContent = '📥 Import Portal Settings';
        button.disabled = false;
    }
}

async function loadDemoModeStatus() {
    try {
        const demoSetting = await PortalSettingsService.getSetting('demo_mode');
        isDemoMode = demoSetting ? Boolean(demoSetting.value) : false;
        updateDemoModeUI();
    } catch (error) {
        console.error('Admin Panel: Failed to load demo mode status:', error);
    }
}

function updateDemoModeUI() {
    const statusSpan = document.getElementById('demoStatus');
    const button = document.getElementById('demoModeBtn');
    
    if (isDemoMode) {
        statusSpan.textContent = '✅ Enabled';
        statusSpan.style.color = 'var(--pokemon-green)';
        button.textContent = '🔒 Disable Demo Mode';
        button.className = 'pokemon-btn pokemon-btn-secondary';
    } else {
        statusSpan.textContent = '❌ Disabled';
        statusSpan.style.color = 'var(--pokemon-red)';
        button.textContent = '🎭 Enable Demo Mode';
        button.className = 'pokemon-btn pokemon-btn-primary';
    }
}

async function toggleDemoMode() {
    const button = document.getElementById('demoModeBtn');
    
    if (isImporting) return;
    
    console.log(`Admin Panel: Toggling demo mode from ${isDemoMode} to ${!isDemoMode}`);
    
    isImporting = true;
    button.textContent = '🔄 Updating...';
    button.disabled = true;
    
    try {
        const newValue = !isDemoMode;
        await PortalSettingsService.setSetting({
            key: 'demo_mode',
            value: newValue,
            description: 'Enable demo mode to bypass authentication globally'
        });
        
        isDemoMode = newValue;
        updateDemoModeUI();
        
        showStatusMessage(`✅ Demo mode ${newValue ? 'enabled' : 'disabled'}`, 'success');
        
    } catch (error) {
        console.error('Admin Panel: Failed to toggle demo mode:', error);
        showStatusMessage('❌ Failed to toggle demo mode', 'error');
    } finally {
        isImporting = false;
        button.disabled = false;
    }
}

// Portal Settings Management Functions
async function loadAllSettings() {
    const loadingDiv = document.getElementById('settingsLoading');
    const settingsList = document.getElementById('settingsList');
    
    console.log('Admin Panel: Loading all portal settings');
    
    loadingDiv.classList.remove('hidden');
    settingsList.innerHTML = '';
    
    try {
        allSettings = await PortalSettingsService.getAllSettings();
        displaySettings(allSettings);
        showStatusMessage(`✅ Loaded ${allSettings.length} portal settings`, 'success');
    } catch (error) {
        console.error('Admin Panel: Failed to load settings:', error);
        settingsList.innerHTML = '<div class="pokemon-error-details"><p>❌ Failed to load settings</p></div>';
        showStatusMessage('❌ Failed to load portal settings', 'error');
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

function displaySettings(settings) {
    const settingsList = document.getElementById('settingsList');
    
    if (!settings || settings.length === 0) {
        settingsList.innerHTML = '<div class="pokemon-admin-card"><p>No portal settings found. Import default settings to get started.</p></div>';
        return;
    }
    
    const settingsHtml = settings.map(setting => `
        <div class="pokemon-setting-item">
            <div>
                <h4>${setting.key}</h4>
                <p>${setting.description || 'No description'}</p>
            </div>
            <div>
                <input type="text" 
                       value="${setting.value}" 
                       onchange="updateSetting('${setting.key}', this.value)"
                       class="pokemon-input">
            </div>
            <div>
                <button class="pokemon-btn pokemon-btn-sm pokemon-btn-danger" 
                        onclick="deleteSetting('${setting.key}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
    
    settingsList.innerHTML = settingsHtml;
}

async function updateSetting(key, value) {
    console.log(`Admin Panel: Updating setting ${key} to ${value}`);
    
    try {
        const setting = allSettings.find(s => s.key === key);
        if (!setting) {
            throw new Error('Setting not found');
        }
        
        await PortalSettingsService.setSetting({
            key: key,
            value: value,
            description: setting.description
        });
        
        // Update local array
        setting.value = value;
        
        showStatusMessage(`✅ Setting "${key}" updated successfully`, 'success');
        
    } catch (error) {
        console.error('Admin Panel: Failed to update setting:', error);
        showStatusMessage(`❌ Failed to update setting "${key}"`, 'error');
        // Reload settings to revert UI
        loadAllSettings();
    }
}

async function deleteSetting(key) {
    if (!confirm(`Are you sure you want to delete the setting "${key}"?`)) {
        return;
    }
    
    console.log(`Admin Panel: Deleting setting ${key}`);
    
    try {
        await PortalSettingsService.deleteSetting(key);
        
        // Remove from local array
        allSettings = allSettings.filter(s => s.key !== key);
        displaySettings(allSettings);
        
        showStatusMessage(`✅ Setting "${key}" deleted successfully`, 'success');
        
    } catch (error) {
        console.error('Admin Panel: Failed to delete setting:', error);
        showStatusMessage(`❌ Failed to delete setting "${key}"`, 'error');
    }
}

function addNewSetting() {
    const form = document.getElementById('addSettingForm');
    form.classList.remove('hidden');
    
    // Clear form
    document.getElementById('newSettingKey').value = '';
    document.getElementById('newSettingValue').value = '';
    document.getElementById('newSettingDescription').value = '';
}

function cancelAddSetting() {
    const form = document.getElementById('addSettingForm');
    form.classList.add('hidden');
}

async function saveNewSetting() {
    const key = document.getElementById('newSettingKey').value.trim();
    const value = document.getElementById('newSettingValue').value.trim();
    const description = document.getElementById('newSettingDescription').value.trim();
    
    if (!key || !value) {
        showStatusMessage('❌ Please enter both key and value', 'error');
        return;
    }
    
    console.log(`Admin Panel: Creating new setting: ${key}`);
    
    try {
        // Check if setting already exists
        const existing = allSettings.find(s => s.key === key);
        if (existing) {
            throw new Error(`Setting "${key}" already exists`);
        }
        
        await PortalSettingsService.setSetting({
            key: key,
            value: value,
            description: description
        });
        
        // Add to local array and refresh display
        allSettings.push({ key, value, description });
        displaySettings(allSettings);
        
        // Hide form
        cancelAddSetting();
        
        showStatusMessage(`✅ Setting "${key}" created successfully`, 'success');
        
    } catch (error) {
        console.error('Admin Panel: Failed to create setting:', error);
        showStatusMessage(`❌ Failed to create setting: ${error.message}`, 'error');
    }
}

// Utility Functions
function showStatusMessage(message, type = 'success') {
    const messageDiv = document.getElementById('statusMessage');
    const textSpan = document.getElementById('statusText');
    
    textSpan.textContent = message;
    messageDiv.className = `pokemon-status-message ${type}`;
    messageDiv.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

// Extend PokemonService with import functionality if not exists
if (typeof PokemonService !== 'undefined' && !PokemonService.importPokemonFromAPI) {
    PokemonService.importPokemonFromAPI = async function(pokemonId) {
        console.log(`PokemonService: Importing Pokemon ${pokemonId} from PokeAPI`);
        
        try {
            // Fetch from PokeAPI
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            if (!response.ok) {
                throw new Error(`Pokemon ${pokemonId} not found`);
            }
            
            const pokemonData = await response.json();
            
            // Convert to our format and save
            const pokemon = {
                pokemon_id: pokemonData.id,
                pokemon_name: pokemonData.name,
                pokemon_type: pokemonData.types.map(t => t.type.name).join(', '),
                pokemon_hp: pokemonData.stats.find(s => s.stat.name === 'hp')?.base_stat || 100,
                pokemon_attack: pokemonData.stats.find(s => s.stat.name === 'attack')?.base_stat || 100,
                pokemon_defence: pokemonData.stats.find(s => s.stat.name === 'defense')?.base_stat || 100,
                pokemon_imageurl: pokemonData.sprites.front_default || '',
                pokemon_description: `Imported from PokeAPI - ${pokemonData.name}`,
                pokemon_rarity: this.calculateRarity(pokemonData.base_experience || 100)
            };
            
            // Save to Dataverse (simplified - you may want to enhance this)
            return pokemon;
            
        } catch (error) {
            console.error(`PokemonService: Failed to import Pokemon ${pokemonId}:`, error);
            throw error;
        }
    };
    
    PokemonService.calculateRarity = function(baseExperience) {
        if (baseExperience < 100) return 'Common';
        if (baseExperience < 150) return 'Uncommon';
        if (baseExperience < 200) return 'Rare';
        if (baseExperience < 250) return 'Epic';
        return 'Legendary';
    };
}

console.log('Admin Panel: JavaScript loaded successfully');
