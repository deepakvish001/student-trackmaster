
/**
 * MFS100 Service Manager - Handles service startup and management
 */

export interface ServiceStartupResult {
  success: boolean;
  message: string;
  needsManualStart: boolean;
  instructions?: string[];
}

export interface ServiceHealthCheck {
  isRunning: boolean;
  port: number;
  message: string;
  canAutoStart: boolean;
}

class MFS100ServiceManager {
  private static instance: MFS100ServiceManager;
  private baseUrl = 'https://localhost:8003';
  private serviceCheckRetries = 0;
  private maxRetries = 3;

  private constructor() {}

  static getInstance(): MFS100ServiceManager {
    if (!MFS100ServiceManager.instance) {
      MFS100ServiceManager.instance = new MFS100ServiceManager();
    }
    return MFS100ServiceManager.instance;
  }

  // Check if MFS100 service is running
  async checkServiceHealth(): Promise<ServiceHealthCheck> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/mfs100/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeout);

      if (response.ok) {
        this.serviceCheckRetries = 0;
        return {
          isRunning: true,
          port: 8003,
          message: 'MFS100 service is running and healthy',
          canAutoStart: false
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      this.serviceCheckRetries++;
      
      return {
        isRunning: false,
        port: 8003,
        message: this.getServiceErrorMessage(error),
        canAutoStart: true
      };
    }
  }

  private getServiceErrorMessage(error: any): string {
    if (error?.name === 'AbortError') {
      return 'Service connection timeout';
    }
    
    if (error?.message?.includes('ERR_CONNECTION_REFUSED')) {
      return 'MFS100 service is not running';
    }
    
    if (error?.message?.includes('ERR_CERT')) {
      return 'SSL certificate issue with MFS100 service';
    }
    
    return 'Unable to connect to MFS100 service';
  }

  // Get service startup instructions
  getServiceStartupInstructions(): string[] {
    return [
      '🔧 How to start MFS100 Service:',
      '',
      '1. Navigate to your MFS100 installation folder (usually C:\\Program Files\\Mantra\\MFS100)',
      '2. Run "MFS100Test.exe" or "MFS100Service.exe" as Administrator',
      '3. The service should start on https://localhost:8003',
      '4. You can verify by visiting https://localhost:8003/mfs100/info in your browser',
      '',
      '💡 To auto-start on boot:',
      '• Add MFS100Service.exe to Windows Startup folder',
      '• Or create a Windows Service using sc.exe command',
      '',
      '🚨 Common Issues:',
      '• Antivirus blocking the service',
      '• Port 8003 already in use by another application',
      '• MFS100 device not connected via USB'
    ];
  }

  // Attempt to guide user through service startup
  async attemptServiceRecovery(): Promise<ServiceStartupResult> {
    console.log('🔄 Attempting MFS100 service recovery...');
    
    // First check current status
    const healthCheck = await this.checkServiceHealth();
    
    if (healthCheck.isRunning) {
      return {
        success: true,
        message: 'Service is already running',
        needsManualStart: false
      };
    }

    // Try a few more checks with delays
    for (let i = 1; i <= 3; i++) {
      console.log(`🔍 Service check attempt ${i}/3...`);
      
      await new Promise(resolve => setTimeout(resolve, 2000 * i)); // Progressive delay
      
      const check = await this.checkServiceHealth();
      if (check.isRunning) {
        return {
          success: true,
          message: `Service detected after ${i} attempts`,
          needsManualStart: false
        };
      }
    }

    // Service needs manual start
    return {
      success: false,
      message: 'MFS100 service needs to be started manually',
      needsManualStart: true,
      instructions: this.getServiceStartupInstructions()
    };
  }

  // Check if we can try to auto-detect common MFS100 paths
  getCommonServicePaths(): string[] {
    return [
      'C:\\Program Files\\Mantra\\MFS100\\MFS100Test.exe',
      'C:\\Program Files (x86)\\Mantra\\MFS100\\MFS100Test.exe',
      'C:\\MFS100\\MFS100Test.exe',
      'C:\\Mantra\\MFS100\\MFS100Test.exe'
    ];
  }

  // Reset retry counter
  resetRetries(): void {
    this.serviceCheckRetries = 0;
  }

  // Get retry count
  getRetryCount(): number {
    return this.serviceCheckRetries;
  }
}

export const mfs100ServiceManager = MFS100ServiceManager.getInstance();
