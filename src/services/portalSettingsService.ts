import { PortalSettingRecord, PortalSettingsSchema, DataverseValidator } from '../constants/dataverseSchema';
import { API_CONFIG } from '../config/api';

/**
 * Typed Portal Setting Interface - Simplified
 */
export interface TypedPortalSetting<T = any> {
  key: string;
  value: T;
  description?: string;
}

/**
 * Portal Settings Service
 * Manages system-wide configuration settings stored in Dataverse
 */
export class PortalSettingsService {
  private static readonly BASE_URL = API_CONFIG.BASE_URL;

  /**
   * Get all portal settings
   */
  static async getAllSettings(): Promise<TypedPortalSetting[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/${PortalSettingsSchema.tableName}?$orderby=pokemon_settingkey`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch portal settings: ${response.statusText}`);
      }
      
      const data = await response.json();
      return (data.value || []).map((record: any) => this.mapFromDataverse(record));
    } catch (error) {
      console.error('Error fetching portal settings:', error);
      throw error;
    }
  }

  /**
   * Get a specific setting by key
   */
  static async getSetting<T = any>(key: string): Promise<TypedPortalSetting<T> | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/${PortalSettingsSchema.tableName}?$filter=pokemon_settingkey eq '${key}'`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch setting '${key}': ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.value || data.value.length === 0) {
        return null;
      }
      
      return this.mapFromDataverse<T>(data.value[0]);
    } catch (error) {
      console.error(`Error fetching setting '${key}':`, error);
      throw error;
    }
  }

  /**
   * Create or update a setting
   */
  static async setSetting<T = any>(setting: TypedPortalSetting<T>): Promise<TypedPortalSetting<T>> {
    try {
      const dataverseRecord: Partial<PortalSettingRecord> = {
        pokemon_settingkey: setting.key,
        pokemon_settingvalue: String(setting.value), // Everything stored as string
        pokemon_description: setting.description
      };

      // Validate the record
      const validation = DataverseValidator.validatePortalSetting(dataverseRecord);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if setting already exists and get its ID in one call
      const existingResponse = await fetch(`${this.BASE_URL}/${PortalSettingsSchema.tableName}?$filter=pokemon_settingkey eq '${setting.key}'`);
      
      let response: Response;
      
      if (existingResponse.ok) {
        const existingData = await existingResponse.json();
        
        if (existingData.value && existingData.value.length > 0) {
          // Setting exists - update it
          const id = existingData.value[0].pokemon_portalsettingid;
          console.log(`Updating existing setting '${setting.key}' with ID ${id}`);
          
          response = await fetch(`${this.BASE_URL}/${PortalSettingsSchema.tableName}(${id})`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataverseRecord)
          });
        } else {
          // Setting doesn't exist - create new one
          console.log(`Creating new setting '${setting.key}'`);
          
          response = await fetch(`${this.BASE_URL}/${PortalSettingsSchema.tableName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataverseRecord)
          });
        }
      } else {
        // Error checking existing setting - try to create new one
        console.log(`Error checking existing setting '${setting.key}', attempting to create new one`);
        
        response = await fetch(`${this.BASE_URL}/${PortalSettingsSchema.tableName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataverseRecord)
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to save setting '${setting.key}': ${response.statusText}`);
      }

      // Return the updated setting
      const updated = await this.getSetting<T>(setting.key);
      if (!updated) {
        throw new Error(`Failed to retrieve updated setting '${setting.key}'`);
      }
      
      return updated;
    } catch (error) {
      console.error(`Error saving setting '${setting.key}':`, error);
      throw error;
    }
  }

  /**
   * Import default settings from JSON
   */
  static async importDefaultSettings(
    settings: TypedPortalSetting[], 
    options: { skipIfSameValue?: boolean } = { skipIfSameValue: false }
  ): Promise<{ imported: number; skipped: number; failed: number; errors: string[] }> {
    const result = { imported: 0, skipped: 0, failed: 0, errors: [] as string[] };
    
    for (const setting of settings) {
      try {
        // Check if we should skip settings with the same value
        if (options.skipIfSameValue) {
          const existing = await this.getSetting(setting.key);
          if (existing && String(existing.value) === String(setting.value)) {
            console.log(`Skipping '${setting.key}' - value unchanged`);
            result.skipped++;
            continue;
          }
        }
        
        await this.setSetting(setting);
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to import '${setting.key}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return result;
  }

  /**
   * Helper: Map Dataverse record to TypedPortalSetting
   */
  private static mapFromDataverse<T = any>(record: PortalSettingRecord): TypedPortalSetting<T> {
    return {
      key: record.pokemon_settingkey,
      value: this.parseValue<T>(record.pokemon_settingvalue),
      description: record.pokemon_description
    };
  }

  /**
   * Helper: Parse string value to appropriate type
   */
  private static parseValue<T = any>(value: string | undefined): T {
    if (!value) {
      return null as T;
    }

    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true as T;
    if (value.toLowerCase() === 'false') return false as T;

    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num) && isFinite(num)) {
      return num as T;
    }

    // Return as string
    return value as T;
  }
}
