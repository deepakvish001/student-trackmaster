import { useState, useEffect, useCallback } from 'react';

interface QualityTrend {
  date: string;
  average: number;
  samples: number;
  improvement: number;
}

interface DevicePerformance {
  deviceId: string;
  successRate: number;
  avgQuality: number;
  totalScans: number;
  errorRate: number;
  lastSeen: Date;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

interface SuccessRate {
  timeSlot: string;
  rate: number;
  attempts: number;
}

interface CaptureTiming {
  hour: number;
  avgTime: number;
  captureCount: number;
  peakTime: boolean;
}

interface UserMetric {
  userId: string;
  totalCaptures: number;
  successRate: number;
  avgQuality: number;
  lastActivity: Date;
}

interface SecurityMetric {
  date: string;
  threatsDetected: number;
  spoofingAttempts: number;
  anomalies: number;
  riskScore: number;
}

interface AnalyticsData {
  qualityTrends: QualityTrend[];
  devicePerformance: DevicePerformance[];
  successRates: SuccessRate[];
  captureTiming: CaptureTiming[];
  userMetrics: UserMetric[];
  securityMetrics: SecurityMetric[];
}

export function useBiometricAnalytics(timeRange: 'day' | 'week' | 'month' = 'week') {
  const [data, setData] = useState<AnalyticsData>({
    qualityTrends: [],
    devicePerformance: [],
    successRates: [],
    captureTiming: [],
    userMetrics: [],
    securityMetrics: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const generateMockData = useCallback((): AnalyticsData => {
    const now = new Date();
    const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
    
    // Generate quality trends
    const qualityTrends: QualityTrend[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      qualityTrends.push({
        date: date.toISOString().split('T')[0],
        average: Math.round(75 + Math.random() * 20),
        samples: Math.round(50 + Math.random() * 200),
        improvement: (Math.random() - 0.5) * 10
      });
    }

    // Generate device performance
    const devicePerformance: DevicePerformance[] = [
      'MFS100-001', 'MFS100-002', 'MFS100-003', 'MFS100-004', 'MFS100-005'
    ].map(deviceId => {
      const successRate = Math.round(85 + Math.random() * 15);
      const avgQuality = Math.round(80 + Math.random() * 15);
      const errorRate = Math.round((100 - successRate) * 0.8);
      
      let status: DevicePerformance['status'] = 'good';
      if (successRate >= 95 && avgQuality >= 90) status = 'excellent';
      else if (successRate < 85 || avgQuality < 80) status = 'fair';
      else if (successRate < 80 || avgQuality < 75) status = 'poor';
      
      return {
        deviceId,
        successRate,
        avgQuality,
        totalScans: Math.round(500 + Math.random() * 1000),
        errorRate,
        lastSeen: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
        status
      };
    });

    // Generate success rates by time slot
    const successRates: SuccessRate[] = [];
    for (let hour = 0; hour < 24; hour += 2) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      successRates.push({
        timeSlot,
        rate: Math.round(85 + Math.random() * 15),
        attempts: Math.round(10 + Math.random() * 100)
      });
    }

    // Generate capture timing
    const captureTiming: CaptureTiming[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const captureCount = Math.round(
        // Simulate business hours peak
        hour >= 8 && hour <= 17 ? 50 + Math.random() * 150 : 5 + Math.random() * 30
      );
      
      captureTiming.push({
        hour,
        avgTime: 2 + Math.random() * 2, // 2-4 seconds
        captureCount,
        peakTime: captureCount > 100
      });
    }

    // Generate user metrics
    const userMetrics: UserMetric[] = [];
    for (let i = 0; i < 20; i++) {
      userMetrics.push({
        userId: `user-${i.toString().padStart(3, '0')}`,
        totalCaptures: Math.round(10 + Math.random() * 100),
        successRate: Math.round(80 + Math.random() * 20),
        avgQuality: Math.round(75 + Math.random() * 20),
        lastActivity: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
    }

    // Generate security metrics
    const securityMetrics: SecurityMetric[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      securityMetrics.push({
        date: date.toISOString().split('T')[0],
        threatsDetected: Math.round(Math.random() * 5),
        spoofingAttempts: Math.round(Math.random() * 3),
        anomalies: Math.round(Math.random() * 8),
        riskScore: Math.round(Math.random() * 30 + 10) // 10-40 risk score
      });
    }

    return {
      qualityTrends,
      devicePerformance,
      successRates,
      captureTiming,
      userMetrics,
      securityMetrics
    };
  }, [timeRange]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newData = generateMockData();
      setData(newData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to refresh analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [generateMockData]);

  // Auto-refresh data when timeRange changes
  useEffect(() => {
    refreshData();
  }, [timeRange, refreshData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(refreshData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const getQualityDistribution = useCallback(() => {
    const { qualityTrends } = data;
    if (qualityTrends.length === 0) return { excellent: 0, good: 0, fair: 0, poor: 0 };
    
    const totalSamples = qualityTrends.reduce((acc, trend) => acc + trend.samples, 0);
    let excellent = 0, good = 0, fair = 0, poor = 0;
    
    qualityTrends.forEach(trend => {
      const weight = trend.samples / totalSamples;
      if (trend.average >= 90) excellent += weight;
      else if (trend.average >= 80) good += weight;
      else if (trend.average >= 70) fair += weight;
      else poor += weight;
    });
    
    return {
      excellent: Math.round(excellent * 100),
      good: Math.round(good * 100),
      fair: Math.round(fair * 100),
      poor: Math.round(poor * 100)
    };
  }, [data]);

  const getTopPerformingDevices = useCallback((limit: number = 5) => {
    return [...data.devicePerformance]
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }, [data.devicePerformance]);

  const getPeakUsageHours = useCallback(() => {
    return data.captureTiming
      .filter(timing => timing.peakTime)
      .sort((a, b) => b.captureCount - a.captureCount)
      .slice(0, 3);
  }, [data.captureTiming]);

  const getQualityTrend = useCallback() => {
    const { qualityTrends } = data;
    if (qualityTrends.length < 2) return { direction: 'stable', change: 0 };
    
    const recent = qualityTrends.slice(-3);
    const earlier = qualityTrends.slice(-6, -3);
    
    const recentAvg = recent.reduce((acc, trend) => acc + trend.average, 0) / recent.length;
    const earlierAvg = earlier.reduce((acc, trend) => acc + trend.average, 0) / earlier.length;
    
    const change = recentAvg - earlierAvg;
    
    return {
      direction: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
      change: Math.round(change * 10) / 10
    };
  }, [data.qualityTrends]);

  const exportAnalyticsReport = useCallback(() => {
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange,
      summary: {
        totalDevices: data.devicePerformance.length,
        avgSuccessRate: Math.round(
          data.devicePerformance.reduce((acc, device) => acc + device.successRate, 0) / 
          Math.max(1, data.devicePerformance.length)
        ),
        qualityDistribution: getQualityDistribution(),
        qualityTrend: getQualityTrend()
      },
      data
    };
    
    return report;
  }, [data, timeRange, getQualityDistribution, getQualityTrend]);

  return {
    // Data
    ...data,
    
    // State
    isLoading,
    lastUpdate,
    
    // Actions
    refreshData,
    
    // Computed values
    getQualityDistribution,
    getTopPerformingDevices,
    getPeakUsageHours,
    getQualityTrend,
    exportAnalyticsReport
  };
}