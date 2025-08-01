
/**
 * Enhanced MFS100 Service Recovery System
 * Handles permanent service failures and implements aggressive recovery strategies
 */

interface EnhancedRecoveryState {
  isRecovering: boolean;
  lastRecoveryAttempt: number;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  serviceRestartAttempts: number;
}

interface RecoveryStrategy {
  name: string;
  description: string;
  timeout: number;
  execute: () => Promise<boolean>;
}

class EnhancedMFS100Recovery {
  private state: EnhancedRecoveryState = {
    isRecovering: false,
    lastRecoveryAttempt: 0,
    recoveryAttempts: 0,
    maxRecoveryAttempts: 10,
    serviceRestartAttempts: 0
  };

  private alternativePorts = [8003, 11100, 9000, 8080, 8005, 8006];
  private baseUrls = [
    'https://localhost',
    'http://localhost',
    'https://127.0.0.1',
    'http://127.0.0.1'
  ];

  async attemptFullRecovery(onProgress?: (message: string) => void): Promise<{
    success: boolean;
    workingUrl?: string;
    message: string;
  }> {
    if (this.state.isRecovering) {
      return { success: false, message: 'Recovery already in progress' };
    }

    this.state.isRecovering = true;
    this.state.lastRecoveryAttempt = Date.now();
    this.state.recoveryAttempts++;

    console.log('🔄 Starting enhanced MFS100 service recovery...');
    onProgress?.('Starting enhanced MFS100 service recovery...');

    try {
      // Strategy 1: Quick service wake-up
      onProgress?.('Attempting to wake up MFS100 service...');
      const wakeResult = await this.wakeUpService();
      if (wakeResult.success) {
        this.resetRecoveryState();
        return wakeResult;
      }

      // Strategy 2: Scan all possible ports and protocols
      onProgress?.('Scanning all available ports for MFS100 service...');
      const portScanResult = await this.comprehensivePortScan();
      if (portScanResult.success) {
        this.resetRecoveryState();
        return portScanResult;
      }

      // Strategy 3: Force service restart through multiple methods
      onProgress?.('Attempting to restart MFS100 service...');
      const restartResult = await this.forceServiceRestart();
      if (restartResult.success) {
        this.resetRecoveryState();
        return restartResult;
      }

      // Strategy 4: Nuclear option - try to trigger service installation/repair
      onProgress?.('Attempting service repair and restart...');
      const repairResult = await this.attemptServiceRepair();
      if (repairResult.success) {
        this.resetRecoveryState();
        return repairResult;
      }

      return {
        success: false,
        message: `Enhanced recovery failed after ${this.state.recoveryAttempts} attempts. Service may need manual restart or reinstallation.`
      };

    } catch (error) {
      console.error('❌ Enhanced recovery process failed:', error);
      return {
        success: false,
        message: `Recovery error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      setTimeout(() => {
        this.state.isRecovering = false;
      }, 3000);
    }
  }

  private async wakeUpService(): Promise<{ success: boolean; workingUrl?: string; message: string }> {
    console.log('📡 Attempting aggressive service wake-up...');
    
    const wakeUpEndpoints = [
      '/mfs100/info',
      '/mfs100/device',
      '/info',
      '/device',
      '/status',
      '/ping'
    ];

    for (const baseUrl of this.baseUrls) {
      for (const port of this.alternativePorts) {
        for (const endpoint of wakeUpEndpoints) {
          try {
            const testUrl = `${baseUrl}:${port}${endpoint}`;
            console.log(`🔍 Testing: ${testUrl}`);
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(testUrl, {
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
              if (data.ErrorCode === "0" || data.DeviceInfo || data.status === 'ok') {
                console.log('✅ Service wake-up successful!');
                return {
                  success: true,
                  workingUrl: `${baseUrl}:${port}/mfs100`,
                  message: 'MFS100 service successfully awakened'
                };
              }
            }
          } catch (error) {
            continue;
          }
        }
      }
    }

    return { success: false, message: 'Service wake-up failed' };
  }

  private async comprehensivePortScan(): Promise<{ success: boolean; workingUrl?: string; message: string }> {
    console.log('🔍 Performing comprehensive port scan...');

    // Extended port list for comprehensive scan
    const extendedPorts = [8003, 11100, 9000, 8080, 8005, 8006, 8001, 8002, 8004, 9001, 9002];

    for (const baseUrl of this.baseUrls) {
      for (const port of extendedPorts) {
        try {
          const testUrl = `${baseUrl}:${port}/mfs100/info`;
          
          console.log(`🔍 Scanning: ${testUrl}`);
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 1500);

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
                workingUrl: `${baseUrl}:${port}/mfs100`,
                message: `MFS100 service found on port: ${port}`
              };
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    return { success: false, message: 'No working service found' };
  }

  private async forceServiceRestart(): Promise<{ success: boolean; workingUrl?: string; message: string }> {
    console.log('🔄 Attempting forced service restart...');
    
    this.state.serviceRestartAttempts++;

    // Try multiple restart approaches
    const restartMethods = [
      { method: 'POST', endpoint: '/restart', body: JSON.stringify({ action: 'restart' }) },
      { method: 'POST', endpoint: '/mfs100/restart', body: JSON.stringify({ action: 'restart' }) },
      { method: 'GET', endpoint: '/restart', body: null },
      { method: 'POST', endpoint: '/reset', body: JSON.stringify({ action: 'reset' }) },
      { method: 'POST', endpoint: '/mfs100/reset', body: JSON.stringify({ action: 'reset' }) }
    ];

    for (const baseUrl of ['https://localhost', 'http://localhost']) {
      for (const port of [8003, 11100]) {
        for (const restartMethod of restartMethods) {
          try {
            const restartUrl = `${baseUrl}:${port}${restartMethod.endpoint}`;
            console.log(`🔄 Trying restart: ${restartUrl}`);

            const options: RequestInit = {
              method: restartMethod.method,
              headers: { 'Content-Type': 'application/json' }
            };

            if (restartMethod.body) {
              options.body = restartMethod.body;
            }

            await fetch(restartUrl, options).catch(() => {}); // Ignore errors

            // Wait for potential restart
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Test if service is now available
            const testResult = await this.testServiceAvailability(`${baseUrl}:${port}`);
            if (testResult.success) {
              console.log('✅ Service restart successful!');
              return testResult;
            }
          } catch (error) {
            continue;
          }
        }
      }
    }

    return { success: false, message: 'Service restart failed' };
  }

  private async attemptServiceRepair(): Promise<{ success: boolean; workingUrl?: string; message: string }> {
    console.log('🔧 Attempting service repair...');

    // Clear all caches and storage
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear localStorage
      localStorage.clear();

      // Clear sessionStorage
      sessionStorage.clear();

      console.log('✅ All caches and storage cleared');
    } catch (error) {
      console.warn('⚠️ Cache clearing failed:', error);
    }

    // Try to trigger service auto-start by hitting multiple endpoints
    const autoStartEndpoints = [
      'https://localhost:8003/autostart',
      'http://localhost:8003/autostart',
      'https://localhost:11100/autostart',
      'http://localhost:11100/autostart'
    ];

    for (const url of autoStartEndpoints) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' })
        }).catch(() => {});

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        continue;
      }
    }

    // Final test
    await new Promise(resolve => setTimeout(resolve, 5000));
    const finalTest = await this.comprehensivePortScan();
    
    return finalTest.success ? 
      { ...finalTest, message: 'Service repair and restart successful' } :
      { success: false, message: 'Service repair failed - manual restart may be required' };
  }

  private async testServiceAvailability(baseUrl: string): Promise<{ success: boolean; workingUrl?: string; message: string }> {
    try {
      const testUrl = `${baseUrl}/mfs100/info`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (data.ErrorCode === "0" || data.DeviceInfo) {
          return {
            success: true,
            workingUrl: `${baseUrl}/mfs100`,
            message: 'Service is now available'
          };
        }
      }
    } catch (error) {
      // Service not available
    }

    return { success: false, message: 'Service still not available' };
  }

  private resetRecoveryState(): void {
    this.state.recoveryAttempts = 0;
    this.state.lastRecoveryAttempt = 0;
    this.state.serviceRestartAttempts = 0;
    console.log('✅ Enhanced recovery state reset - service is operational');
  }

  canAttemptRecovery(): boolean {
    if (this.state.recoveryAttempts >= this.state.maxRecoveryAttempts) {
      const timeSinceLastAttempt = Date.now() - this.state.lastRecoveryAttempt;
      return timeSinceLastAttempt >= 30000; // 30 second cooldown
    }
    return !this.state.isRecovering;
  }

  getRecoveryState(): EnhancedRecoveryState {
    return { ...this.state };
  }
}

export const enhancedMFS100Recovery = new EnhancedMFS100Recovery();
