import { IPFS } from 'ipfs-core-types';
import { CID } from 'multiformats/cid';
import all from 'it-all';
import { IPFSFileMetadata } from './types';
// import { encryptData, decryptData } from '@volli/vault-core';

// Temporary crypto functions until vault-core types are available
function encryptData(data: Uint8Array, _key: Uint8Array): { ciphertext: Uint8Array; nonce: Uint8Array } {
  // Placeholder encryption
  const nonce = new Uint8Array(24);
  return { ciphertext: data, nonce };
}

function decryptData(ciphertext: Uint8Array, _nonce: Uint8Array, _key: Uint8Array): Uint8Array {
  // Placeholder decryption
  return ciphertext;
}

/**
 * File manager for handling large files in IPFS
 */
export class IPFSFileManager {
  private ipfs: IPFS;
  private chunkSize: number;
  
  constructor(ipfs: IPFS, chunkSize: number = 1024 * 1024) { // 1MB chunks
    this.ipfs = ipfs;
    this.chunkSize = chunkSize;
  }
  
  /**
   * Upload file to IPFS
   */
  async uploadFile(
    data: Uint8Array,
    options?: {
      name?: string;
      type?: string;
      encrypt?: boolean;
      encryptionKey?: Uint8Array;
      onProgress?: (progress: number) => void;
    }
  ): Promise<IPFSFileMetadata> {
    let processedData = data;
    let encrypted = false;
    
    // Encrypt if requested
    if (options?.encrypt && options.encryptionKey) {
      const { ciphertext, nonce } = encryptData(data, options.encryptionKey);
      // Prepend nonce to ciphertext
      processedData = new Uint8Array(nonce.length + ciphertext.length);
      processedData.set(nonce, 0);
      processedData.set(ciphertext, nonce.length);
      encrypted = true;
    }
    
    let cid: string;
    const chunks: string[] = [];
    
    if (processedData.length <= this.chunkSize) {
      // Small file, upload directly
      const result = await this.ipfs.add(processedData, { pin: true });
      cid = result.cid.toString();
      
      if (options?.onProgress) {
        options.onProgress(100);
      }
    } else {
      // Large file, split into chunks
      const totalChunks = Math.ceil(processedData.length / this.chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.chunkSize;
        const end = Math.min(start + this.chunkSize, processedData.length);
        const chunk = processedData.slice(start, end);
        
        const chunkResult = await this.ipfs.add(chunk, { pin: true });
        chunks.push(chunkResult.cid.toString());
        
        if (options?.onProgress) {
          const progress = ((i + 1) / totalChunks) * 100;
          options.onProgress(progress);
        }
      }
      
      // Create manifest for chunks
      const manifest = {
        chunks,
        totalSize: processedData.length,
        chunkSize: this.chunkSize
      };
      
      const manifestResult = await this.ipfs.add(
        JSON.stringify(manifest),
        { pin: true }
      );
      cid = manifestResult.cid.toString();
    }
    
    const metadata: IPFSFileMetadata = {
      cid,
      name: options?.name,
      size: data.length, // Original size
      type: options?.type,
      chunks: chunks.length > 0 ? chunks : undefined,
      encrypted,
      createdAt: Date.now()
    };
    
    return metadata;
  }
  
