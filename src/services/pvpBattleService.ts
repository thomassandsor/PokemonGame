// PvP battle service for Pokemon game
import { PortalSettingsService } from './portalSettingsService';

/**
 * Debug utility to check portal settings configuration
 * This can be called from browser console to verify settings
 */
export async function debugPortalSettings() {
  console.log('🔍 Debugging Portal Settings for Battle Turns');
  console.log('='.repeat(50));

  try {
    // Check if the battle_turns setting exists
    const battleTurnsSetting = await PortalSettingsService.getSetting('battle_turns');

    if (battleTurnsSetting) {
      console.log('✅ Portal setting found:');
      console.log(`   Key: ${battleTurnsSetting.key}`);
      console.log(`   Value: ${battleTurnsSetting.value}`);
      console.log(`   Type: ${typeof battleTurnsSetting.value}`);
      console.log(`   Parsed as integer: ${parseInt(String(battleTurnsSetting.value))}`);
    } else {
      console.log('❌ Portal setting "battle_turns" not found');
      console.log('   This means battles will use the default value of 50 turns');
    }

    // Check all portal settings
    console.log('\n📋 All portal settings:');
    const allSettings = await PortalSettingsService.getAllSettings();
    if (allSettings.length > 0) {
      allSettings.forEach(setting => {
        console.log(`   ${setting.key}: ${setting.value}`);
      });
    } else {
      console.log('   No portal settings found in Dataverse');
    }
  } catch (error) {
    console.error('❌ Error checking portal settings:', error);
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).debugPortalSettings = debugPortalSettings;
}

export {};