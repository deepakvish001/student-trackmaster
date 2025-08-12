import pako from 'pako';

export interface CompressionResult {
  compressedData: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: 'gzip' | 'delta' | 'json';
}

export class DataCompressor {
  // GZIP compression for large JSON data
  static compressJSON(data: any): CompressionResult {
    const jsonString = JSON.stringify(data);
    const originalSize = new Blob([jsonString]).size;
    
    try {
      const compressed = pako.gzip(jsonString, { level: 6 });
      const compressedData = btoa(String.fromCharCode(...compressed));
      const compressedSize = new Blob([compressedData]).size;
      
      return {
        compressedData,
        originalSize,
        compressedSize,
        compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
        algorithm: 'gzip'
      };
    } catch (error) {
      console.error('Compression failed:', error);
      return {
        compressedData: jsonString,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        algorithm: 'json'
      };
    }
  }

  static decompressJSON<T = any>(compressedData: string, algorithm: 'gzip' | 'json' = 'gzip'): T {
    if (algorithm === 'json') {
      return JSON.parse(compressedData);
    }
    
    try {
      const compressed = new Uint8Array(
        atob(compressedData).split('').map(char => char.charCodeAt(0))
      );
      const decompressed = pako.ungzip(compressed, { to: 'string' });
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Decompression failed:', error);
      return JSON.parse(compressedData);
    }
  }

  // Base64 compression for fingerprint images
  static compressFingerprintImage(base64Data: string): CompressionResult {
    if (!base64Data || base64Data.length < 1000) {
      return {
        compressedData: base64Data,
        originalSize: base64Data.length,
        compressedSize: base64Data.length,
        compressionRatio: 1,
        algorithm: 'delta'
      };
    }

    const originalSize = base64Data.length;
    
    try {
      // Remove data:image prefix if present
      const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Simple run-length encoding for repetitive patterns
      const compressed = this.runLengthEncode(cleanBase64);
      const compressedSize = compressed.length;
      
      return {
        compressedData: compressed,
        originalSize,
        compressedSize,
        compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
        algorithm: 'delta'
      };
    } catch (error) {
      console.error('Fingerprint compression failed:', error);
      return {
        compressedData: base64Data,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        algorithm: 'delta'
      };
    }
  }

  static decompressFingerprintImage(compressedData: string): string {
    try {
      return this.runLengthDecode(compressedData);
    } catch (error) {
      console.error('Fingerprint decompression failed:', error);
      return compressedData;
    }
  }

  // Delta compression for incremental updates
  static createDelta(original: any, updated: any): any {
    const delta: any = {};
    
    const compareObjects = (obj1: any, obj2: any, path = '') => {
      for (const key in obj2) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (obj1[key] !== obj2[key]) {
          if (typeof obj2[key] === 'object' && obj2[key] !== null && typeof obj1[key] === 'object' && obj1[key] !== null) {
            const nestedDelta = this.createDelta(obj1[key], obj2[key]);
            if (Object.keys(nestedDelta).length > 0) {
              delta[key] = nestedDelta;
            }
          } else {
            delta[key] = obj2[key];
          }
        }
      }
    };
    
    compareObjects(original, updated);
    return delta;
  }

  static applyDelta(original: any, delta: any): any {
    const result = { ...original };
    
    for (const key in delta) {
      if (typeof delta[key] === 'object' && delta[key] !== null && typeof result[key] === 'object' && result[key] !== null) {
        result[key] = this.applyDelta(result[key], delta[key]);
      } else {
        result[key] = delta[key];
      }
    }
    
    return result;
  }

  // Simple run-length encoding
  private static runLengthEncode(data: string): string {
    let encoded = '';
    let count = 1;
    let prevChar = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i] === prevChar && count < 255) {
        count++;
      } else {
        if (count > 3) {
          encoded += `§${count}${prevChar}`;
        } else {
          encoded += prevChar.repeat(count);
        }
        prevChar = data[i];
        count = 1;
      }
    }
    
    // Handle last sequence
    if (count > 3) {
      encoded += `§${count}${prevChar}`;
    } else {
      encoded += prevChar.repeat(count);
    }
    
    return encoded;
  }

  private static runLengthDecode(data: string): string {
    let decoded = '';
    let i = 0;
    
    while (i < data.length) {
      if (data[i] === '§') {
        // Find the number and character
        let numEnd = i + 1;
        while (numEnd < data.length && /\d/.test(data[numEnd])) {
          numEnd++;
        }
        
        const count = parseInt(data.slice(i + 1, numEnd));
        const char = data[numEnd];
        decoded += char.repeat(count);
        i = numEnd + 1;
      } else {
        decoded += data[i];
        i++;
      }
    }
    
    return decoded;
  }

  // Cleanup old compressed data
  static async cleanupOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      const cutoffDate = new Date(Date.now() - maxAge);
      
      // This would be implemented with IndexedDB cleanup
      console.log(`Cleaning up compressed data older than ${cutoffDate.toISOString()}`);
      
      // Implementation would depend on how compressed data is stored
      // For now, just log the cleanup attempt
      return { cleaned: 0, errors: 0 };
    } catch (error) {
      console.error('Cleanup failed:', error);
      return { cleaned: 0, errors: 1 };
    }
  }

  // Get compression statistics
  static getCompressionStats(results: CompressionResult[]): {
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageCompressionRatio: number;
    spaceSaved: number;
    spaceSavedPercentage: number;
  } {
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);
    const averageCompressionRatio = results.length > 0 
      ? results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length 
      : 1;
    
    const spaceSaved = totalOriginalSize - totalCompressedSize;
    const spaceSavedPercentage = totalOriginalSize > 0 ? (spaceSaved / totalOriginalSize) * 100 : 0;
    
    return {
      totalOriginalSize,
      totalCompressedSize,
      averageCompressionRatio,
      spaceSaved,
      spaceSavedPercentage
    };
  }
}

// Add pako dependency
if (typeof window !== 'undefined' && !(window as any).pako) {
  // Fallback compression using browser APIs
  const pako = {
    gzip: (data: string) => new TextEncoder().encode(data),
    ungzip: (data: Uint8Array) => new TextDecoder().decode(data)
  };
  (window as any).pako = pako;
}