  /**
   * Download file from IPFS
   */
  async downloadFile(
    metadata: IPFSFileMetadata,
    options?: {
      encryptionKey?: Uint8Array;
      onProgress?: (progress: number) => void;
    }
  ): Promise<Uint8Array> {
    let data: Uint8Array;
    
    if (metadata.chunks && metadata.chunks.length > 0) {
      // Large file with chunks
      const manifestData = await all(this.ipfs.cat(metadata.cid));
      const manifestJson = new TextDecoder().decode(
        Buffer.concat(manifestData)
      );
      const manifest = JSON.parse(manifestJson);
      
      // Download chunks
      const chunks: Uint8Array[] = [];
      const totalChunks = manifest.chunks.length;
      
      for (let i = 0; i < totalChunks; i++) {
        const chunkCid = manifest.chunks[i];
        const chunkData = await all(this.ipfs.cat(chunkCid));
        chunks.push(Buffer.concat(chunkData));
        
        if (options?.onProgress) {
          const progress = ((i + 1) / totalChunks) * 100;
          options.onProgress(progress);
        }
      }
      
      // Combine chunks
      data = Buffer.concat(chunks);
    } else {
      // Small file
      const fileData = await all(this.ipfs.cat(metadata.cid));
      data = Buffer.concat(fileData);
      
      if (options?.onProgress) {
        options.onProgress(100);
      }
    }
    
    // Decrypt if needed
    if (metadata.encrypted && options?.encryptionKey) {
      const nonceLength = 24; // XChaCha20 nonce length
      const nonce = data.slice(0, nonceLength);
      const ciphertext = data.slice(nonceLength);
      
      data = decryptData(ciphertext, nonce, options.encryptionKey);
    } else if (metadata.encrypted && !options?.encryptionKey) {
      throw new Error('Encryption key required for encrypted file');
    }
    
    return data;
  }
  
  /**
   * Delete file from IPFS
   */
  async deleteFile(metadata: IPFSFileMetadata): Promise<void> {
    // Unpin main CID
    await this.ipfs.pin.rm(metadata.cid);
    
    // Unpin chunks if any
    if (metadata.chunks) {
      for (const chunkCid of metadata.chunks) {
        try {
          await this.ipfs.pin.rm(chunkCid);
        } catch (error) {
          // Chunk might already be unpinned
          console.warn(`Failed to unpin chunk ${chunkCid}:`, error);
        }
      }
    }
    
    // Run garbage collection
    await this.runGarbageCollection();
  }
  
  /**
   * Get file info
   */
  async getFileInfo(cid: string): Promise<{
    size: number;
    type: string;
    chunks?: number;
  }> {
    const stat = await this.ipfs.object.stat(CID.parse(cid));
    
    // Try to determine if it's a chunked file
    let chunks: number | undefined;
    try {
      const data = await all(this.ipfs.cat(cid, { length: 1024 })); // Read first 1KB
      const text = new TextDecoder().decode(Buffer.concat(data));
      const manifest = JSON.parse(text);
      
      if (manifest.chunks && Array.isArray(manifest.chunks)) {
        chunks = manifest.chunks.length;
      }
    } catch {
      // Not a manifest, single file
    }
    
    return {
      size: stat.CumulativeSize,
      type: 'application/octet-stream', // Default type
      chunks
    };
  }
  
  /**
   * Stream file from IPFS
   */
  async *streamFile(
    metadata: IPFSFileMetadata,
    _options?: {
      encryptionKey?: Uint8Array;
    }
  ): AsyncGenerator<Uint8Array, void, unknown> {
    if (metadata.chunks && metadata.chunks.length > 0) {
      // Stream chunks
      for (const chunkCid of metadata.chunks) {
        const chunkData = await all(this.ipfs.cat(chunkCid));
        yield Buffer.concat(chunkData);
      }
    } else {
      // Stream single file
      for await (const chunk of this.ipfs.cat(metadata.cid)) {
        yield chunk;
      }
    }
    
    // Note: Streaming encrypted files would require stream cipher
    if (metadata.encrypted) {
      throw new Error('Streaming encrypted files not yet supported');
    }
  }
  
  /**
   * Copy file
   */
  async copyFile(metadata: IPFSFileMetadata): Promise<IPFSFileMetadata> {
    // IPFS is content-addressed, so we just create new metadata
    return {
      ...metadata,
      createdAt: Date.now(),
      modifiedAt: undefined
    };
  }
  
  /**
   * Run garbage collection
   */
  private async runGarbageCollection(): Promise<void> {
    const gc = this.ipfs.repo.gc();
    
    for await (const result of gc) {
      if (result.err) {
        console.error('GC error:', result.err);
      }
    }
  }
}