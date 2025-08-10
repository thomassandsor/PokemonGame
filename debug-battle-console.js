// Debug Battle Fields - Console Test
// Copy and paste this into the browser console on any authenticated page

async function debugBattleFields() {
    console.log('🔍 Debug Battle Database Fields');
    
    const battleId = '34db8361-4a72-f011-b4cb-7c1e5250e283';
    const baseUrl = 'https://pokemongame-functions-2025.azurewebsites.net/api/dataverse';
    
    try {
        // Get authentication token
        const authUser = AuthService.getCurrentUser();
        if (!authUser) {
            console.error('❌ User not authenticated');
            return;
        }
        
        console.log('🔑 Auth user:', authUser.email);
        console.log('🔑 Token length:', authUser.token?.length);
        
        // Query the specific battle
        const url = `${baseUrl}/pokemon_battles(${battleId})`;
        console.log('🌐 URL:', url);
        
        const response = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${authUser.token}`,
                'X-User-Email': authUser.email
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to get battle:', response.status, errorText);
            return;
        }
        
        const battle = await response.json();
        console.log('✅ Battle data retrieved successfully');
        console.log('📋 Full battle object:', battle);
        
        // Show all property names
        const allFields = Object.keys(battle);
        console.log('📋 All field names:', allFields);
        
        // Filter for Pokemon-related fields
        const pokemonFields = allFields.filter(key => key.toLowerCase().includes('pokemon'));
        console.log('🐾 Pokemon-related fields:', pokemonFields);
        
        // Show Pokemon field values
        pokemonFields.forEach(field => {
            console.log(`  ${field}: ${battle[field]}`);
        });
        
        // Filter for winner/loser fields
        const winnerFields = allFields.filter(key => 
            key.toLowerCase().includes('winner') || 
            key.toLowerCase().includes('loser') ||
            key.toLowerCase().includes('win') ||
            key.toLowerCase().includes('lose')
        );
        
        console.log('🏆 Winner/Loser-related fields:', winnerFields);
        
        if (winnerFields.length > 0) {
            winnerFields.forEach(field => {
                console.log(`  ${field}: ${battle[field]}`);
            });
        } else {
            console.log('  No winner/loser fields found');
        }
        
        return battle;
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the debug function
debugBattleFields();
