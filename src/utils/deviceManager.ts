
/**
 * Device Manager - Centralized device connection management
 */

interface DeviceConfig {
  id: string;
  name: string;
  port: number;
  protocol: 'http' | 'https';
  endpoint: string;
  checkInterval: number;
}

interface DeviceStatus {
  isConnected: boolean;
  lastCheck: Date;
  error: string | null;
}

class DeviceManager {
  private devices = new Map<string, DeviceConfig>();
  private statuses = new Map<string, DeviceStatus>();
  private intervals = new Map<string, NodeJS.Timeout>();

  registerDevice(deviceId: string, config?: Partial<DeviceConfig>) {
    const defaultConfig: DeviceConfig = {
      id: deviceId,
      name: deviceId.includes('mfs100') ? 'MFS100' : 'Unknown Device',
      port: deviceId.includes('mfs100') ? 8003 : 11100,
      protocol: deviceId.includes('mfs100') ? 'https' : 'http',
      endpoint: deviceId.includes('mfs100') ? '/mfs100/info' : '/rd/info',
      checkInterval: 5000
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.devices.set(deviceId, finalConfig);
    
    // Initialize status
    this.statuses.set(deviceId, {
      isConnected: false,
      lastCheck: new Date(),
      error: null
    });

    // Start monitoring
    this.startMonitoring(deviceId);
    
    console.log(`Device registered: ${deviceId}`, finalConfig);
  }

  private startMonitoring(deviceId: string) {
    const config = this.devices.get(deviceId);
    if (!config) return;

    // Clear existing interval
    if (this.intervals.has(deviceId)) {
      clearInterval(this.intervals.get(deviceId)!);
    }

    // Start new monitoring
    const interval = setInterval(async () => {
      await this.checkDeviceStatus(deviceId);
    }, config.checkInterval);

    this.intervals.set(deviceId, interval);
    
    // Initial check
    this.checkDeviceStatus(deviceId);
  }

  private async checkDeviceStatus(deviceId: string) {
    const config = this.devices.get(deviceId);
    if (!config) return;

    try {
      const url = `${config.protocol}://localhost:${config.port}${config.endpoint}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeout);
      
      const isConnected = response.ok;
      const currentStatus = this.statuses.get(deviceId);
      
      if (!currentStatus || currentStatus.isConnected !== isConnected) {
        this.updateDeviceStatus(deviceId, {
          isConnected,
          lastCheck: new Date(),
          error: isConnected ? null : `Connection failed: ${response.status}`
        });
      }
    } catch (error) {
      this.updateDeviceStatus(deviceId, {
        isConnected: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Connection error'
      });
    }
  }

  private updateDeviceStatus(deviceId: string, status: DeviceStatus) {
    this.statuses.set(deviceId, status);
    
    // Emit custom event for React components to listen
    window.dispatchEvent(new CustomEvent('deviceStatusChange', {
      detail: { deviceId, ...status }
    }));
    
    console.log(`Device ${deviceId} status:`, status);
  }

  getConnectionStatus(deviceId: string): boolean {
    return this.statuses.get(deviceId)?.isConnected || false;
  }

  getDeviceStatus(deviceId: string): DeviceStatus | null {
    return this.statuses.get(deviceId) || null;
  }

  unregisterDevice(deviceId: string) {
    if (this.intervals.has(deviceId)) {
      clearInterval(this.intervals.get(deviceId)!);
      this.intervals.delete(deviceId);
    }
    
    this.devices.delete(deviceId);
    this.statuses.delete(deviceId);
    
    console.log(`Device unregistered: ${deviceId}`);
  }

  getAllDevices(): Array<{ id: string; config: DeviceConfig; status: DeviceStatus }> {
    const result: Array<{ id: string; config: DeviceConfig; status: DeviceStatus }> = [];
    
    for (const [id, config] of this.devices.entries()) {
      const status = this.statuses.get(id);
      if (status) {
        result.push({ id, config, status });
      }
    }
    
    return result;
  }
}

export const deviceManager = new DeviceManager();
