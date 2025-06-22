import { EventEmitter } from 'events';
import { PluginRepositoryEntry, PluginManifest } from './types';
import { PluginLoader } from './plugin-loader';

/**
 * Plugin repository for discovering and managing plugins
 */
export class PluginRepository extends EventEmitter {
  private repositoryUrl: string;
  private cache: Map<string, PluginRepositoryEntry>;
  private loader: PluginLoader;
  
  constructor(repositoryUrl: string = 'https://plugins.volli.chat') {
    super();
    this.repositoryUrl = repositoryUrl;
    this.cache = new Map();
    this.loader = new PluginLoader();
  }
  
  /**
   * Search for plugins
   */
  async search(query?: {
    text?: string;
    tags?: string[];
    author?: string;
    verified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PluginRepositoryEntry[]> {
    // Build query parameters
    const params = new URLSearchParams();
    
    if (query?.text) params.append('q', query.text);
    if (query?.tags) params.append('tags', query.tags.join(','));
    if (query?.author) params.append('author', query.author);
    if (query?.verified !== undefined) params.append('verified', query.verified.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.offset) params.append('offset', query.offset.toString());
    
    // Fetch from repository
    const response = await fetch(`${this.repositoryUrl}/api/plugins?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to search plugins: ${response.statusText}`);
    }
    
    const entries = await response.json() as PluginRepositoryEntry[];
    
    // Update cache
    for (const entry of entries) {
      this.cache.set(entry.id, entry);
    }
    
    return entries;
  }
  
  /**
   * Get plugin details
   */
  async getPlugin(pluginId: string): Promise<PluginRepositoryEntry | null> {
    // Check cache first
    const cached = this.cache.get(pluginId);
    if (cached) {
      return cached;
    }
    
    // Fetch from repository
    const response = await fetch(`${this.repositoryUrl}/api/plugins/${pluginId}`);
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get plugin: ${response.statusText}`);
    }
    
    const entry = await response.json() as PluginRepositoryEntry;
    
    // Update cache
    this.cache.set(pluginId, entry);
    
    return entry;
  }
  
  /**
   * Get featured plugins
   */
  async getFeatured(limit: number = 10): Promise<PluginRepositoryEntry[]> {
    const response = await fetch(`${this.repositoryUrl}/api/plugins/featured?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to get featured plugins: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Get popular plugins
   */
  async getPopular(limit: number = 10): Promise<PluginRepositoryEntry[]> {
    const response = await fetch(`${this.repositoryUrl}/api/plugins/popular?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to get popular plugins: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Get recent plugins
   */
  async getRecent(limit: number = 10): Promise<PluginRepositoryEntry[]> {
    const response = await fetch(`${this.repositoryUrl}/api/plugins/recent?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to get recent plugins: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Download plugin
   */
  async downloadPlugin(pluginId: string): Promise<{
    wasmBytes: Uint8Array;
    manifest: PluginManifest;
  }> {
    // Get plugin details
    const entry = await this.getPlugin(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    // Download plugin package
    const response = await fetch(entry.downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download plugin: ${response.statusText}`);
    }
    
    const packageData = new Uint8Array(await response.arrayBuffer());
    
    // Verify checksum
    if (!this.loader.verifyChecksum(packageData, entry.checksum)) {
      throw new Error('Plugin package checksum verification failed');
    }
    
    // Load plugin
    const plugin = await this.loader.loadFromPackage(packageData);
    
    // Verify manifest matches
    if (plugin.manifest.id !== entry.manifest.id ||
        plugin.manifest.version !== entry.manifest.version) {
      throw new Error('Plugin manifest mismatch');
    }
    
    // Update download count
    this.incrementDownloadCount(pluginId).catch(console.error);
    
    return plugin;
  }
  
  /**
   * Check for plugin updates
   */
  async checkForUpdates(installedPlugins: Array<{
    id: string;
    version: string;
  }>): Promise<Array<{
    pluginId: string;
    currentVersion: string;
    latestVersion: string;
    entry: PluginRepositoryEntry;
  }>> {
    const updates = [];
    
    for (const installed of installedPlugins) {
      const latest = await this.getPlugin(installed.id);
      if (!latest) continue;
      
      if (this.compareVersions(latest.version, installed.version) > 0) {
        updates.push({
          pluginId: installed.id,
          currentVersion: installed.version,
          latestVersion: latest.version,
          entry: latest
        });
      }
    }
    
    return updates;
  }
  
  /**
   * Submit plugin rating
   */
  async ratePlugin(pluginId: string, rating: number): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const response = await fetch(`${this.repositoryUrl}/api/plugins/${pluginId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to rate plugin: ${response.statusText}`);
    }
    
    // Clear cache entry to force refresh
    this.cache.delete(pluginId);
  }
  
  /**
   * Report plugin issue
   */
  async reportPlugin(pluginId: string, reason: string, details?: string): Promise<void> {
    const response = await fetch(`${this.repositoryUrl}/api/plugins/${pluginId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason, details })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to report plugin: ${response.statusText}`);
    }
  }
  
  /**
   * Increment download count
   */
  private async incrementDownloadCount(pluginId: string): Promise<void> {
    try {
      await fetch(`${this.repositoryUrl}/api/plugins/${pluginId}/download`, {
        method: 'POST'
      });
    } catch (error) {
      // Don't fail the download if we can't increment the counter
      console.error('Failed to increment download count:', error);
    }
  }
  
  /**
   * Compare semantic versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    
    return 0;
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}