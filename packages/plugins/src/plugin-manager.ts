import { EventEmitter } from 'events';
import { 
  PluginManifest, 
  PluginInstance, 
  PluginState,
  PluginPermission,
  PluginConfig,
  PluginHost,
  PluginMessage,
  PluginSandbox
} from './types';

// Type definitions for WASM plugin lifecycle functions
type WasmLifecycleFunction = () => void | Promise<void>;
type WasmMessageHandler = (messageJson: string) => string | Promise<string>;

/**
 * Plugin manager for loading and managing WASM plugins
 */
export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance>;
  private configs: Map<string, PluginConfig>;
  private host: PluginHost;
  
  constructor(host: PluginHost) {
    super();
    this.plugins = new Map();
    this.configs = new Map();
    this.host = host;
  }
  
  /**
   * Load a plugin from WASM binary
   */
  async loadPlugin(
    wasmBytes: Uint8Array, 
    manifest: PluginManifest,
    config?: PluginConfig
  ): Promise<PluginInstance> {
    // Check if plugin already loaded
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already loaded`);
    }
    
    // Validate permissions
    const requestedPermissions = new Set(manifest.permissions);
    const grantedPermissions = new Set(config?.permissions || manifest.permissions);
    
    // Ensure granted permissions are subset of requested
    for (const perm of grantedPermissions) {
      if (!requestedPermissions.has(perm)) {
        throw new Error(`Permission ${perm} not requested by plugin`);
      }
    }
    
    // Create sandbox
    const sandbox: PluginSandbox = {
      permissions: grantedPermissions,
      memory: {
        limit: config?.sandboxLimits?.memory || 50 * 1024 * 1024, // 50MB default
        used: 0
      },
      cpu: {
        limit: config?.sandboxLimits?.cpu || 1000, // 1 second default
        used: 0
      },
      storage: {
        limit: config?.sandboxLimits?.storage || 10 * 1024 * 1024, // 10MB default
        used: 0
      }
    };
    
    // Create plugin instance
    const plugin: PluginInstance = {
      id: manifest.id,
      manifest,
      wasmModule: null as any,
      wasmInstance: null as any,
      memory: null as any,
      state: PluginState.LOADING,
      sandbox
    };
    
    try {
      // Create memory
      plugin.memory = new WebAssembly.Memory({
        initial: 256, // 16MB initial
        maximum: Math.floor(sandbox.memory.limit / 65536) // Convert to pages
      });
      
      // Create import object with host bindings
      const importObject = this.createImportObject(plugin);
      
      // Compile and instantiate WASM module
      plugin.wasmModule = await WebAssembly.compile(wasmBytes);
      plugin.wasmInstance = await WebAssembly.instantiate(
        plugin.wasmModule,
        importObject
      );
      
      // Initialize plugin
      const initFn = plugin.wasmInstance.exports._init as WasmLifecycleFunction | undefined;
      if (initFn) {
        await initFn();
      }
      
      plugin.state = PluginState.LOADED;
      
      // Store plugin
      this.plugins.set(manifest.id, plugin);
      if (config) {
        this.configs.set(manifest.id, config);
      }
      
      this.emit('plugin:loaded', plugin);
      
      return plugin;
    } catch (error) {
      plugin.state = PluginState.ERROR;
      this.emit('plugin:error', manifest.id, error as Error);
      throw error;
    }
  }
  
  /**
   * Activate a plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (plugin.state === PluginState.ACTIVE) {
      return;
    }
    
    if (plugin.state !== PluginState.LOADED && plugin.state !== PluginState.SUSPENDED) {
      throw new Error(`Plugin ${pluginId} cannot be activated in state ${plugin.state}`);
    }
    
    try {
      // Call plugin activation handler
      const activateFn = plugin.wasmInstance.exports._activate as WasmLifecycleFunction | undefined;
      if (activateFn) {
        await activateFn();
      }
      
      plugin.state = PluginState.ACTIVE;
      this.emit('plugin:activated', plugin);
    } catch (error) {
      plugin.state = PluginState.ERROR;
      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }
  
  /**
   * Suspend a plugin
   */
  async suspendPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (plugin.state !== PluginState.ACTIVE) {
      return;
    }
    
    try {
      // Call plugin suspension handler
      const suspendFn = plugin.wasmInstance.exports._suspend as WasmLifecycleFunction | undefined;
      if (suspendFn) {
        await suspendFn();
      }
      
      plugin.state = PluginState.SUSPENDED;
      this.emit('plugin:suspended', plugin);
    } catch (error) {
      plugin.state = PluginState.ERROR;
      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }
  
  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }
    
    try {
      // Suspend if active
      if (plugin.state === PluginState.ACTIVE) {
        await this.suspendPlugin(pluginId);
      }
      
      // Call plugin cleanup handler
      const cleanupFn = plugin.wasmInstance.exports._cleanup as WasmLifecycleFunction | undefined;
      if (cleanupFn) {
        await cleanupFn();
      }
      
      // Remove plugin
      this.plugins.delete(pluginId);
      this.configs.delete(pluginId);
      
      this.emit('plugin:unloaded', pluginId);
    } catch (error) {
      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }
  
  /**
   * Call a plugin function
   */
  async callPluginFunction(
    pluginId: string, 
    functionName: string, 
    ...args: any[]
  ): Promise<any> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (plugin.state !== PluginState.ACTIVE) {
      throw new Error(`Plugin ${pluginId} is not active`);
    }
    
    const fn = plugin.wasmInstance.exports[functionName];
    if (!fn || typeof fn !== 'function') {
      throw new Error(`Function ${functionName} not found in plugin ${pluginId}`);
    }
    
    try {
      // Track CPU usage
      const startTime = performance.now();
      
      // Call function
      const result = await fn(...args);
      
      // Update CPU usage
      const elapsed = performance.now() - startTime;
      plugin.sandbox.cpu.used += elapsed;
      
      // Check CPU limit
      if (plugin.sandbox.cpu.used > plugin.sandbox.cpu.limit) {
        throw new Error('Plugin CPU limit exceeded');
      }
      
      return result;
    } catch (error) {
      plugin.state = PluginState.ERROR;
      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }
  
  /**
   * Send message to plugin
   */
  async sendMessage(pluginId: string, message: PluginMessage): Promise<any> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (plugin.state !== PluginState.ACTIVE) {
      throw new Error(`Plugin ${pluginId} is not active`);
    }
    
    // Handle message through plugin's message handler
    const handleMessageFn = plugin.wasmInstance.exports._handleMessage as WasmMessageHandler | undefined;
    if (handleMessageFn) {
      const messageJson = JSON.stringify(message);
      const responseJson = await handleMessageFn(messageJson);
      return JSON.parse(responseJson);
    }
    
    throw new Error(`Plugin ${pluginId} does not support messaging`);
  }
  
  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginInstance | null {
    return this.plugins.get(pluginId) || null;
  }
  
  /**
   * Get all loaded plugins
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * List plugins (test compatibility)
   */
  listPlugins(): PluginInstance[] {
    return this.getAllPlugins();
  }
  
  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginId: string): PluginConfig | null {
    return this.configs.get(pluginId) || null;
  }
  
  /**
   * Update plugin configuration
   */
  updatePluginConfig(pluginId: string, config: Partial<PluginConfig>): void {
    const existingConfig = this.configs.get(pluginId) || {
      enabled: true,
      permissions: []
    };
    
    this.configs.set(pluginId, {
      ...existingConfig,
      ...config
    });
  }
  
  /**
   * Check if plugin has permission
   */
  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    
    return plugin.sandbox.permissions.has(permission);
  }
  
  /**
   * Create import object for WASM instantiation
   */
  private createImportObject(plugin: PluginInstance): WebAssembly.Imports {
    return {
      env: {
        memory: plugin.memory,
        
        // Permission-gated host functions
        host_vault_read: this.createHostFunction(plugin, PluginPermission.VAULT_READ, 
          async (keyPtr: number, keyLen: number) => {
            const key = this.readString(plugin, keyPtr, keyLen);
            return this.host.vaultRead(key);
          }
        ),
        
        host_vault_write: this.createHostFunction(plugin, PluginPermission.VAULT_WRITE,
          async (keyPtr: number, keyLen: number, valuePtr: number, valueLen: number) => {
            const key = this.readString(plugin, keyPtr, keyLen);
            const value = this.readString(plugin, valuePtr, valueLen);
            await this.host.vaultWrite(key, JSON.parse(value));
          }
        ),
        
        host_message_send: this.createHostFunction(plugin, PluginPermission.MESSAGE_SEND,
          async (convIdPtr: number, convIdLen: number, contentPtr: number, contentLen: number) => {
            const conversationId = this.readString(plugin, convIdPtr, convIdLen);
            const content = this.readString(plugin, contentPtr, contentLen);
            await this.host.messageSend(conversationId, JSON.parse(content));
          }
        ),
        
        host_show_toast: this.createHostFunction(plugin, PluginPermission.UI_TOAST,
          (msgPtr: number, msgLen: number, typePtr: number, typeLen: number) => {
            const message = this.readString(plugin, msgPtr, msgLen);
            const type = this.readString(plugin, typePtr, typeLen) as any;
            this.host.showToast(message, type);
          }
        ),
        
        // Memory management
        host_allocate: (size: number) => {
          // Check memory limit
          plugin.sandbox.memory.used += size;
          if (plugin.sandbox.memory.used > plugin.sandbox.memory.limit) {
            throw new Error('Plugin memory limit exceeded');
          }
          
          // In a real implementation, this would allocate memory in the WASM heap
          return 0; // Placeholder
        },
        
        host_free: (_ptr: number) => {
          // In a real implementation, this would free memory in the WASM heap
        },
        
        // Logging
        host_log: (msgPtr: number, msgLen: number) => {
          const message = this.readString(plugin, msgPtr, msgLen);
          console.log(`[Plugin ${plugin.id}]`, message);
        }
      }
    };
  }
  
  /**
   * Create a permission-gated host function
   */
  private createHostFunction<T extends (...args: any[]) => any>(
    plugin: PluginInstance,
    permission: PluginPermission,
    fn: T
  ): T {
    return ((...args: Parameters<T>) => {
      if (!this.hasPermission(plugin.id, permission)) {
        throw new Error(`Plugin ${plugin.id} does not have permission ${permission}`);
      }
      return fn(...args);
    }) as T;
  }
  
  /**
   * Read string from WASM memory
   */
  private readString(plugin: PluginInstance, ptr: number, len: number): string {
    const memory = new Uint8Array(plugin.memory.buffer);
    const bytes = memory.slice(ptr, ptr + len);
    return new TextDecoder().decode(bytes);
  }
  
}