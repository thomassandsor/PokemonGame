// Test script to verify portal settings integration for battle turns
// This script simulates a battle and logs the portal settings usage

import { BattleSimulationService } from './src/services/battleSimulationService.js';
import { PortalSettingsService } from './src/services/portalSettingsService.js';

// Mock Pokemon data for testing
const mockPokemon1 = {
  id: 'test1',
  name: 'Pikachu',
  type1: 'electric',
  type2: null,
  level: 50,
  hp: 100,
  attack: 80,
  defense: 70,
  specialAttack: 90,
  specialDefense: 75,
  speed: 120,
  moves: []
};

const mockPokemon2 = {
  id: 'test2',
  name: 'Charizard',
  type1: 'fire',
  type2: 'flying',
  level: 50,
  hp: 120,
  attack: 110,
  defense: 85,
  specialAttack: 120,
  specialDefense: 90,
  speed: 100,
  moves: []
};

const mockPlayer1 = { id: 'player1', name: 'Ash' };
const mockPlayer2 = { id: 'player2', name: 'Gary' };

async function testPortalSettings() {
  console.log('🧪 Testing Portal Settings Integration for Battle Turns');
  console.log('='*60);

  try {
    // Test 1: Check if we can fetch portal settings
    console.log('\n📋 Test 1: Fetching battle_turns setting...');
    const setting = await PortalSettingsService.getSetting('battle_turns');
    
    if (setting) {
      console.log(`✅ Portal setting found: ${setting.key} = ${setting.value}`);
    } else {
      console.log('⚠️ Portal setting "battle_turns" not found in Dataverse');
      console.log('   This means the battle will use the default value of 50 turns');
    }

    // Test 2: Simulate a battle and check turn count
    console.log('\n⚔️ Test 2: Running battle simulation...');
    console.log('   This will show if the portal setting is being used correctly');
    
    const battleResult = await BattleSimulationService.simulateBattle(
      mockPlayer1,
      mockPlayer2,
      mockPokemon1,
      mockPokemon2,
      'training'
    );

    console.log(`✅ Battle completed successfully!`);
    console.log(`   Total turns: ${battleResult.battle_turns.length}`);
    console.log(`   Winner: ${battleResult.final_result.winner_name}`);
    console.log(`   Victory condition: ${battleResult.final_result.victory_condition}`);

    // Test 3: Verify console logs for portal setting usage
    console.log('\n📊 Test 3: Portal setting usage verification');
    console.log('   Check the console output above for messages like:');
    console.log('   "🎮 Using portal setting for max battle turns: X"');
    console.log('   "⚠️ Portal setting \'battle_turns\' not found, using default: 50"');

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testPortalSettings().then(() => {
  console.log('\n✨ Test script finished');
}).catch(error => {
  console.error('💥 Test script failed:', error);
});
