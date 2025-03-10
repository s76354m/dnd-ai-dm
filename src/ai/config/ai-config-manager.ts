/**
 * AI Configuration Manager
 * 
 * This file provides utilities for loading, saving, and managing AI service configuration.
 * It handles the integration with the API key manager and provides default configurations.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ApiKeyManager, ApiKeyType } from './api-key-manager';
import { ProviderType, ProviderFactoryConfig } from '../providers/provider-factory';

/**
 * AI configuration options
 */
export interface AIConfigOptions {
  /** The provider to use */
  provider: ProviderType;
  
  /** Default model settings */
  defaultModels: {
    /** DM narrative responses */
    dm: string;
    /** Narrative and storytelling */
    narrative: string;
    /** NPC dialogue */
    npc: string;
    /** Combat descriptions */
    combat: string;
    /** World lore and descriptions */
    lore: string;
  };
  
  /** Generation settings */
  generation: {
    /** Temperature (0-1, higher = more creative) */
    temperature: number;
    /** Maximum tokens to generate */
    maxTokens: number;
    /** Whether to include token usage information */
    trackTokenUsage: boolean;
  };
  
  /** Debug settings */
  debug: boolean;
}

/**
 * AI Configuration Manager
 */
export class AIConfigManager {
  private static instance: AIConfigManager;
  private config: AIConfigOptions;
  private configFile: string;
  private keyManager: ApiKeyManager;
  
  /**
   * Default configuration
   */
  private static readonly DEFAULT_CONFIG: AIConfigOptions = {
    provider: 'openai',
    defaultModels: {
      dm: 'gpt-4-turbo',
      narrative: 'gpt-4-turbo',
      npc: 'gpt-3.5-turbo',
      combat: 'gpt-3.5-turbo',
      lore: 'gpt-4-turbo'
    },
    generation: {
      temperature: 0.7,
      maxTokens: 600,
      trackTokenUsage: false
    },
    debug: false
  };
  
  /**
   * Get the singleton instance of the config manager
   */
  public static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }
  
  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    this.config = { ...AIConfigManager.DEFAULT_CONFIG };
    
    // Set up storage paths
    const configDir = path.join(os.homedir(), '.dnd-ai-dm');
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    this.configFile = path.join(configDir, 'ai-config.json');
    this.keyManager = ApiKeyManager.getInstance();
    
    // Load config if it exists
    this.loadConfig();
  }
  
  /**
   * Load configuration from disk
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configFile)) {
        const fileContent = fs.readFileSync(this.configFile, 'utf8');
        const loadedConfig = JSON.parse(fileContent);
        
        // Merge with default config to ensure all fields exist
        this.config = {
          ...AIConfigManager.DEFAULT_CONFIG,
          ...loadedConfig,
          defaultModels: {
            ...AIConfigManager.DEFAULT_CONFIG.defaultModels,
            ...(loadedConfig.defaultModels || {})
          },
          generation: {
            ...AIConfigManager.DEFAULT_CONFIG.generation,
            ...(loadedConfig.generation || {})
          }
        };
      }
    } catch (error) {
      console.error('Error loading AI configuration:', error);
      // Use default config if loading fails
      this.config = { ...AIConfigManager.DEFAULT_CONFIG };
    }
  }
  
  /**
   * Save configuration to disk
   */
  private saveConfig(): void {
    try {
      const fileContent = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configFile, fileContent, 'utf8');
    } catch (error) {
      console.error('Error saving AI configuration:', error);
    }
  }
  
  /**
   * Get the current configuration
   */
  public getConfig(): AIConfigOptions {
    return { ...this.config };
  }
  
  /**
   * Update the configuration
   * 
   * @param newConfig New configuration options
   */
  public updateConfig(newConfig: Partial<AIConfigOptions>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      defaultModels: {
        ...this.config.defaultModels,
        ...(newConfig.defaultModels || {})
      },
      generation: {
        ...this.config.generation,
        ...(newConfig.generation || {})
      }
    };
    
    this.saveConfig();
  }
  
  /**
   * Set the API key for a provider
   * 
   * @param provider The provider to set the key for
   * @param apiKey The API key
   */
  public async setApiKey(provider: ProviderType, apiKey: string): Promise<void> {
    await this.keyManager.setApiKey(provider as ApiKeyType, apiKey);
  }
  
  /**
   * Get the API key for a provider
   * 
   * @param provider The provider to get the key for
   * @returns The API key or empty string if not set
   */
  public async getApiKey(provider: ProviderType): Promise<string> {
    return await this.keyManager.getApiKey(provider as ApiKeyType);
  }
  
  /**
   * Check if an API key is set for a provider
   * 
   * @param provider The provider to check
   * @returns True if a key is set, false otherwise
   */
  public async hasApiKey(provider: ProviderType): Promise<boolean> {
    return await this.keyManager.hasApiKey(provider as ApiKeyType);
  }
  
  /**
   * Get a provider factory configuration
   * This combines the current configuration with the API key
   * 
   * @returns A configuration for the provider factory
   */
  public async getProviderConfig(): Promise<ProviderFactoryConfig> {
    // Get the API key for the current provider
    const apiKey = await this.getApiKey(this.config.provider);
    
    // Build the provider-specific config
    const providerConfig: ProviderFactoryConfig = {
      provider: this.config.provider,
      debug: this.config.debug
    };
    
    // Add provider-specific configurations
    if (this.config.provider === 'openai') {
      providerConfig.openai = {
        apiKey,
        defaultModel: this.config.defaultModels.dm,
        debug: this.config.debug
      };
    } else if (this.config.provider === 'anthropic') {
      providerConfig.anthropic = {
        apiKey,
        defaultModel: this.config.defaultModels.dm,
        debug: this.config.debug
      };
    }
    
    return providerConfig;
  }
  
  /**
   * Reset the configuration to defaults
   */
  public resetConfig(): void {
    this.config = { ...AIConfigManager.DEFAULT_CONFIG };
    this.saveConfig();
  }
  
  /**
   * Get the model for a specific component
   * 
   * @param component The component to get the model for
   * @returns The model name
   */
  public getModelForComponent(component: keyof AIConfigOptions['defaultModels']): string {
    return this.config.defaultModels[component] || this.config.defaultModels.dm;
  }
  
  /**
   * Set the model for a specific component
   * 
   * @param component The component to set the model for
   * @param model The model name
   */
  public setModelForComponent(component: keyof AIConfigOptions['defaultModels'], model: string): void {
    this.config.defaultModels[component] = model;
    this.saveConfig();
  }
  
  /**
   * Get generation settings
   */
  public getGenerationSettings(): AIConfigOptions['generation'] {
    return { ...this.config.generation };
  }
  
  /**
   * Update generation settings
   * 
   * @param settings New generation settings
   */
  public updateGenerationSettings(settings: Partial<AIConfigOptions['generation']>): void {
    this.config.generation = {
      ...this.config.generation,
      ...settings
    };
    this.saveConfig();
  }
} 