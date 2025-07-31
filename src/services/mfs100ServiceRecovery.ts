
/**
 * MFS100 Service Recovery System
 * Handles service failures and implements recovery strategies to avoid computer restarts
 */

interface ServiceRecoveryState {
  isRecovering: boolean;
  lastRecoveryAttempt: number;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
}

interface RecoveryAttempt {
  type: 'wake' | 'alternate-port' | 'cache-clear' | 'full-reset';
  description: string;
  timeout: number;
}

class MFS100ServiceRecovery {
  private state: ServiceRecoveryState = {
    isRecovering: false,
    lastRecoveryAttempt: 0,
    recoveryAttempts: 0,
    maxRecoveryAttempts: 5
  };

  private recoveryStrategies: RecoveryAttempt[] = [
    {
      type: 'wake',
      description: 'Waking up MFS100 service',
      timeout: 3000
    },
    {
      type: 'alternate-port',
      description: 'Trying alternate ports',
      timeout: 5000
    },
    {
      type: 'cache-clear',
      description: 'Clearing service cache',
      timeout: 2000
    },
    {
      type: 'full-reset',
      description: 'Performing full service reset',
      timeout: 8000
    }
  ];

  private alternativePorts = [8003, 11100, 9000, 8080];
  private baseUrls = [
    'https://localhost',
    'http://localhost',
    'https://127.0.0.1',
    'http://127.0.0.1'
  ];

