
/**
 * MFS100 Session Manager
 * Handles device session lifecycle and automatic recovery
 */

export interface SessionStatus {
  isActive: boolean;
  deviceConnected: boolean;
  lastActivity: Date;
  captureCount: number;
  errors: string[];
}

export class MFS100SessionManager {
  private sessionStatus: SessionStatus = {
    isActive: false,
    deviceConnected: false,
    lastActivity: new Date(),
    captureCount: 0,
    errors: []
  };

  private maxCapturesPerSession = 10;
  private sessionTimeout = 300000; // 5 minutes
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor() {
    this.startSessionMonitoring();
  }

  private startSessionMonitoring() {
    setInterval(() => {
      this.checkSessionHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkSessionHealth() {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - this.sessionStatus.lastActivity.getTime();

    // Check if session has timed out
    if (timeSinceLastActivity > this.sessionTimeout) {
      console.log('Session timed out, refreshing...');
      await this.refreshSession();
    }

    // Check if we've exceeded max captures per session
    if (this.sessionStatus.captureCount >= this.maxCapturesPerSession) {
      console.log('Max captures reached, refreshing session...');
      await this.refreshSession();
    }
  }

  async initializeSession(): Promise<boolean> {
    try {
      console.log('Initializing MFS100 session...');
      
      // Check if MFS100 service is available
      const response = await fetch('https://localhost:8003/mfs100/info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ErrorCode === "0") {
        this.sessionStatus = {
          isActive: true,
          deviceConnected: true,
          lastActivity: new Date(),
          captureCount: 0,
          errors: []
        };
        
        this.reconnectAttempts = 0;
        console.log('✅ MFS100 session initialized successfully');
        return true;
      } else {
        throw new Error(data.ErrorDescription || 'Device initialization failed');
      }
    } catch (error) {
      console.error('Failed to initialize MFS100 session:', error);
      this.sessionStatus.isActive = false;
      this.sessionStatus.deviceConnected = false;
      this.sessionStatus.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  async refreshSession(): Promise<boolean> {
    console.log('Refreshing MFS100 session...');
    this.sessionStatus.isActive = false;
    this.sessionStatus.captureCount = 0;
    
    // Wait a bit before reinitializing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return await this.initializeSession();
  }

  async captureWithSession(quality: number = 60, timeout: number = 15): Promise<any> {
    // Check if session is healthy before capture
    if (!this.sessionStatus.isActive || !this.sessionStatus.deviceConnected) {
      console.log('Session not active, attempting to initialize...');
      const initialized = await this.initializeSession();
      if (!initialized) {
        throw new Error('Failed to initialize device session');
      }
    }

    try {
      const response = await fetch('https://localhost:8003/mfs100/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Quality: quality,
          TimeOut: timeout
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update session status
      this.sessionStatus.lastActivity = new Date();
      this.sessionStatus.captureCount++;
      
      if (data.ErrorCode === "0") {
        console.log(`✅ Capture successful (${this.sessionStatus.captureCount}/${this.maxCapturesPerSession})`);
        return {
          httpStaus: true,
          data: data
        };
      } else {
        throw new Error(data.ErrorDescription || 'Capture failed');
      }
    } catch (error) {
      console.error('Capture failed:', error);
      
      // If capture fails, try to recover session
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Attempting session recovery (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        await this.refreshSession();
        
        // Retry capture once after session refresh
        if (this.sessionStatus.isActive) {
          return await this.captureWithSession(quality, timeout);
        }
      }
      
      throw error;
    }
  }

  getSessionStatus(): SessionStatus {
    return { ...this.sessionStatus };
  }

  async forceReconnect(): Promise<boolean> {
    console.log('Force reconnecting MFS100...');
    this.reconnectAttempts = 0;
    return await this.refreshSession();
  }
}

// Export singleton instance
export const mfs100SessionManager = new MFS100SessionManager();
