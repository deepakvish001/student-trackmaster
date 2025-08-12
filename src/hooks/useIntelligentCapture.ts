import { useState, useCallback, useRef } from 'react';

interface CaptureGuidance {
  instruction: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'rotate';
  confidence: number;
  successProbability: number;
  fingerDetected: boolean;
  positioning: 'perfect' | 'good' | 'needs_adjustment' | 'poor';
}

interface FrameAnalysis {
  fingerPresent: boolean;
  fingerArea: number;
  centeredness: number;
  orientation: number;
  quality: number;
  timestamp: number;
}

export function useIntelligentCapture() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentGuidance, setCurrentGuidance] = useState<CaptureGuidance | null>(null);
  const frameHistoryRef = useRef<FrameAnalysis[]>([]);

  const analyzeFrame = useCallback(async (imageData: string): Promise<CaptureGuidance | null> => {
    try {
      // Simulate AI frame analysis
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Mock computer vision analysis
      const hasFingerprint = imageData.length > 30000 && Math.random() > 0.3;
      const fingerArea = hasFingerprint ? Math.random() * 0.6 + 0.3 : 0;
      const centeredness = hasFingerprint ? Math.random() * 0.8 + 0.2 : 0;
      const orientation = Math.random() * 360;
      const quality = hasFingerprint ? Math.random() * 40 + 40 : 20;
      
      const analysis: FrameAnalysis = {
        fingerPresent: hasFingerprint,
        fingerArea,
        centeredness,
        orientation,
        quality,
        timestamp: Date.now()
      };
      
      // Add to history (keep last 10 frames)
      frameHistoryRef.current.push(analysis);
      if (frameHistoryRef.current.length > 10) {
        frameHistoryRef.current.shift();
      }
      
      // Generate guidance based on analysis
      const guidance = generateGuidance(analysis, frameHistoryRef.current);
      setCurrentGuidance(guidance);
      
      return guidance;
    } catch (error) {
      console.error('Frame analysis failed:', error);
      return null;
    }
  }, []);

  const generateGuidance = (
    current: FrameAnalysis, 
    history: FrameAnalysis[]
  ): CaptureGuidance => {
    if (!current.fingerPresent) {
      return {
        instruction: "Place your finger on the scanner",
        confidence: 0.9,
        successProbability: 0,
        fingerDetected: false,
        positioning: 'poor'
      };
    }

    // Analyze positioning
    let instruction = "";
    let direction: CaptureGuidance['direction'] = undefined;
    let positioning: CaptureGuidance['positioning'] = 'good';
    
    if (current.centeredness < 0.4) {
      if (Math.random() > 0.5) {
        instruction = "Move finger towards center";
        direction = Math.random() > 0.5 ? 'left' : 'right';
      } else {
        instruction = "Adjust finger position";
        direction = Math.random() > 0.5 ? 'up' : 'down';
      }
      positioning = 'needs_adjustment';
    } else if (current.fingerArea < 0.4) {
      instruction = "Press finger down firmly";
      positioning = 'needs_adjustment';
    } else if (current.orientation % 90 > 30 && current.orientation % 90 < 60) {
      instruction = "Rotate finger slightly";
      direction = 'rotate';
      positioning = 'needs_adjustment';
    } else if (current.quality < 60) {
      instruction = "Hold finger steady";
      positioning = 'needs_adjustment';
    } else if (current.centeredness > 0.8 && current.fingerArea > 0.6 && current.quality > 80) {
      instruction = "Perfect positioning - ready to capture!";
      positioning = 'perfect';
    } else {
      instruction = "Good positioning";
      positioning = 'good';
    }
    
    // Calculate success probability based on multiple factors
    const successProbability = Math.min(100, 
      (current.centeredness * 30) + 
      (current.fingerArea * 25) + 
      (current.quality * 0.4) + 
      (positioning === 'perfect' ? 15 : positioning === 'good' ? 10 : 0)
    );
    
    // Calculate confidence based on frame stability
    const recentFrames = history.slice(-5);
    const stability = recentFrames.length > 3 ? 
      recentFrames.reduce((acc, frame) => acc + frame.quality, 0) / recentFrames.length / 100 : 0.5;
    
    return {
      instruction,
      direction,
      confidence: Math.min(0.95, stability + 0.2),
      successProbability: Math.round(successProbability),
      fingerDetected: true,
      positioning
    };
  };

  const predictCaptureSuccess = useCallback(async (imageData: string): Promise<number> => {
    // Simulate AI prediction
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const recentFrames = frameHistoryRef.current.slice(-3);
    if (recentFrames.length === 0) return 0;
    
    const avgQuality = recentFrames.reduce((acc, frame) => acc + frame.quality, 0) / recentFrames.length;
    const avgCenteredness = recentFrames.reduce((acc, frame) => acc + frame.centeredness, 0) / recentFrames.length;
    const avgFingerArea = recentFrames.reduce((acc, frame) => acc + frame.fingerArea, 0) / recentFrames.length;
    
    // Weight different factors
    const score = (avgQuality * 0.4) + (avgCenteredness * 100 * 0.3) + (avgFingerArea * 100 * 0.3);
    
    return Math.min(100, Math.max(0, Math.round(score)));
  }, []);

  const getOptimalTiming = useCallback((): { shouldCapture: boolean; confidence: number } => {
    const recentFrames = frameHistoryRef.current.slice(-5);
    
    if (recentFrames.length < 3) {
      return { shouldCapture: false, confidence: 0 };
    }
    
    // Check for stability in recent frames
    const qualityStability = recentFrames.every(frame => frame.quality > 70);
    const positionStability = recentFrames.every(frame => frame.centeredness > 0.6);
    const avgQuality = recentFrames.reduce((acc, frame) => acc + frame.quality, 0) / recentFrames.length;
    
    const shouldCapture = qualityStability && positionStability && avgQuality > 75;
    const confidence = shouldCapture ? Math.min(0.95, avgQuality / 100 + 0.2) : 0.3;
    
    return { shouldCapture, confidence };
  }, []);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    frameHistoryRef.current = [];
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    setCurrentGuidance(null);
    frameHistoryRef.current = [];
  }, []);

  const getFrameHistory = useCallback(() => {
    return [...frameHistoryRef.current];
  }, []);

  const getCaptureReadiness = useCallback(() => {
    if (!currentGuidance) return 0;
    
    const factors = [
      currentGuidance.fingerDetected ? 25 : 0,
      currentGuidance.positioning === 'perfect' ? 30 : 
      currentGuidance.positioning === 'good' ? 20 : 
      currentGuidance.positioning === 'needs_adjustment' ? 10 : 0,
      currentGuidance.successProbability * 0.45
    ];
    
    return Math.round(factors.reduce((acc, val) => acc + val, 0));
  }, [currentGuidance]);

  return {
    // State
    isMonitoring,
    currentGuidance,
    
    // Core functions
    analyzeFrame,
    predictCaptureSuccess,
    getOptimalTiming,
    
    // Control functions
    startMonitoring,
    stopMonitoring,
    
    // Utility functions
    getFrameHistory,
    getCaptureReadiness
  };
}
