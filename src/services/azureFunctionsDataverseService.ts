import axios from 'axios';

// Types for our entities
export interface Contact {
  contactid?: string;
  firstname: string;
  lastname: string;
  emailaddress1: string;
  createdon?: string;
}

// Master Pokemon table (pokemon_pokemon)
export interface PokemonMaster {
  pokemon_pokemonid?: string;
  pokemon_name: string;
  createdon?: string;
}

// Enhanced junction table for caught Pokemon with battle/evolution data (pokemon_pokedex)
export interface PokedexEntry {
  pokemon_pokedexid?: string;
  pokemon_user: string; // Reference to trainer (contact)
  pokemon_pokemon: string; // Reference to master Pokemon
  pokemon_name?: string; // Cached Pokemon name for easier display
  pokemon_nickname?: string; // Custom nickname for the Pokemon
  pokemon_level?: number; // Current level (default 1)
  pokemon_experience?: number; // Total experience points
  pokemon_current_stats?: string; // JSON string of current calculated stats
  pokemon_battle_stats?: string; // JSON string of battle wins/losses
  pokemon_caught_date?: string; // Date when Pokemon was caught
  createdon?: string;
}

// Combined view for displaying caught Pokemon with details
export interface CaughtPokemon {
  pokedexId: string;
  pokemonId: string;
  name: string;
}

class AzureFunctionsDataverseService {
  private baseUrl: string;

  constructor() {
    // Azure Functions proxy endpoint
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/dataverse-proxy'  // Azure Static Web Apps automatically routes /api to Azure Functions
      : 'http://localhost:7071/api/dataverse-proxy';  // Local Azure Functions development server
  }

