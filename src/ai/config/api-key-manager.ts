/**
 * API Key Manager
 * 
 * This file provides utilities for securely storing and retrieving API keys
 * used by the AI providers. It supports both environment variables and
 * a local encrypted storage.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

/**
 * Supported key types
 */
export type ApiKeyType = 'openai' | 'anthropic';

/**
 * Config for the API key manager
 */
export interface ApiKeyManagerConfig {
  /** Directory to store encrypted keys (defaults to user home directory) */
  storageDir?: string;
  
  /** Secret used to encrypt/decrypt keys (defaults to using machine-specific info) */
  encryptionSecret?: string;
  
  /** Whether to prefer env vars over stored keys */
  preferEnvVars?: boolean;
}

/**
 * Manages API keys for AI services
 */
export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private storageDir: string;
  private encryptionSecret: string;
  private preferEnvVars: boolean;
  private keysFile: string;
  
  /**
   * Get the singleton instance of the API key manager
   */
  public static getInstance(config?: ApiKeyManagerConfig): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager(config);
    }
    return ApiKeyManager.instance;
  }
  
  /**
   * Private constructor - use getInstance() instead
   */
  private constructor(config?: ApiKeyManagerConfig) {
    this.storageDir = config?.storageDir || path.join(os.homedir(), '.dnd-ai-dm');
    this.preferEnvVars = config?.preferEnvVars ?? true;
    
    // Create storage directory if it doesn't exist
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    
    this.keysFile = path.join(this.storageDir, 'api-keys.enc');
    
    // Use provided secret or generate one based on machine-specific info
    this.encryptionSecret = config?.encryptionSecret || this.generateMachineSecret();
  }
  
  /**
   * Set an API key for a specific provider
   * 
   * @param keyType The provider to set the key for
   * @param key The API key
   */
  public async setApiKey(keyType: ApiKeyType, key: string): Promise<void> {
    const keys = await this.loadKeys();
    keys[keyType] = key;
    await this.saveKeys(keys);
  }
  
  /**
   * Get an API key for a specific provider
   * 
   * @param keyType The provider to get the key for
   * @returns The API key, or empty string if not set
   */
  public async getApiKey(keyType: ApiKeyType): Promise<string> {
    // Check environment variables first if preferred
    if (this.preferEnvVars) {
      const envKey = this.getEnvApiKey(keyType);
      if (envKey) {
        return envKey;
      }
    }
    
    // Fall back to stored keys
    const keys = await this.loadKeys();
    return keys[keyType] || '';
  }
  
  /**
   * Check if an API key is set for a specific provider
   * 
   * @param keyType The provider to check
   * @returns True if a key is set, false otherwise
   */
  public async hasApiKey(keyType: ApiKeyType): Promise<boolean> {
    // Check environment variables first if preferred
    if (this.preferEnvVars) {
      const envKey = this.getEnvApiKey(keyType);
      if (envKey) {
        return true;
      }
    }
    
    // Fall back to stored keys
    const keys = await this.loadKeys();
    return !!keys[keyType];
  }
  
  /**
   * Clear an API key for a specific provider
   * 
   * @param keyType The provider to clear the key for
   */
  public async clearApiKey(keyType: ApiKeyType): Promise<void> {
    const keys = await this.loadKeys();
    delete keys[keyType];
    await this.saveKeys(keys);
  }
  
  /**
   * Clear all stored API keys
   */
  public async clearAllKeys(): Promise<void> {
    await this.saveKeys({});
  }
  
  /**
   * Get an API key from environment variables
   * 
   * @param keyType The provider to get the key for
   * @returns The API key from environment variables, or null if not set
   */
  private getEnvApiKey(keyType: ApiKeyType): string | null {
    switch (keyType) {
      case 'openai':
        return process.env.OPENAI_API_KEY || null;
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY || null;
      default:
        return null;
    }
  }
  
  /**
   * Load stored API keys
   * 
   * @returns Object mapping key types to API keys
   */
  private async loadKeys(): Promise<Record<ApiKeyType, string>> {
    try {
      if (!fs.existsSync(this.keysFile)) {
        return {};
      }
      
      const encryptedData = await fs.promises.readFile(this.keysFile, 'utf8');
      const decrypted = this.decrypt(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error loading API keys:', error);
      return {};
    }
  }
  
  /**
   * Save API keys to storage
   * 
   * @param keys Object mapping key types to API keys
   */
  private async saveKeys(keys: Record<ApiKeyType, string>): Promise<void> {
    try {
      const data = JSON.stringify(keys);
      const encrypted = this.encrypt(data);
      await fs.promises.writeFile(this.keysFile, encrypted, 'utf8');
    } catch (error) {
      console.error('Error saving API keys:', error);
      throw new Error('Failed to save API keys');
    }
  }
  
  /**
   * Encrypt a string using the encryption secret
   * 
   * @param text The text to encrypt
   * @returns The encrypted text
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(this.encryptionSecret).digest('base64').substring(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }
  
  /**
   * Decrypt a string using the encryption secret
   * 
   * @param text The encrypted text
   * @returns The decrypted text
   */
  private decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(this.encryptionSecret).digest('base64').substring(0, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  
  /**
   * Generate a machine-specific secret for encryption
   * 
   * @returns A secret based on machine-specific information
   */
  private generateMachineSecret(): string {
    // Use a combination of machine-specific information to generate a secret
    const hostname = os.hostname();
    const username = os.userInfo().username;
    const cpus = os.cpus().length;
    const platform = os.platform();
    
    // Combine and hash to create a deterministic secret
    return crypto.createHash('sha256')
      .update(`${hostname}:${username}:${cpus}:${platform}:dnd-ai-dm-secret`)
      .digest('hex');
  }
} 