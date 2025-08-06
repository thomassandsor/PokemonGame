/**
 * Portal Settings Service - JavaScript Version
 * Manages system-wide configuration settings stored in Dataverse pokemon_portalsettings table
 */
class PortalSettingsService {
    static baseUrl = 'https://pokemongame-functions-2025.azurewebsites.net/api/dataverse';

    /**
     * Get a specific setting by key
     */
    static async getSetting(key) {
        try {
            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                console.warn('User not authenticated, cannot fetch portal settings');
                return null;
            }

            const url = `${this.baseUrl}/pokemon_portalsettings?$filter=pokemon_settingkey eq '${key}'`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'Content-Type': 'application/json',
                    'X-User-Email': authUser.email
                }
            });
            
            if (!response.ok) {
                console.warn(`Failed to fetch setting '${key}': ${response.statusText}`);
                return null;
            }
            
            const data = await response.json();
            const records = data.value || [];
            
            if (records.length === 0) {
                console.warn(`Portal setting '${key}' not found in Dataverse`);
                return null;
            }
            
            const record = records[0];
            return {
                key: record.pokemon_settingkey,
                value: this.parseValue(record.pokemon_settingvalue),
                description: record.pokemon_settingdescription || '',
                id: record.pokemon_portalsettingid
            };
        } catch (error) {
            console.error('Error fetching portal setting:', error);
            return null;
        }
    }

    /**
     * Get battle turns setting with fallback
     */
    static async getBattleTurns() {
        try {
            const setting = await this.getSetting('battle_turns');
            if (setting && setting.value) {
                const turns = parseInt(setting.value);
                if (turns > 0) {
                    console.log(`📊 Portal Setting: battle_turns = ${turns}`);
                    return turns;
                }
            }
            
            console.warn('⚠️ Portal setting "battle_turns" not found or invalid, using default: 20');
            return 20;
        } catch (error) {
            console.error('Error getting battle_turns setting:', error);
            console.warn('⚠️ Using default battle_turns: 20');
            return 20;
        }
    }

    /**
     * Parse setting value to appropriate type
     */
    static parseValue(value) {
        if (!value) return null;
        
        // Try to parse as number
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            return numValue;
        }
        
        // Try to parse as boolean
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        
        // Try to parse as JSON
        try {
            return JSON.parse(value);
        } catch {
            // Return as string
            return value;
        }
    }

    /**
     * Get all portal settings
     */
    static async getAllSettings() {
        try {
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                console.warn('User not authenticated, cannot fetch portal settings');
                return [];
            }

            const url = `${this.baseUrl}/pokemon_portalsettings?$orderby=pokemon_settingkey`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'Content-Type': 'application/json',
                    'X-User-Email': authUser.email
                }
            });
            
            if (!response.ok) {
                console.warn(`Failed to fetch all portal settings: ${response.statusText}`);
                return [];
            }
            
            const data = await response.json();
            const records = data.value || [];
            
            return records.map(record => ({
                key: record.pokemon_settingkey,
                value: this.parseValue(record.pokemon_settingvalue),
                description: record.pokemon_settingdescription || '',
                id: record.pokemon_portalsettingid
            }));
        } catch (error) {
            console.error('Error fetching all portal settings:', error);
            return [];
        }
    }

    /**
     * Delete a portal setting by key
     */
    static async deleteSetting(key) {
        try {
            // Get authentication token
            const authUser = AuthService.getCurrentUser();
            if (!authUser) {
                throw new Error('User not authenticated');
            }

            // First find the setting to get its ID
            const existing = await this.getSetting(key);
            if (!existing || !existing.id) {
                throw new Error(`Setting '${key}' not found`);
            }

            const url = `${this.baseUrl}/pokemon_portalsettings(${existing.id})`;
            
            const response = await fetch(url, {
                method: 'DELETE',
                mode: 'cors',
                credentials: 'omit',
                headers: { 
                    'Authorization': `Bearer ${authUser.token}`,
                    'Content-Type': 'application/json',
                    'X-User-Email': authUser.email
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log(`Portal setting '${key}' deleted successfully`);
            return true;
        } catch (error) {
            console.error(`Error deleting portal setting '${key}':`, error);
            throw error;
        }
    }
}

// Make it available globally
window.PortalSettingsService = PortalSettingsService;
