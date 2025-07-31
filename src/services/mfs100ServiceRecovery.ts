
/**
 * MFS100 Service Recovery Manager
 * Handles service recovery without requiring system restarts
 */

class MFS100ServiceRecovery {
  private static instance: MFS100ServiceRecovery;
  private isRecovering = false;
  private maxRetries = 3;
  private recoveryDelay = 5000; // 5 seconds
  private servicePort = 8003;
  private baseUrl = 'https://localhost:8003/mfs100';

  private constructor() {}

  static getInstance(): MFS100ServiceRecovery {
    if (!MFS100ServiceRecovery.instance) {
      MFS100ServiceRecovery.instance = new MFS100ServiceRecovery();
    }
    return MFS100ServiceRecovery.instance;
  }

  // Check if service is actually running on the port
  private async checkServiceHealth(): Promise<boolean> {
    try {
      console.log('🔍 Checking MFS100 service health...');
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeout);
      return response.ok;

    } catch (error) {
      console.warn('Service health check failed:', error);
      return false;
    }
  }

  // Force service restart using alternative methods
  private async attemptServiceRestart(): Promise<boolean> {
    console.log('🔄 Attempting to restart MFS100 service...');

    try {
      // Try to ping the service with different endpoints
      const endpoints = ['/info', '/device', '/status'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (response.ok) {
            console.log('✅ Service responded to', endpoint);
            return true;
          }
        } catch (error) {
          // Continue to next endpoint
        }
      }

      // Try alternative ports that MFS100 might be running on
      const altPorts = [8002, 8004, 11100, 11101];
      
      for (const port of altPorts) {
        try {
          const altUrl = `https://localhost:${port}/mfs100/info`;
          const response = await fetch(altUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (response.ok) {
            console.log(`✅ Service found on alternative port ${port}`);
            // Update the base URL for future requests
            this.baseUrl = `https://localhost:${port}/mfs100`;
            return true;
          }
        } catch (error) {
          // Continue to next port
        }
      }

      return false;

    } catch (error) {
      console.error('Service restart attempt failed:', error);
      return false;
    }
  }

  // Clear browser cache and service state
  private async clearServiceCache(): Promise<void> {
    console.log('🧹 Clearing service cache and state...');
    
    try {
      // Clear any cached responses
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (name.includes('mfs100') || name.includes('localhost:8003')) {
            await caches.delete(name);
          }
        }
      }

      // Clear localStorage entries related to MFS100
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('mfs100') || key.includes('fingerprint')) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage entries
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.includes('mfs100') || key.includes('fingerprint')) {
          sessionStorage.removeItem(key);
        }
      });

      console.log('✅ Cache cleared successfully');

    } catch (error) {
      console.error('Cache clearing failed:', error);
    }
  }

  // Attempt to wake up the service
  private async wakeUpService(): Promise<boolean> {
    console.log('⏰ Attempting to wake up MFS100 service...');

    try {
      // Send multiple quick requests to wake up the service
      const wakeUpRequests = Array(5).fill(null).map(async (_, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 500));
        
        try {
          await fetch(`${this.baseUrl}/info?wake=${Date.now()}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'MFS100-Recovery-Agent'
            }
          });
        } catch (error) {
          // Expected to fail initially
        }
      });

      await Promise.allSettled(wakeUpRequests);

      // Wait a moment for service to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if service is now responding
      return await this.checkServiceHealth();

    } catch (error) {
      console.error('Service wake up failed:', error);
      return false;
    }
  }

  // Main recovery function
  async recoverService(): Promise<{ success: boolean; message: string; newBaseUrl?: string }> {
    if (this.isRecovering) {
      return { success: false, message: 'Recovery already in progress' };
    }

    this.isRecovering = true;
    console.log('🚀 Starting MFS100 service recovery process...');

    try {
      // Step 1: Clear cache and state
      await this.clearServiceCache();

      // Step 2: Try to wake up existing service
      console.log('Step 1: Attempting to wake up service...');
      if (await this.wakeUpService()) {
        console.log('✅ Service recovered successfully via wake up');
        return { 
          success: true, 
          message: 'Service recovered successfully',
          newBaseUrl: this.baseUrl
        };
      }

      // Step 3: Try service restart methods
      console.log('Step 2: Attempting service restart...');
      if (await this.attemptServiceRestart()) {
        console.log('✅ Service recovered successfully via restart');
        return { 
          success: true, 
          message: 'Service recovered after restart',
          newBaseUrl: this.baseUrl
        };
      }

      // Step 4: Wait and retry
      console.log('Step 3: Waiting for service to stabilize...');
      await new Promise(resolve => setTimeout(resolve, this.recoveryDelay));

      if (await this.checkServiceHealth()) {
        console.log('✅ Service recovered after waiting');
        return { 
          success: true, 
          message: 'Service recovered after stabilization',
          newBaseUrl: this.baseUrl
        };
      }

      // If all recovery attempts fail
      return {
        success: false,
        message: 'Service recovery failed. Please ensure MFS100 device is connected and the service is installed correctly.'
      };

    } catch (error) {
      console.error('Recovery process failed:', error);
      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

    } finally {
      this.isRecovering = false;
      console.log('🏁 Recovery process completed');
    }
  }

  // Get current service URL
  getServiceUrl(): string {
    return this.baseUrl;
  }

  // Check if recovery is in progress
  isRecoveryInProgress(): boolean {
    return this.isRecovering;
  }
}

export const mfs100ServiceRecovery = MFS100ServiceRecovery.getInstance();
