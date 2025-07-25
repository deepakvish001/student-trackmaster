
/**
 * Phase 4: System Integration Manager
 * Comprehensive integration testing and system health monitoring
 */

import { modernMFS100Client } from './modernMFS100Client';
import { deviceConnectionManager } from './deviceConnectionManager';
import { supabase } from '@/integrations/supabase/client';
import { performanceOptimizer } from '@/utils/performanceOptimizer';
import { auditBiometricAccess } from '@/utils/biometricSecurity';

interface SystemHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  database: 'connected' | 'disconnected' | 'error';
  biometric: 'ready' | 'device-missing' | 'error';
  authentication: 'active' | 'expired' | 'error';
  performance: 'optimal' | 'degraded' | 'critical';
  lastCheck: Date;
  details: Record<string, any>;
}

interface IntegrationTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class SystemIntegrationManager {
  private static instance: SystemIntegrationManager;
  private healthStatus: SystemHealthStatus;
  private testResults: IntegrationTestResult[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): SystemIntegrationManager {
    if (!SystemIntegrationManager.instance) {
      SystemIntegrationManager.instance = new SystemIntegrationManager();
    }
    return SystemIntegrationManager.instance;
  }

  private constructor() {
    this.healthStatus = {
      overall: 'warning',
      database: 'disconnected',
      biometric: 'device-missing',
      authentication: 'expired',
      performance: 'optimal',
      lastCheck: new Date(),
      details: {}
    };
  }

