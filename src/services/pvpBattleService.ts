// PvP battle service for Pokemon game
import { PortalSettingsService } from './portalSettingsService';
import { API_CONFIG } from '../config/api';

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
    const response = await fetch(`${API_CONFIG.BASE_URL}/contacts?$top=1`);
    
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

/**
 * Debug utility to test Azure Functions environment and Dataverse connection
 */
export async function testAzureFunctionsConfig() {
  console.log('🔧 Testing Azure Functions Configuration...');
  console.log('='.repeat(60));
  
  try {
    // Test a simple Azure Functions endpoint first
    console.log('1. Testing basic Azure Functions connectivity...');
    const basicResponse = await fetch('/api/health', { method: 'GET' });
    console.log(`Basic Functions Status: ${basicResponse.status}`);
    
    if (basicResponse.ok) {
      const healthData = await basicResponse.json();
      console.log('✅ Health check successful:', healthData);
    } else {
      const healthError = await basicResponse.text();
      console.log('❌ Health check failed:', healthError);
    }
    
    // Test Dataverse proxy with detailed error info
    console.log('\n2. Testing Dataverse proxy with error details...');
    const dataverseResponse = await fetch(`${API_CONFIG.BASE_URL}/contacts?$top=1&$select=contactid`);
    
    console.log(`Dataverse Proxy Status: ${dataverseResponse.status}`);
    console.log(`Dataverse Proxy Status Text: ${dataverseResponse.statusText}`);
    
    const responseText = await dataverseResponse.text();
    console.log('Raw Response:', responseText);
    
    if (!dataverseResponse.ok) {
      console.log('❌ Dataverse proxy failed');
      
      // Try to get more specific error information
      try {
        const errorData = JSON.parse(responseText);
        console.log('Parsed Error Data:', errorData);
      } catch (parseError) {
        console.log('Could not parse error response as JSON');
      }
    } else {
      console.log('✅ Dataverse proxy working correctly');
      try {
        const data = JSON.parse(responseText);
        console.log('Sample Data:', data);
      } catch (parseError) {
        console.log('Response received but could not parse as JSON');
      }
    }
    
    // Test environment variable access by calling a specific diagnostic endpoint
    console.log('\n3. Testing environment variable access...');
    console.log('Note: This will only work if diagnostic endpoints are available');
    
  } catch (error) {
    console.error('❌ Azure Functions test failed:', error);
  }
}

/**
 * Quick debug utility to test if any Azure Functions work at all
 */
export async function testBasicAzureFunctions() {
  console.log('🧪 Testing Basic Azure Functions...');
  
  const endpoints = [
    '/api/health',
    '/api/test',
    '/api/ping'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await fetch(endpoint);
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const text = await response.text();
        console.log(`Response: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`${endpoint}: Error - ${error}`);
    }
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).debugPortalSettings = debugPortalSettings;
  (window as any).clearAuthCache = clearAuthCache;
  (window as any).testApiConnection = testApiConnection;
  (window as any).testAzureFunctionsConfig = testAzureFunctionsConfig;
  (window as any).testBasicAzureFunctions = testBasicAzureFunctions;
}

export {};