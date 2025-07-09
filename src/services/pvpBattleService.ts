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

/**
 * Debug utility to clear MSAL authentication cache
 * This can help resolve authentication state issues
 */
export async function clearAuthCache() {
  try {
    console.log('🧹 Clearing authentication cache...');
    
    // Clear localStorage items related to MSAL
    const msalKeys = Object.keys(localStorage).filter(key => 
      key.includes('msal') || 
      key.includes('login.windows.net') || 
      key.includes('b2clogin.com')
    );
    
    console.log('Found MSAL cache keys:', msalKeys);
    
    msalKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed: ${key}`);
    });
    
    // Clear sessionStorage as well
    const sessionMsalKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('msal') || 
      key.includes('login.windows.net') || 
      key.includes('b2clogin.com')
    );
    
    sessionMsalKeys.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`Removed from session: ${key}`);
    });
    
    console.log('✅ Authentication cache cleared. Please refresh the page.');
    
  } catch (error) {
    console.error('❌ Error clearing auth cache:', error);
  }
}

/**
 * Debug utility to test API connectivity
 */
export async function testApiConnection() {
  console.log('🌐 Testing API Connection...');
  console.log('='.repeat(50));
  
  try {
    // Test the base API endpoint
    const response = await fetch('/api/dataverse/contacts?$top=1');
    
    console.log('API Response Status:', response.status);
    console.log('API Response Status Text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Connection Successful');
      console.log('Sample Response:', data);
    } else {
      console.log('❌ API Connection Failed');
      const errorText = await response.text();
      console.log('Error Response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ API Connection Error:', error);
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).debugPortalSettings = debugPortalSettings;
  (window as any).clearAuthCache = clearAuthCache;
  (window as any).testApiConnection = testApiConnection;
}

export {};