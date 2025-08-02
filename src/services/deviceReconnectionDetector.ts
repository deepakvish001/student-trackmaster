
/**
 * Smart Device Reconnection Detector
 * Detects when MFS100 device reconnects without constant polling
 */

import { rdServiceClient } from './rdServiceClient';

type ReconnectionCallback = (isConnected: boolean) => void;

class DeviceReconnectionDetector {
  private static instance: DeviceReconnectionDetector;
  private callbacks = new Set<ReconnectionCallback>();
  private isDetecting = false;
  private lastKnownState = false;
  private detectionInterval: NodeJS.Timeout | null = null;
  private smartCheckInterval = 30000; // 30 seconds - much less frequent
  private fastCheckInterval = 5000; // 5 seconds when trying to reconnect
  private isInFastMode = false;

  static getInstance(): DeviceReconnectionDetector {
    if (!DeviceReconnectionDetector.instance) {
      DeviceReconnectionDetector.instance = new DeviceReconnectionDetector();
    }
    return DeviceReconnectionDetector.instance;
  }

  private constructor() {
    console.log('🔍 Device Reconnection Detector initialized');
  }

  /**
   * Start smart device detection
   */
  startDetection(): void {
    if (this.isDetecting) return;

    this.isDetecting = true;
    this.scheduleNextCheck();
    console.log('🔍 Started smart device reconnection detection');
  }

  /**
   * Stop device detection
   */
  stopDetection(): void {
    if (!this.isDetecting) return;

    this.isDetecting = false;
    if (this.detectionInterval) {
      clearTimeout(this.detectionInterval);
      this.detectionInterval = null;
    }
    console.log('🔍 Stopped device reconnection detection');
  }

  /**
   * Subscribe to device state changes
   */
  subscribe(callback: ReconnectionCallback): () => void {
    this.callbacks.add(callback);
    
    // Start detection if this is the first subscriber
    if (this.callbacks.size === 1) {
      this.startDetection();
    }

    return () => {
      this.callbacks.delete(callback);
      // Stop detection if no more subscribers
      if (this.callbacks.size === 0) {
        this.stopDetection();
      }
    };
  }

  /**
   * Manually trigger a device check
   */
  async triggerCheck(): Promise<boolean> {
    const isConnected = await this.checkDevice();
    
    // Switch to fast mode if device was disconnected but might be reconnecting
    if (!isConnected && this.lastKnownState) {
      this.switchToFastMode();
    }
    
    return isConnected;
  }

  /**
   * Switch to fast reconnection detection mode
   */
  private switchToFastMode(): void {
    if (this.isInFastMode) return;

    this.isInFastMode = true;
    console.log('🔍 Switching to fast reconnection mode');
    
    // Cancel current timer and restart with fast interval
    if (this.detectionInterval) {
      clearTimeout(this.detectionInterval);
    }
    this.scheduleNextCheck();
    
    // Switch back to slow mode after 2 minutes
    setTimeout(() => {
      if (this.isInFastMode) {
        this.isInFastMode = false;
        console.log('🔍 Switching back to normal detection mode');
      }
    }, 120000);
  }

  /**
   * Schedule the next device check
   */
  private scheduleNextCheck(): void {
    if (!this.isDetecting) return;

    const interval = this.isInFastMode ? this.fastCheckInterval : this.smartCheckInterval;
    
    this.detectionInterval = setTimeout(async () => {
      await this.checkDevice();
      this.scheduleNextCheck();
    }, interval);
  }

  /**
   * Check if device is connected
   */
  private async checkDevice(): Promise<boolean> {
    try {
      const isConnected = await rdServiceClient.isServiceAvailable();
      
      // Only notify if state changed
      if (isConnected !== this.lastKnownState) {
        this.lastKnownState = isConnected;
        
        if (isConnected) {
          console.log('✅ Device reconnected detected!');
          // Switch back to slow mode when device reconnects
          this.isInFastMode = false;
        } else {
          console.log('❌ Device disconnection detected');
          // Switch to fast mode to detect reconnection quickly
          this.switchToFastMode();
        }
        
        // Notify all subscribers
        this.callbacks.forEach(callback => {
          try {
            callback(isConnected);
          } catch (error) {
            console.error('Error in reconnection callback:', error);
          }
        });
      }
      
      return isConnected;
    } catch (error) {
      // Don't log errors to avoid spam - just return false
      if (this.lastKnownState !== false) {
        this.lastKnownState = false;
        this.callbacks.forEach(callback => callback(false));
      }
      return false;
    }
  }

  /**
   * Get the last known connection state
   */
  getLastKnownState(): boolean {
    return this.lastKnownState;
  }
}

export const deviceReconnectionDetector = DeviceReconnectionDetector.getInstance();
