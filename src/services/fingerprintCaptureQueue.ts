
/**
 * Centralized Fingerprint Capture Queue Manager
 * Ensures only one capture happens at a time across all fingers
 */

import { unifiedMFS100Manager } from './unifiedMFS100Manager';

interface CaptureRequest {
  id: string;
  fingerIndex: number;
  quality: number;
  timeout: number;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

class FingerprintCaptureQueue {
  private static instance: FingerprintCaptureQueue;
  private queue: CaptureRequest[] = [];
  private isProcessing = false;
  private currentCapture: CaptureRequest | null = null;

  private constructor() {}

  static getInstance(): FingerprintCaptureQueue {
    if (!FingerprintCaptureQueue.instance) {
      FingerprintCaptureQueue.instance = new FingerprintCaptureQueue();
    }
    return FingerprintCaptureQueue.instance;
  }

  // Add capture request to queue
  async captureFingerprint(
    fingerIndex: number, 
    quality: number = 60, 
    timeout: number = 15
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: CaptureRequest = {
        id: `finger_${fingerIndex}_${Date.now()}`,
        fingerIndex,
        quality,
        timeout,
        resolve,
        reject
      };

      console.log(`🔵 Queuing capture request for Finger ${fingerIndex + 1}`);
      this.queue.push(request);
      this.processQueue();
    });
  }

  // Process the capture queue
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.currentCapture = this.queue.shift()!;

    try {
      console.log(`🎯 Processing capture for Finger ${this.currentCapture.fingerIndex + 1}`);
      
      // Ensure device is connected before capture
      const connectionState = await unifiedMFS100Manager.checkConnection(true);
      if (!connectionState.isConnected) {
        throw new Error('Device not connected');
      }

      // Perform the actual capture
      const result = await unifiedMFS100Manager.captureFingerprint(
        this.currentCapture.quality,
        this.currentCapture.timeout
      );

      console.log(`✅ Capture completed for Finger ${this.currentCapture.fingerIndex + 1}`);
      this.currentCapture.resolve(result);

    } catch (error) {
      console.error(`❌ Capture failed for Finger ${this.currentCapture.fingerIndex + 1}:`, error);
      this.currentCapture.reject(error);
    } finally {
      this.currentCapture = null;
      this.isProcessing = false;
      
      // Process next item in queue after a short delay
      setTimeout(() => {
        this.processQueue();
      }, 500);
    }
  }

  // Get current capture status
  getCurrentCaptureInfo(): { fingerIndex: number | null; queueLength: number } {
    return {
      fingerIndex: this.currentCapture?.fingerIndex ?? null,
      queueLength: this.queue.length
    };
  }

  // Cancel all pending captures
  cancelAllCaptures() {
    console.log('🚫 Cancelling all pending captures');
    
    this.queue.forEach(request => {
      request.reject(new Error('Capture cancelled'));
    });
    
    this.queue = [];
    this.currentCapture = null;
    this.isProcessing = false;
  }

  // Check if a specific finger is in queue or being captured
  isFingerInQueue(fingerIndex: number): boolean {
    if (this.currentCapture?.fingerIndex === fingerIndex) {
      return true;
    }
    return this.queue.some(req => req.fingerIndex === fingerIndex);
  }
}

export const fingerprintCaptureQueue = FingerprintCaptureQueue.getInstance();