  async attemptRecovery(onProgress?: (message: string) => void): Promise<{
    success: boolean;
    workingUrl?: string;
    message: string;
  }> {
    if (this.state.isRecovering) {
      return {
        success: false,
        message: 'Recovery already in progress'
      };
    }

    if (this.state.recoveryAttempts >= this.state.maxRecoveryAttempts) {
      const timeSinceLastAttempt = Date.now() - this.state.lastRecoveryAttempt;
      if (timeSinceLastAttempt < 60000) { // 1 minute cooldown
        return {
          success: false,
          message: 'Recovery cooldown active, please wait'
        };
      }
      // Reset after cooldown
      this.state.recoveryAttempts = 0;
    }

    this.state.isRecovering = true;
    this.state.lastRecoveryAttempt = Date.now();
    this.state.recoveryAttempts++;

    console.log('🔄 Starting MFS100 service recovery...');
    onProgress?.('Starting MFS100 service recovery...');

    try {
      // Strategy 1: Try to wake up the service
      onProgress?.('Attempting to wake up MFS100 service...');
      const wakeResult = await this.wakeUpService();
      if (wakeResult.success) {
        this.resetRecoveryState();
        return wakeResult;
      }

      // Strategy 2: Try alternate ports and protocols
      onProgress?.('Scanning for MFS100 service on alternate ports...');
      const portScanResult = await this.scanAlternatePorts();
      if (portScanResult.success) {
        this.resetRecoveryState();
        return portScanResult;
      }

      // Strategy 3: Clear any cached connections
      onProgress?.('Clearing service cache and connections...');
      await this.clearServiceCache();

      // Strategy 4: Try a comprehensive service restart approach
      onProgress?.('Attempting comprehensive service restart...');
      const restartResult = await this.attemptServiceRestart();
      if (restartResult.success) {
        this.resetRecoveryState();
        return restartResult;
      }

      return {
        success: false,
        message: `Recovery failed after ${this.state.recoveryAttempts} attempts. Service may need manual restart.`
      };

    } catch (error) {
      console.error('❌ Recovery process failed:', error);
      return {
        success: false,
        message: `Recovery error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      this.state.isRecovering = false;
    }
  }

  private async wakeUpService(): Promise<{ success: boolean; workingUrl?: string; message: string }> {
    console.log('📡 Attempting to wake up MFS100 service...');
    
    // Try multiple wake-up requests with different approaches
    const wakeUpUrls = [
      'https://localhost:8003/mfs100/info',
      'https://localhost:8003/mfs100/device',
      'http://localhost:8003/mfs100/info',
      'https://127.0.0.1:8003/mfs100/info'
    ];

    for (const url of wakeUpUrls) {
      try {
        console.log(`🔍 Trying to wake service at: ${url}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          if (data.ErrorCode === "0" || data.DeviceInfo) {
            console.log('✅ Service wake-up successful!');
            return {
              success: true,
              workingUrl: url,
              message: 'MFS100 service successfully awakened'
            };
          }
        }
      } catch (error) {
        console.log(`⚠️ Wake attempt failed for ${url}:`, error);
        continue;
      }

      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      success: false,
      message: 'Service wake-up failed'
    };
  }

  private async scanAlternatePorts(): Promise<{ success: boolean; workingUrl?: string; message: string }> {
    console.log('🔍 Scanning alternate ports for MFS100 service...');

    for (const baseUrl of this.baseUrls) {
      for (const port of this.alternativePorts) {
        const testUrl = `${baseUrl}:${port}/mfs100/info`;
        
        try {
          console.log(`🔍 Testing: ${testUrl}`);
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(testUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          clearTimeout(timeout);

          if (response.ok) {
            const data = await response.json();
            if (data.ErrorCode === "0" || data.DeviceInfo) {
              console.log(`✅ Found working service at: ${testUrl}`);
              return {
                success: true,
                workingUrl: testUrl,
                message: `MFS100 service found on alternate port: ${port}`
              };
            }
          }
        } catch (error) {
          // Continue to next port
          continue;
        }

        // Small delay between port scans
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return {
      success: false,
      message: 'No working service found on alternate ports'
    };
  }

  private async clearServiceCache(): Promise<void> {
    console.log('🗑️ Clearing MFS100 service cache...');
    
    try {
      // Clear any cached fetch requests
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.includes('mfs100') || cacheName.includes('localhost:8003')) {
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      }

      // Clear localStorage entries related to MFS100
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('mfs100') || key.includes('fingerprint'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log('✅ Service cache cleared');
    } catch (error) {
      console.warn('⚠️ Cache clearing partially failed:', error);
    }
  }

  private async attemptServiceRestart(): Promise<{ success: boolean; workingUrl?: string; message: string }> {
    console.log('🔄 Attempting comprehensive service restart...');

    // Try to trigger service restart through various endpoints
    const restartEndpoints = [
      '/mfs100/restart',
      '/mfs100/reset',
      '/restart',
      '/reset'
    ];

    for (const baseUrl of this.baseUrls.slice(0, 2)) { // Limit to HTTPS and HTTP localhost
      for (const port of [8003, 11100]) {
        for (const endpoint of restartEndpoints) {
          try {
            const restartUrl = `${baseUrl}:${port}${endpoint}`;
            console.log(`🔄 Attempting restart via: ${restartUrl}`);

            await fetch(restartUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'restart' })
            }).catch(() => {}); // Ignore errors, this is a best-effort attempt

            // Wait for potential restart
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Test if service is now available
            const testResult = await this.testServiceAvailability(`${baseUrl}:${port}`);
            if (testResult.success) {
              return testResult;
            }
          } catch (error) {
            continue;
          }
        }
      }
    }

    return {
      success: false,
      message: 'Service restart attempts failed'
    };
  }

  private async testServiceAvailability(baseUrl: string): Promise<{ success: boolean; workingUrl?: string; message: string }> {
    try {
      const testUrl = `${baseUrl}/mfs100/info`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ErrorCode === "0" || data.DeviceInfo) {
          return {
            success: true,
            workingUrl: testUrl,
            message: 'Service is now available'
          };
        }
      }
    } catch (error) {
      // Service not available
    }

    return {
      success: false,
      message: 'Service still not available'
    };
  }

  private resetRecoveryState(): void {
    this.state.recoveryAttempts = 0;
    this.state.lastRecoveryAttempt = 0;
    console.log('✅ Recovery state reset - service is operational');
  }

  getRecoveryState(): ServiceRecoveryState {
    return { ...this.state };
  }

  isRecovering(): boolean {
    return this.state.isRecovering;
  }

  canAttemptRecovery(): boolean {
    if (this.state.recoveryAttempts >= this.state.maxRecoveryAttempts) {
      const timeSinceLastAttempt = Date.now() - this.state.lastRecoveryAttempt;
      return timeSinceLastAttempt >= 60000; // 1 minute cooldown
    }
    return !this.state.isRecovering;
  }
}

// Export singleton instance
export const mfs100ServiceRecovery = new MFS100ServiceRecovery();
export type { ServiceRecoveryState };