  // Helper method to make requests through the proxy
  private async makeRequest(method: string, path: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}?path=${encodeURIComponent(path)}`;
    
    const config: any = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  }

  // Contact (Trainer) operations
  async createContact(contactData: Omit<Contact, 'contactid' | 'createdon'>): Promise<Contact> {
    try {
      const response = await this.makeRequest('POST', '/contacts', contactData);
      return response;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  async getContactByEmail(email: string): Promise<Contact | null> {
    try {
      const response = await this.makeRequest('GET', `/contacts?$filter=emailaddress1 eq '${email}'`);
      return response.value.length > 0 ? response.value[0] : null;
    } catch (error) {
      console.error('Error getting contact by email:', error);
      throw error;
    }
  }

  async updateContact(contactId: string, contactData: Partial<Contact>): Promise<void> {
    try {
      await this.makeRequest('PATCH', `/contacts(${contactId})`, contactData);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  // Pokemon Master operations (pokemon_pokemon table)
  async getAllPokemon(): Promise<PokemonMaster[]> {
    try {
      const response = await this.makeRequest('GET', '/pokemon_pokemons');
      return response.value;
    } catch (error) {
      console.error('Error fetching all pokemon:', error);
      throw error;
    }
  }

  async getPokemonById(pokemonId: string): Promise<PokemonMaster | null> {
    try {
      const response = await this.makeRequest('GET', `/pokemon_pokemons(${pokemonId})`);
      return response;
    } catch (error) {
      console.error('Error fetching pokemon by ID:', error);
      return null;
    }
  }

  // Pokedex operations (pokemon_pokedex junction table)
  async catchPokemon(trainerId: string, pokemonId: string): Promise<PokedexEntry> {
    try {
      // Get the Pokemon name from the master table first
      const pokemonResponse = await this.makeRequest('GET', `/pokemon_pokemons(${pokemonId})`);
      const pokemonName = pokemonResponse.pokemon_name;
      
      const pokedexData = {
        "pokemon_user@odata.bind": `/contacts(${trainerId})`,
        "pokemon_pokemon@odata.bind": `/pokemon_pokemons(${pokemonId})`,
        pokemon_name: pokemonName
      };
      
      const response = await this.makeRequest('POST', '/pokemon_pokedexes', pokedexData);
      return response;
    } catch (error) {
      console.error('Error catching pokemon:', error);
      throw error;
    }
  }

  async getCaughtPokemonByTrainer(trainerId: string): Promise<CaughtPokemon[]> {
    try {
      // Get the pokedex entries
      const response = await this.makeRequest('GET', 
        `/pokemon_pokedexes?$filter=_pokemon_user_value eq ${trainerId}&$orderby=createdon desc`
      );
      
      console.log('Pokedex entries response:', response);
      
      // Process each entry and optionally look up master Pokemon data
      const mappedPokemon = await Promise.all(response.value.map(async (entry: any) => {
        let pokemonId = 'unknown';
        let pokemonName = entry.pokemon_name || 'Unknown Pokemon';
        
        // If we have a reference to the master Pokemon, look it up
        if (entry._pokemon_pokemon_value) {
          try {
            const masterResponse = await this.makeRequest('GET', 
              `/pokemon_pokemons(${entry._pokemon_pokemon_value})`
            );
            
            if (masterResponse.pokemon_id) {
              pokemonId = masterResponse.pokemon_id.toString();
              // Use the master Pokemon name if available
              pokemonName = masterResponse.pokemon_name || pokemonName;
            }
            
            console.log(`Looked up master Pokemon: ${masterResponse.pokemon_name} (#${masterResponse.pokemon_id})`);
          } catch (lookupError) {
            console.warn('Failed to lookup master Pokemon:', lookupError);
            // Fall back to extracting from the cached name
            if (entry.pokemon_name) {
              const match = entry.pokemon_name.match(/^(\d+)\s*-\s*(.+)$/);
              if (match) {
                pokemonId = match[1];
                pokemonName = entry.pokemon_name;
              }
            }
          }
        } else {
          // No master Pokemon reference, try to extract from name
          if (entry.pokemon_name) {
            const match = entry.pokemon_name.match(/^(\d+)\s*-\s*(.+)$/);
            if (match) {
              pokemonId = match[1];
              pokemonName = entry.pokemon_name;
            }
          }
        }
        
        console.log(`Mapped Pokedex entry: ${entry.pokemon_pokedexid} -> Pokemon ID: ${pokemonId}, Name: ${pokemonName}`);
        
        return {
          pokedexId: entry.pokemon_pokedexid,
          pokemonId: pokemonId,
          name: pokemonName
        };
      }));
      
      return mappedPokemon;
    } catch (error) {
      console.error('Error fetching caught pokemon by trainer:', error);
      throw error;
    }
  }

  async updatePokedexEntry(pokedexId: string, updateData: Partial<PokedexEntry>): Promise<void> {
    try {
      await this.makeRequest('PATCH', `/pokemon_pokedexes(${pokedexId})`, updateData);
    } catch (error) {
      console.error('Error updating pokedex entry:', error);
      throw error;
    }
  }

  async releasePokemon(pokedexId: string): Promise<void> {
    try {
      await this.makeRequest('DELETE', `/pokemon_pokedexes(${pokedexId})`);
    } catch (error) {
      console.error('Error releasing pokemon:', error);
      throw error;
    }
  }

  // Utility method to create contact with Azure AD user info
  async createContactFromAzureAD(azureUser: { name?: string; email: string }): Promise<Contact> {
    const displayName = azureUser.name || 'Pokemon Trainer';
    const nameParts = displayName.split(' ');
    
    const contactData = {
      firstname: nameParts[0] || 'Pokemon',
      lastname: nameParts.slice(1).join(' ') || 'Trainer',
      emailaddress1: azureUser.email,
    };

    return await this.createContact(contactData);
  }

  // Helper method to find or create a Pokemon in the master table
  async findOrCreatePokemon(pokemonName: string): Promise<PokemonMaster> {
    try {
      // First, try to find existing Pokemon by name
      const response = await this.makeRequest('GET', 
        `/pokemon_pokemons?$filter=pokemon_name eq '${pokemonName}'`
      );
      
      if (response.value.length > 0) {
        // Pokemon exists, return it
        return response.value[0];
      }
      
      // Pokemon doesn't exist, create it
      const newPokemon: Omit<PokemonMaster, 'pokemon_pokemonid' | 'createdon'> = {
        pokemon_name: pokemonName
      };
      
      const createResponse = await this.makeRequest('POST', '/pokemon_pokemons', newPokemon);
      return createResponse;
      
    } catch (error) {
      console.error('Error finding or creating Pokemon:', error);
      throw error;
    }
  }

  // Convenient method to catch a Pokemon (find/create + add to pokedex)
  async catchPokemonByName(trainerId: string, pokemonName: string): Promise<PokedexEntry> {
    try {
      // Find or create the Pokemon in the master table
      const masterPokemon = await this.findOrCreatePokemon(pokemonName);
      
      // Add it to the trainer's pokedex
      return await this.catchPokemon(trainerId, masterPokemon.pokemon_pokemonid!);
    } catch (error) {
      console.error('Error catching Pokemon by name:', error);
      throw error;
    }
  }

  // New simplified Pokemon catching using Pokemon numbers
  async catchPokemonByNumber(trainerId: string, pokemonNumber: number): Promise<PokedexEntry> {
    try {
      const pokedexData = {
        "pokemon_user@odata.bind": `/contacts(${trainerId})`,
        pokemon_number: pokemonNumber
      };
      
      const response = await this.makeRequest('POST', '/pokemon_pokedexes', pokedexData);
      return response;
    } catch (error) {
      console.error('Error catching pokemon by number:', error);
      throw error;
    }
  }

  // Updated getCaughtPokemonByTrainer to work with Pokemon numbers
  async getCaughtPokemonByTrainerWithNumbers(trainerId: string): Promise<Array<{pokedexId: string; pokemonNumber: number}>> {
    try {
      const response = await this.makeRequest('GET', 
        `/pokemon_pokedexes?$filter=_pokemon_user_value eq ${trainerId}&$orderby=createdon desc`
      );
      
      return response.value.map((entry: any) => ({
        pokedexId: entry.pokemon_pokedexid,
        pokemonNumber: entry.pokemon_number
      }));
    } catch (error) {
      console.error('Error fetching caught pokemon by trainer:', error);
      throw error;
    }
  }

  // User Pokemon operations (for battle system)
  async updateUserPokemon(userPokemon: any): Promise<void> {
    try {
      // Update the pokedex entry with additional battle/progress data
      const updateData = {
        pokemon_level: userPokemon.level,
        pokemon_experience: userPokemon.experience,
        pokemon_nickname: userPokemon.nickname,
        pokemon_battle_stats: JSON.stringify(userPokemon.battleStats),
        pokemon_current_stats: JSON.stringify(userPokemon.currentStats)
      };
      
      await this.makeRequest('PATCH', `/pokemon_pokedexes(${userPokemon.id})`, updateData);
    } catch (error) {
      console.error('Error updating user pokemon:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dataverseService = new AzureFunctionsDataverseService();

// Helper functions for components
export const createContact = (contactData: Omit<Contact, 'contactid' | 'createdon'>) => 
  dataverseService.createContact(contactData);

export const getContactByEmail = (email: string) => 
  dataverseService.getContactByEmail(email);

export const updateContact = (contactId: string, contactData: Partial<Contact>) => 
  dataverseService.updateContact(contactId, contactData);

// Pokemon Master functions
export const getAllPokemon = () => 
  dataverseService.getAllPokemon();

export const getPokemonById = (pokemonId: string) => 
  dataverseService.getPokemonById(pokemonId);

// Pokedex functions (for caught Pokemon)
export const catchPokemon = (trainerId: string, pokemonId: string) => 
  dataverseService.catchPokemon(trainerId, pokemonId);

export const catchPokemonByName = (trainerId: string, pokemonName: string) => 
  dataverseService.catchPokemonByName(trainerId, pokemonName);

export const getCaughtPokemonByTrainer = (trainerId: string) => 
  dataverseService.getCaughtPokemonByTrainer(trainerId);

export const updatePokedexEntry = (pokedexId: string, updateData: Partial<PokedexEntry>) => 
  dataverseService.updatePokedexEntry(pokedexId, updateData);

export const releasePokemon = (pokedexId: string) => 
  dataverseService.releasePokemon(pokedexId);

// Backward compatibility aliases (deprecated - use new functions above)
export const getPokemonByTrainer = getCaughtPokemonByTrainer;
export const createPokemon = catchPokemonByName;
export const deletePokemon = releasePokemon;

// Export updateUserPokemon function
export const updateUserPokemon = (userPokemon: any) => 
  dataverseService.updateUserPokemon(userPokemon);
