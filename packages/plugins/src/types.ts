/**
 * Type definitions for Volli plugin system
 */

/**
 * Plugin manifest
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  main: string; // WASM entry point
  permissions: PluginPermission[];
  dependencies?: Record<string, string>;
  api: PluginAPI;
  metadata?: Record<string, any>;
}

/**
 * Plugin permissions
 */
export enum PluginPermission {
  // Vault permissions
  VAULT_READ = 'vault:read',
  VAULT_WRITE = 'vault:write',
  VAULT_DELETE = 'vault:delete',
  
  // Identity permissions
  IDENTITY_READ = 'identity:read',
  IDENTITY_SIGN = 'identity:sign',
  
  // Messaging permissions
  MESSAGE_READ = 'message:read',
  MESSAGE_SEND = 'message:send',
  MESSAGE_DELETE = 'message:delete',
  
  // Network permissions
  NETWORK_HTTP = 'network:http',
  NETWORK_WEBSOCKET = 'network:websocket',
  
  // System permissions
  SYSTEM_NOTIFICATIONS = 'system:notifications',
  SYSTEM_CLIPBOARD = 'system:clipboard',
  SYSTEM_STORAGE = 'system:storage',
  
  // UI permissions
  UI_MODAL = 'ui:modal',
  UI_TOAST = 'ui:toast',
  UI_SIDEBAR = 'ui:sidebar'
}

/**
 * Plugin API definition
 */
export interface PluginAPI {
  version: string;
  exports: PluginExport[];
  hooks?: PluginHook[];
  commands?: PluginCommand[];
  views?: PluginView[];
}

/**
 * Plugin export
 */
export interface PluginExport {
  name: string;
  type: 'function' | 'class' | 'constant';
  description?: string;
  parameters?: PluginParameter[];
  returns?: PluginType;
}

/**
 * Plugin hook
 */
export interface PluginHook {
  event: string;
  handler: string; // Export name
  priority?: number;
}

/**
 * Plugin command
 */
export interface PluginCommand {
  id: string;
  name: string;
  description?: string;
  handler: string; // Export name
  keybinding?: string;
  icon?: string;
}

/**
 * Plugin view
 */
export interface PluginView {
  id: string;
  type: 'panel' | 'modal' | 'overlay';
  title: string;
  handler: string; // Export name
  icon?: string;
  position?: 'left' | 'right' | 'bottom' | 'center';
}

/**
 * Plugin parameter
 */
export interface PluginParameter {
  name: string;
  type: PluginType;
  required?: boolean;
  default?: any;
  description?: string;
}

/**
 * Plugin type system
 */
export type PluginType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'buffer'
  | 'void'
  | 'any';

/**
 * Plugin instance
 */
export interface PluginInstance {
  id: string;
  manifest: PluginManifest;
  wasmModule: WebAssembly.Module;
  wasmInstance: WebAssembly.Instance;
  memory: WebAssembly.Memory;
  state: PluginState;
  sandbox: PluginSandbox;
}

/**
 * Plugin state
 */
export enum PluginState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ERROR = 'error'
}

/**
 * Plugin sandbox
 */
export interface PluginSandbox {
  permissions: Set<PluginPermission>;
  memory: {
    limit: number;
    used: number;
  };
  cpu: {
    limit: number;
    used: number;
  };
  storage: {
    limit: number;
    used: number;
  };
}

/**
 * Plugin host interface
 */
export interface PluginHost {
  // Vault operations
  vaultRead(key: string): Promise<any>;
  vaultWrite(key: string, value: any): Promise<void>;
  vaultDelete(key: string): Promise<void>;
  
  // Identity operations
  identityRead(): Promise<any>;
  identitySign(data: Uint8Array): Promise<Uint8Array>;
  
  // Messaging operations
  messageRead(conversationId: string): Promise<any[]>;
  messageSend(conversationId: string, content: any): Promise<void>;
  
  // UI operations
  showModal(content: any): Promise<void>;
  showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  
  // System operations
  getClipboard(): Promise<string>;
  setClipboard(text: string): Promise<void>;
  showNotification(title: string, body: string): void;
  
  // Storage operations
  storageGet(key: string): Promise<any>;
  storageSet(key: string, value: any): Promise<void>;
  storageDelete(key: string): Promise<void>;
}

/**
 * Plugin message
 */
export interface PluginMessage {
  id: string;
  type: 'request' | 'response' | 'event';
  method?: string;
  params?: any;
  result?: any;
  error?: PluginError;
}

/**
 * Plugin error
 */
export interface PluginError {
  code: number;
  message: string;
  data?: any;
}

/**
 * Plugin events
 */
export interface PluginEvents {
  'plugin:loaded': (plugin: PluginInstance) => void;
  'plugin:activated': (plugin: PluginInstance) => void;
  'plugin:suspended': (plugin: PluginInstance) => void;
  'plugin:unloaded': (pluginId: string) => void;
  'plugin:error': (pluginId: string, error: Error) => void;
  'plugin:message': (pluginId: string, message: PluginMessage) => void;
}

/**
 * Plugin repository entry
 */
export interface PluginRepositoryEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  verified: boolean;
  tags: string[];
  manifest: PluginManifest;
  downloadUrl: string;
  checksum: string;
  size: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled: boolean;
  permissions: PluginPermission[];
  settings?: Record<string, any>;
  autoUpdate?: boolean;
  sandboxLimits?: {
    memory?: number;
    cpu?: number;
    storage?: number;
  };
}