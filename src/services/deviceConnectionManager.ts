
/**
 * Device Connection Manager - Real-time device monitoring and health management
 */

interface DeviceStatus {
  isConnected: boolean;
  deviceInfo?: any;
  lastCheck: Date;
  isChecking: boolean;
  error?: string;
}

interface ConnectionManagerOptions {
  checkInterval: number; // ms
  retryAttempts: number;
  healthCheckTimeout: number; // ms
}

type ConnectionStatusListener = (status: DeviceStatus) => void;

class DeviceConnectionManager {
  private static instance: DeviceConnectionManager;
  private status: DeviceStatus = {
    isConnected: false,
    lastCheck: new Date(),
    isChecking: false
  };
  
  private listeners: Set<ConnectionStatusListener> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private options: ConnectionManagerOptions = {
    checkInterval: 5000,
    retryAttempts: 3,
    healthCheckTimeout: 10000
  };

  static getInstance(): DeviceConnectionManager {
    if (!DeviceConnectionManager.instance) {
      DeviceConnectionManager.instance = new DeviceConnectionManager();
    }
    return DeviceConnectionManager.instance;
  }

  private constructor() {}

  /**
   * Initialize the connection manager
   */
  async initialize(mfs100Client: any, options?: Partial<ConnectionManagerOptions>): Promise<void> {
    this.options = { ...this.options, ...options };
    this.mfs100Client = mfs100Client;
    
    // Perform initial check
    await this.performHealthCheck();
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('Device Connection Manager initialized');
  }

  private mfs100Client: any;

  /**
   * Start real-time device monitoring
   */
  private startMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.options.checkInterval);
  }

  /**
   * Stop device monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Perform device health check
   */
  private async performHealthCheck(): Promise<void> {
    if (this.status.isChecking) {
      return; // Avoid concurrent checks
    }

    this.status.isChecking = true;
    this.notifyListeners();

    try {
      const healthCheckPromise = this.checkDeviceHealth();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), this.options.healthCheckTimeout)
      );

      const isConnected = await Promise.race([healthCheckPromise, timeoutPromise]) as boolean;
      
      const previousStatus = this.status.isConnected;
      
      this.status = {
        isConnected,
        lastCheck: new Date(),
        isChecking: false,
        error: isConnected ? undefined : 'Device not responding'
      };

      // Log status changes
      if (previousStatus !== isConnected) {
        console.log(`Device status changed: ${isConnected ? 'Connected' : 'Disconnected'}`);
      }

    } catch (error) {
      this.status = {
        isConnected: false,
        lastCheck: new Date(),
        isChecking: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }

    this.notifyListeners();
  }

  /**
   * Check if device is healthy
   */
  private async checkDeviceHealth(): Promise<boolean> {
    try {
      if (!this.mfs100Client.isInitialized()) {
        return false;
      }

      const deviceInfo = await this.mfs100Client.getDeviceInfo();
      
      if (deviceInfo.httpStaus && deviceInfo.data?.ErrorCode === "0") {
        this.status.deviceInfo = deviceInfo.data.DeviceInfo;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Device health check failed:', error);
      return false;
    }
  }

  /**
   * Force an immediate connection check
   */
  async forceCheck(): Promise<DeviceStatus> {
    await this.performHealthCheck();
    return this.getStatus();
  }

  /**
   * Get current device status
   */
  getStatus(): DeviceStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to connection status changes
   */
  subscribe(listener: ConnectionStatusListener): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current status
    listener(this.getStatus());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status changes
   */
  private notifyListeners(): void {
    const currentStatus = this.getStatus();
    this.listeners.forEach(listener => {
      try {
        listener(currentStatus);
      } catch (error) {
        console.error('Connection status listener error:', error);
      }
    });
  }

  /**
   * Attempt to reconnect to the device
   */
  async reconnect(): Promise<boolean> {
    console.log('Attempting device reconnection...');
    
    try {
      // Re-initialize the MFS100 client
      const initialized = await this.mfs100Client.initialize();
      
      if (initialized) {
        await this.performHealthCheck();
        return this.status.isConnected;
      }
      
      return false;
    } catch (error) {
      console.error('Reconnection failed:', error);
      return false;
    }
  }

  /**
   * Get device information if connected
   */
  getDeviceInfo(): any {
    return this.status.deviceInfo;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.listeners.clear();
  }
}

export const deviceConnectionManager = DeviceConnectionManager.getInstance();
export type { DeviceStatus, ConnectionStatusListener, ConnectionManagerOptions };
