import axios from 'axios';
import { dataverseConfig } from '../config/authConfig';
import { dataverseAuthService } from './dataverseAuthService';

// Types for our entities
export interface Contact {
  contactid?: string;
  firstname: string;
  lastname: string;
  emailaddress1: string;
  createdon?: string;
}

export interface Pokemon {
  new_pokemonid?: string;
  new_name: string;
  new_species?: string;
  new_type?: string;
  new_imageurl?: string;
  new_caughtdate?: string;
  new_level?: number;
  new_contactid?: string; // Reference to the trainer (contact)
  createdon?: string;
}

class DataverseService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = dataverseConfig.baseUrl;
  }

  private async getHeaders() {
    const accessToken = await dataverseAuthService.getAccessToken();
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Accept': 'application/json',
    };
  }

  // Contact (Trainer) operations
  async createContact(contactData: Omit<Contact, 'contactid' | 'createdon'>): Promise<Contact> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${this.baseUrl}/contacts`,
        contactData,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  async getContactByEmail(email: string): Promise<Contact | null> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${this.baseUrl}/contacts?$filter=emailaddress1 eq '${email}'`,
        { headers }
      );
      return response.data.value.length > 0 ? response.data.value[0] : null;
    } catch (error) {
      console.error('Error getting contact by email:', error);
      throw error;
    }
  }

  async updateContact(contactId: string, contactData: Partial<Contact>): Promise<void> {
    try {
      const headers = await this.getHeaders();
      await axios.patch(
        `${this.baseUrl}/contacts(${contactId})`,
        contactData,
        { headers }
      );
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  // Pokemon operations
  async createPokemon(pokemonData: Omit<Pokemon, 'new_pokemonid' | 'createdon'>): Promise<Pokemon> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${this.baseUrl}/new_pokemons`,
        pokemonData,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating pokemon:', error);
      throw error;
    }
  }

  async getPokemonByTrainer(trainerId: string): Promise<Pokemon[]> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${this.baseUrl}/new_pokemons?$filter=_new_contactid_value eq ${trainerId}&$orderby=createdon desc`,
        { headers }
      );
      return response.data.value;
    } catch (error) {
      console.error('Error fetching pokemon by trainer:', error);
      throw error;
    }
  }

  async updatePokemon(pokemonId: string, pokemonData: Partial<Pokemon>): Promise<void> {
    try {
      const headers = await this.getHeaders();
      await axios.patch(
        `${this.baseUrl}/new_pokemons(${pokemonId})`,
        pokemonData,
        { headers }
      );
    } catch (error) {
      console.error('Error updating pokemon:', error);
      throw error;
    }
  }

  async deletePokemon(pokemonId: string): Promise<void> {
    try {
      const headers = await this.getHeaders();
      await axios.delete(
        `${this.baseUrl}/new_pokemons(${pokemonId})`,
        { headers }
      );
    } catch (error) {
      console.error('Error deleting pokemon:', error);
      throw error;
    }
  }

  // Helper functions for getting contact by email (used in components)
  async getContactByEmailWithPokemon(email: string): Promise<{ contact: Contact | null; pokemon: Pokemon[] }> {
    try {
      const contact = await this.getContactByEmail(email);
      if (!contact) {
        return { contact: null, pokemon: [] };
      }
      
      const pokemon = await this.getPokemonByTrainer(contact.contactid!);
      return { contact, pokemon };
    } catch (error) {
      console.error('Error getting contact with pokemon:', error);
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
}

// Export singleton instance
export const dataverseService = new DataverseService();

// Helper functions for components
export const createContact = (contactData: Omit<Contact, 'contactid' | 'createdon'>) => 
  dataverseService.createContact(contactData);

export const getContactByEmail = (email: string) => 
  dataverseService.getContactByEmail(email);

export const updateContact = (contactId: string, contactData: Partial<Contact>) => 
  dataverseService.updateContact(contactId, contactData);

export const createPokemon = (pokemonData: Omit<Pokemon, 'new_pokemonid' | 'createdon'>) => 
  dataverseService.createPokemon(pokemonData);

export const getPokemonByTrainer = (trainerId: string) => 
  dataverseService.getPokemonByTrainer(trainerId);

export const updatePokemon = (pokemonId: string, pokemonData: Partial<Pokemon>) => 
  dataverseService.updatePokemon(pokemonId, pokemonData);

export const deletePokemon = (pokemonId: string) => 
  dataverseService.deletePokemon(pokemonId);
