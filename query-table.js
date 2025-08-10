// Simple script to query Dataverse API and show table structure
const https = require('https');

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    resolve({ raw: data, error: e.message });
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => reject(new Error('Timeout')));
    });
}

async function queryTable() {
    try {
        console.log('🔍 Querying pokemon_battles table structure...');
        
        const url = 'https://pokemongame-functions-2025.azurewebsites.net/api/dataverse/pokemon_battles?$top=1';
        const response = await makeRequest(url);
        
        if (response.value && response.value.length > 0) {
            const record = response.value[0];
            const fields = Object.keys(record).sort();
            
            console.log('\n📊 Available fields in pokemon_battles:');
            fields.forEach(field => {
                const value = record[field];
                const type = typeof value;
                console.log(`  ${field} (${type}): ${value === null ? 'null' : JSON.stringify(value).substring(0, 50)}`);
            });
            
            console.log('\n🎯 Fields containing "winner", "loser", or "pokemon":');
            const relevantFields = fields.filter(f => 
                f.toLowerCase().includes('winner') || 
                f.toLowerCase().includes('loser') || 
                f.toLowerCase().includes('loose') ||
                f.toLowerCase().includes('pokemon')
            );
            relevantFields.forEach(field => console.log(`  ✓ ${field}`));
            
        } else {
            console.log('❌ No data returned or empty response');
            console.log('Response:', response);
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.message.includes('401')) {
            console.log('💡 This is expected - the API requires authentication');
            console.log('💡 We need to use the browser-based auth system');
        }
    }
}

queryTable();