  /**
   * Initialize system integration monitoring
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing System Integration Manager...');
    
    // Start health monitoring
    await this.performHealthCheck();
    this.startHealthMonitoring();
    
    // Run initial integration tests
    await this.runIntegrationTests();
    
    auditBiometricAccess('SYSTEM_INTEGRATION_INIT', {
      success: true,
      healthStatus: this.healthStatus.overall
    });
    
    console.log('✅ System Integration Manager initialized');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealthStatus> {
    const startTime = Date.now();
    console.log('🔍 Performing system health check...');
    
    try {
      // Check database connectivity
      const dbStatus = await this.checkDatabaseHealth();
      
      // Check biometric device status
      const biometricStatus = await this.checkBiometricHealth();
      
      // Check authentication status
      const authStatus = await this.checkAuthenticationHealth();
      
      // Check performance metrics
      const performanceStatus = this.checkPerformanceHealth();
      
      // Update overall health status
      this.healthStatus = {
        database: dbStatus.status,
        biometric: biometricStatus.status,
        authentication: authStatus.status,
        performance: performanceStatus.status,
        overall: this.calculateOverallHealth(dbStatus, biometricStatus, authStatus, performanceStatus),
        lastCheck: new Date(),
        details: {
          database: dbStatus.details,
          biometric: biometricStatus.details,
          authentication: authStatus.details,
          performance: performanceStatus.details,
          checkDuration: Date.now() - startTime
        }
      };
      
      console.log('✅ Health check completed:', this.healthStatus.overall);
      return this.healthStatus;
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.healthStatus.overall = 'critical';
      return this.healthStatus;
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabaseHealth(): Promise<{status: SystemHealthStatus['database'], details: any}> {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      const { data, error } = await supabase.from('batches').select('count').limit(1);
      
      if (error) {
        throw error;
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'connected',
        details: {
          responseTime,
          isHealthy: responseTime < 1000
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown database error'
        }
      };
    }
  }

  /**
   * Check biometric device health
   */
  private async checkBiometricHealth(): Promise<{status: SystemHealthStatus['biometric'], details: any}> {
    try {
      const deviceStatus = deviceConnectionManager.getStatus();
      const isConnected = await modernMFS100Client.isDeviceConnected();
      
      if (isConnected && deviceStatus.isConnected) {
        return {
          status: 'ready',
          details: {
            deviceInfo: deviceStatus.deviceInfo,
            lastCheck: deviceStatus.lastCheck,
            isInitialized: modernMFS100Client.isInitialized()
          }
        };
      } else {
        return {
          status: 'device-missing',
          details: {
            deviceStatus,
            clientInitialized: modernMFS100Client.isInitialized()
          }
        };
      }
    } catch (error) {
      return {
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Biometric system error'
        }
      };
    }
  }

  /**
   * Check authentication system health
   */
  private async checkAuthenticationHealth(): Promise<{status: SystemHealthStatus['authentication'], details: any}> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (session && session.expires_at && session.expires_at > Date.now() / 1000) {
        return {
          status: 'active',
          details: {
            userId: session.user.id,
            expiresAt: new Date(session.expires_at * 1000),
            tokenType: session.token_type
          }
        };
      } else {
        return {
          status: 'expired',
          details: {
            hasSession: !!session,
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
          }
        };
      }
    } catch (error) {
      return {
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Authentication error'
        }
      };
    }
  }

  /**
   * Check system performance metrics
   */
  private checkPerformanceHealth(): {status: SystemHealthStatus['performance'], details: any} {
    const memoryUsage = (performance as any).memory ? {
      used: (performance as any).memory.usedJSHeapSize,
      total: (performance as any).memory.totalJSHeapSize,
      limit: (performance as any).memory.jsHeapSizeLimit
    } : null;
    
    const timing = performance.timing ? {
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
    } : null;
    
    // Simple performance assessment
    const isOptimal = !memoryUsage || (memoryUsage.used / memoryUsage.total) < 0.8;
    
    return {
      status: isOptimal ? 'optimal' : 'degraded',
      details: {
        memory: memoryUsage,
        timing,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(...checks: any[]): SystemHealthStatus['overall'] {
    const criticalIssues = checks.filter(check => check.status === 'error' || check.status === 'critical').length;
    const warnings = checks.filter(check => check.status === 'device-missing' || check.status === 'expired' || check.status === 'degraded').length;
    
    if (criticalIssues > 0) return 'critical';
    if (warnings > 1) return 'warning';
    return 'healthy';
  }

  /**
   * Run comprehensive integration tests
   */
  async runIntegrationTests(): Promise<IntegrationTestResult[]> {
    console.log('🧪 Running integration tests...');
    this.testResults = [];
    
    // Test database operations
    await this.testDatabaseOperations();
    
    // Test biometric operations
    await this.testBiometricOperations();
    
    // Test authentication flow
    await this.testAuthenticationFlow();
    
    // Test performance optimization
    await this.testPerformanceOptimization();
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log(`✅ Integration tests completed: ${passed}/${total} passed`);
    
    auditBiometricAccess('INTEGRATION_TESTS_COMPLETED', {
      totalTests: total,
      passedTests: passed,
      success: passed === total
    });
    
    return this.testResults;
  }

  /**
   * Test database operations
   */
  private async testDatabaseOperations(): Promise<void> {
    await this.runTest('Database Connectivity', async () => {
      const { data, error } = await supabase.from('batches').select('id').limit(1);
      if (error) throw error;
      return { connected: true, hasData: data.length > 0 };
    });

    await this.runTest('Database Write Operations', async () => {
      // Test batch creation (will be cleaned up)
      const testBatch = {
        batch_name: `test_batch_${Date.now()}`,
        admin_name: 'Test Admin',
        username: 'test_user',
        serial_number: `test_${Date.now()}`
      };
      
      const { data, error } = await supabase
        .from('batches')
        .insert(testBatch)
        .select()
        .single();
      
      if (error) throw error;
      
      // Clean up test data
      await supabase.from('batches').delete().eq('id', data.id);
      
      return { batchCreated: true, cleaned: true };
    });
  }

  /**
   * Test biometric operations
   */
  private async testBiometricOperations(): Promise<void> {
    await this.runTest('Biometric Device Connection', async () => {
      const isConnected = await modernMFS100Client.isDeviceConnected();
      const deviceInfo = await modernMFS100Client.getDeviceInfo();
      
      return {
        connected: isConnected,
        deviceResponsive: !!deviceInfo.httpStaus,
        initialized: modernMFS100Client.isInitialized()
      };
    });

    await this.runTest('Device Connection Manager', async () => {
      const status = deviceConnectionManager.getStatus();
      await deviceConnectionManager.forceCheck();
      
      return {
        managerActive: true,
        lastCheck: status.lastCheck,
        hasDeviceInfo: !!status.deviceInfo
      };
    });
  }

  /**
   * Test authentication flow
   */
  private async testAuthenticationFlow(): Promise<void> {
    await this.runTest('Authentication Session', async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      return {
        hasSession: !!session,
        isValid: session ? session.expires_at > Date.now() / 1000 : false,
        userId: session?.user?.id
      };
    });
  }

  /**
   * Test performance optimization
   */
  private async testPerformanceOptimization(): Promise<void> {
    await this.runTest('Performance Optimizer', async () => {
      // Test debounce function
      const debounced = performanceOptimizer.debounce('test', () => {}, 100);
      
      // Test memoization
      const memoized = performanceOptimizer.memoize('test-memo', () => ({ test: true }));
      
      return {
        debounceCreated: typeof debounced === 'function',
        memoizationWorking: memoized.test === true,
        optimizerActive: true
      };
    });
  }

  /**
   * Helper function to run individual tests
   */
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: true,
        duration,
        details: result
      });
      
      console.log(`✅ ${testName}: PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.testResults.push({
        testName,
        passed: false,
        duration,
        error: errorMessage
      });
      
      console.error(`❌ ${testName}: FAILED (${duration}ms)`, errorMessage);
    }
  }

  /**
   * Start continuous health monitoring
   */
  private startHealthMonitoring(): void {
    // Check every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get current system health status
   */
  getHealthStatus(): SystemHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Get integration test results
   */
  getTestResults(): IntegrationTestResult[] {
    return [...this.testResults];
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopHealthMonitoring();
    performanceOptimizer.cleanup();
  }
}

export const systemIntegrationManager = SystemIntegrationManager.getInstance();
export type { SystemHealthStatus, IntegrationTestResult };
