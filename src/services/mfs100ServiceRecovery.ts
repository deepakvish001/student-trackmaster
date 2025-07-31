
/**
 * MFS100 Service Recovery Manager
 * Handles service recovery without requiring system restarts
 */

class MFS100ServiceRecovery {
  private static instance: MFS100ServiceRecovery;
  private isRecovering = false;
  private maxRetries = 3;
  private recoveryDelay = 3000; // 3 seconds
  private servicePort = 8003;
  private baseUrl = 'https://localhost:8003/mfs100';
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 5;

  private constructor() {}

  static getInstance(): MFS100ServiceRecovery {
    if (!MFS100ServiceRecovery.instance) {
      MFS100ServiceRecovery.instance = new MFS100ServiceRecovery();
    }
    return MFS100ServiceRecovery.instance;
  }

  // Enhanced service health check
  private async checkServiceHealth(): Promise<boolean> {
    try {
      console.log('🔍 Checking MFS100 service health...');
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000); // Reduced timeout

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
      
      if (response.ok) {
        const data = await response.json();
        return data.ErrorCode === "0";
      }
      
      return false;

    } catch (error) {
      console.warn('Service health check failed:', error);
      return false;
    }
  }

  // Try alternative service ports
  private async tryAlternativePorts(): Promise<string | null> {
    console.log('🔍 Trying alternative ports for MFS100...');
    
    const altPorts = [8002, 8004, 11100, 11101];
    
    for (const port of altPorts) {
      try {
        const altUrl = `https://localhost:${port}/mfs100`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(`${altUrl}/info`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          const data = await response.json();
          if (data.ErrorCode === "0") {
            console.log(`✅ Service found on port ${port}`);
            return altUrl;
          }
        }
      } catch (error) {
        // Continue to next port
      }
    }
    
    return null;
  }

  // Wake up service with gentle pings
  private async wakeUpService(): Promise<boolean> {
    console.log('⏰ Attempting to wake up MFS100 service...');

    try {
      // Send gentle wake-up requests
      for (let i = 0; i < 3; i++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 1500);
          
          await fetch(`${this.baseUrl}/info?wake=${Date.now()}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'MFS100-WakeUp'
            }
          });
          
          clearTimeout(timeout);
          
          // Wait between attempts
          if (i < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          // Expected for wake-up calls
        }
      }

      // Wait for service to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if service is now responding
      return await this.checkServiceHealth();

    } catch (error) {
      console.error('Service wake up failed:', error);
      return false;
    }
  }

  // Clear browser cache more thoroughly
  private async clearServiceCache(): Promise<void> {
    console.log('🧹 Clearing service cache...');
    
    try {
      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name.includes('mfs100') || name.includes('localhost'))
            .map(name => caches.delete(name))
        );
      }

      // Clear relevant localStorage
      Object.keys(localStorage)
        .filter(key => key.includes('mfs100') || key.includes('fingerprint'))
        .forEach(key => localStorage.removeItem(key));

      // Clear relevant sessionStorage
      Object.keys(sessionStorage)
        .filter(key => key.includes('mfs100') || key.includes('fingerprint'))
        .forEach(key => sessionStorage.removeItem(key));

      console.log('✅ Cache cleared');

    } catch (error) {
      console.error('Cache clearing failed:', error);
    }
  }

  // Main recovery function with improved error handling
  async recoverService(): Promise<{ success: boolean; message: string; newBaseUrl?: string }> {
    if (this.isRecovering) {
      return { success: false, message: 'Recovery already in progress' };
    }

    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      return { 
        success: false, 
        message: 'Maximum recovery attempts reached. Please restart the MFS100 service manually.' 
      };
    }

    this.isRecovering = true;
    this.recoveryAttempts++;
    
    console.log(`🚀 Starting MFS100 recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

    try {
      // Step 1: Clear cache
      await this.clearServiceCache();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Quick health check
      if (await this.checkServiceHealth()) {
        console.log('✅ Service already healthy');
        this.recoveryAttempts = 0; // Reset on success
        return { 
          success: true, 
          message: 'Service is healthy',
          newBaseUrl: this.baseUrl
        };
      }

      // Step 3: Try to wake up service
      console.log('Step 1: Waking up service...');
      if (await this.wakeUpService()) {
        console.log('✅ Service recovered via wake-up');
        this.recoveryAttempts = 0; // Reset on success
        return { 
          success: true, 
          message: 'Service recovered successfully',
          newBaseUrl: this.baseUrl
        };
      }

      // Step 4: Try alternative ports
      console.log('Step 2: Trying alternative ports...');
      const alternativeUrl = await this.tryAlternativePorts();
      if (alternativeUrl) {
        this.baseUrl = alternativeUrl;
        console.log('✅ Service found on alternative port');
        this.recoveryAttempts = 0; // Reset on success
        return { 
          success: true, 
          message: 'Service found on alternative port',
          newBaseUrl: this.baseUrl
        };
      }

      // Step 5: Wait and final check
      console.log('Step 3: Final stabilization check...');
      await new Promise(resolve => setTimeout(resolve, this.recoveryDelay));
      
      if (await this.checkServiceHealth()) {
        console.log('✅ Service recovered after stabilization');
        this.recoveryAttempts = 0; // Reset on success
        return { 
          success: true, 
          message: 'Service recovered after waiting',
          newBaseUrl: this.baseUrl
        };
      }

      // Recovery failed
      return {
        success: false,
        message: `Recovery attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts} failed. Service may need manual restart.`
      };

    } catch (error) {
      console.error('Recovery process error:', error);
      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

    } finally {
      this.isRecovering = false;
      console.log('🏁 Recovery process completed');
    }
  }

  // Reset recovery attempts (call this when service is manually confirmed working)
  resetRecoveryAttempts(): void {
    this.recoveryAttempts = 0;
    console.log('✅ Recovery attempts reset');
  }

  // Get current service URL
  getServiceUrl(): string {
    return this.baseUrl;
  }

  // Check if recovery is in progress
  isRecoveryInProgress(): boolean {
    return this.isRecovering;
  }

  // Get recovery attempt count
  getRecoveryAttempts(): number {
    return this.recoveryAttempts;
  }
}

export const mfs100ServiceRecovery = MFS100ServiceRecovery.getInstance();
