
// Centralized device management to avoid multiple simultaneous connections
interface DeviceConnection {
  isConnected: boolean;
  lastCheck: number;
  device?: any;
  retryCount: number;
  maxRetries: number;
}

class DeviceManager {
  private static instance: DeviceManager;
  private connections: Map<string, DeviceConnection> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5000; // Reduced from 3000ms
  private readonly CONNECTION_TIMEOUT = 10000;

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  private constructor() {
    // Start monitoring only when first device is registered
  }

  registerDevice(deviceId: string): void {
    if (!this.connections.has(deviceId)) {
      this.connections.set(deviceId, {
        isConnected: false,
        lastCheck: 0,
        retryCount: 0,
        maxRetries: 3
      });
    }

    // Start monitoring if this is the first device
    if (this.connections.size === 1 && !this.checkInterval) {
      this.startMonitoring();
    }
  }

  unregisterDevice(deviceId: string): void {
    this.connections.delete(deviceId);
    
    // Stop monitoring if no devices registered
    if (this.connections.size === 0 && this.checkInterval) {
      this.stopMonitoring();
    }
  }

  private startMonitoring(): void {
    if (this.checkInterval) return;
    
    this.checkInterval = setInterval(() => {
      this.checkAllConnections();
    }, this.CHECK_INTERVAL);
  }

  private stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkAllConnections(): Promise<void> {
    const now = Date.now();
    
    for (const [deviceId, connection] of this.connections.entries()) {
      // Skip if checked recently (debounce)
      if (now - connection.lastCheck < this.CHECK_INTERVAL - 1000) {
        continue;
      }

      try {
        await this.checkSingleConnection(deviceId, connection);
      } catch (error) {
        console.warn(`Connection check failed for ${deviceId}:`, error);
        this.updateConnectionStatus(deviceId, false);
      }
    }
  }

  private async checkSingleConnection(deviceId: string, connection: DeviceConnection): Promise<void> {
    const now = Date.now();
    connection.lastCheck = now;

    try {
      // Quick connection test with timeout
      const checkPromise = this.performConnectionCheck(deviceId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection check timeout')), this.CONNECTION_TIMEOUT)
      );

      const isConnected = await Promise.race([checkPromise, timeoutPromise]) as boolean;
      
      connection.retryCount = isConnected ? 0 : connection.retryCount + 1;
      this.updateConnectionStatus(deviceId, isConnected && connection.retryCount < connection.maxRetries);

    } catch (error) {
      connection.retryCount++;
      this.updateConnectionStatus(deviceId, false);
      console.error(`Connection check error for ${deviceId}:`, error);
    }
  }

  private async performConnectionCheck(deviceId: string): Promise<boolean> {
    // This will be implemented by specific device types
    if (deviceId.startsWith('mfs100')) {
      return this.checkMFS100Connection();
    }
    return false;
  }

  private async checkMFS100Connection(): Promise<boolean> {
    try {
      // Quick info check instead of full initialization
      if (typeof window !== 'undefined' && (window as any).GetMFS100Info) {
        const result = (window as any).GetMFS100Info();
        return result && result.httpStaus;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private updateConnectionStatus(deviceId: string, isConnected: boolean): void {
    const connection = this.connections.get(deviceId);
    if (connection && connection.isConnected !== isConnected) {
      connection.isConnected = isConnected;
      // Emit event for components to listen to
      window.dispatchEvent(new CustomEvent('deviceStatusChange', {
        detail: { deviceId, isConnected }
      }));
    }
  }

  getConnectionStatus(deviceId: string): boolean {
    return this.connections.get(deviceId)?.isConnected || false;
  }

  // Cleanup method
  cleanup(): void {
    this.stopMonitoring();
    this.connections.clear();
  }
}

export const deviceManager = DeviceManager.getInstance();
