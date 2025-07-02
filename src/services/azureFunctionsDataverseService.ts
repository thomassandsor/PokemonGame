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

// Junction table for caught Pokemon (pokemon_pokedex)
export interface PokedexEntry {
  pokemon_pokedexid?: string;
  pokemon_user: string; // Reference to trainer (contact)
  pokemon_pokemon: string; // Reference to master Pokemon
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
    // Azure Functions API base URL (will be localhost during development, Azure URL when deployed)
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/dataverse'  // Azure Static Web Apps automatically routes /api to Azure Functions
      : 'http://localhost:7071/api/dataverse';  // Local Azure Functions development server
  }

  // Contact (Trainer) operations
  async createContact(contactData: Omit<Contact, 'contactid' | 'createdon'>): Promise<Contact> {
    try {
      const response = await axios.post(`${this.baseUrl}/contacts`, contactData);
      return response.data;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  async getContactByEmail(email: string): Promise<Contact | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/contacts?$filter=emailaddress1 eq '${email}'`
      );
      return response.data.value.length > 0 ? response.data.value[0] : null;
    } catch (error) {
      console.error('Error getting contact by email:', error);
      throw error;
    }
  }

  async updateContact(contactId: string, contactData: Partial<Contact>): Promise<void> {
    try {
      await axios.patch(`${this.baseUrl}/contacts(${contactId})`, contactData);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  // Pokemon Master operations (pokemon_pokemon table)
  async getAllPokemon(): Promise<PokemonMaster[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/pokemon_pokemons`);
      return response.data.value;
    } catch (error) {
      console.error('Error fetching all pokemon:', error);
      throw error;
    }
  }

  async getPokemonById(pokemonId: string): Promise<PokemonMaster | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/pokemon_pokemons(${pokemonId})`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pokemon by ID:', error);
      return null;
    }
  }

  // Pokedex operations (pokemon_pokedex junction table)
  async catchPokemon(trainerId: string, pokemonId: string): Promise<PokedexEntry> {
    try {
      const pokedexData = {
        "pokemon_user@odata.bind": `/contacts(${trainerId})`,
        "pokemon_pokemon@odata.bind": `/pokemon_pokemons(${pokemonId})`
      };
      
      const response = await axios.post(`${this.baseUrl}/pokemon_pokedexes`, pokedexData);
      return response.data;
    } catch (error) {
      console.error('Error catching pokemon:', error);
      throw error;
    }
  }

  async getCaughtPokemonByTrainer(trainerId: string): Promise<CaughtPokemon[]> {
    try {
      // Query the pokedex table with expanded Pokemon details
      const response = await axios.get(
        `${this.baseUrl}/pokemon_pokedexes?$filter=_pokemon_user_value eq '${trainerId}'&$expand=pokemon_Pokemon&$orderby=createdon desc`
      );
      
      // Transform the response to match our CaughtPokemon interface
      return response.data.value.map((entry: any) => ({
        pokedexId: entry.pokemon_pokedexid,
        pokemonId: entry._pokemon_pokemon_value,
        name: entry.pokemon_Pokemon?.pokemon_name || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching caught pokemon by trainer:', error);
      throw error;
    }
  }

  async updatePokedexEntry(pokedexId: string, updateData: Partial<PokedexEntry>): Promise<void> {
    try {
      await axios.patch(`${this.baseUrl}/pokemon_pokedexes(${pokedexId})`, updateData);
    } catch (error) {
      console.error('Error updating pokedex entry:', error);
      throw error;
    }
  }

  async releasePokemon(pokedexId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/pokemon_pokedexes(${pokedexId})`);
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
      const response = await axios.get(
        `${this.baseUrl}/pokemon_pokemons?$filter=pokemon_name eq '${pokemonName}'`
      );
      
      if (response.data.value.length > 0) {
        // Pokemon exists, return it
        return response.data.value[0];
      }
      
      // Pokemon doesn't exist, create it
      const newPokemon: Omit<PokemonMaster, 'pokemon_pokemonid' | 'createdon'> = {
        pokemon_name: pokemonName
      };
      
      const createResponse = await axios.post(`${this.baseUrl}/pokemon_pokemons`, newPokemon);
      return createResponse.data;
      
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
