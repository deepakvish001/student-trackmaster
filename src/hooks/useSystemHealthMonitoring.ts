
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheck {
  id: string;
  check_type: string;
  status: string;
  details?: any;
  response_time_ms?: number;
  checked_at: string;
}

interface SystemMetrics {
  database: 'healthy' | 'degraded' | 'critical';
  connectivity: 'healthy' | 'degraded' | 'critical';
  authentication: 'healthy' | 'degraded' | 'critical';
  storage: 'healthy' | 'degraded' | 'critical';
  overall: 'healthy' | 'degraded' | 'critical';
  lastCheck: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://vitvffzejxihfvnumlgn.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdHZmZnplanhpaGZ2bnVtbGduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNjQ0MDksImV4cCI6MjA4NDc0MDQwOX0.M7GtqmgVpAlEBK60cq9xunYJBkURPvQR5ikEbOycKk0";

// Table is optional; silently skip if it does not exist
let HEALTH_LOG_TABLE_DISABLED = false;

export function useSystemHealthMonitoring(autoCheck = true, interval = 30000) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [recentChecks, setRecentChecks] = useState<HealthCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoCheck) {
      performHealthCheck();
      intervalRef.current = setInterval(performHealthCheck, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoCheck, interval]);

  const recordHealthCheck = async (
    checkType: string,
    status: string,
    details?: any,
    responseTime?: number
  ) => {
    if (HEALTH_LOG_TABLE_DISABLED) return;
    try {
      const { error } = await (supabase as any)
        .from('system_health_logs')
        .insert({
          check_type: checkType,
          status,
          details,
          response_time_ms: responseTime,
          checked_at: new Date().toISOString()
        });

      if (error) {
        if ((error as any).code === 'PGRST205') {
          HEALTH_LOG_TABLE_DISABLED = true;
        }
      }
    } catch (err) {
      // swallow
    }
  };

  const checkDatabase = async (): Promise<{ status: string; responseTime: number }> => {
    const startTime = Date.now();
    try {
      const { error } = await supabase.from('batches').select('count').limit(1);
      const responseTime = Date.now() - startTime;
      
      if (error) {
        await recordHealthCheck('database', 'critical', { error: error.message }, responseTime);
        return { status: 'critical', responseTime };
      }
      
      const status = responseTime > 1000 ? 'degraded' : 'healthy';
      await recordHealthCheck('database', status, { responseTime }, responseTime);
      return { status, responseTime };
    } catch (err) {
      const responseTime = Date.now() - startTime;
      await recordHealthCheck('database', 'critical', { error: err }, responseTime);
      return { status: 'critical', responseTime };
    }
  };

  const checkAuthentication = async (): Promise<{ status: string; responseTime: number }> => {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.auth.getSession();
      const responseTime = Date.now() - startTime;
      
      if (error) {
        await recordHealthCheck('authentication', 'critical', { error: error.message }, responseTime);
        return { status: 'critical', responseTime };
      }
      
      const status = responseTime > 500 ? 'degraded' : 'healthy';
      await recordHealthCheck('authentication', status, { 
        hasSession: !!data.session,
        responseTime 
      }, responseTime);
      return { status, responseTime };
    } catch (err) {
      const responseTime = Date.now() - startTime;
      await recordHealthCheck('authentication', 'critical', { error: err }, responseTime);
      return { status: 'critical', responseTime };
    }
  };

  const checkConnectivity = async (): Promise<{ status: string; responseTime: number }> => {
    const startTime = Date.now();
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': SUPABASE_KEY
        }
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.ok ? (responseTime > 2000 ? 'degraded' : 'healthy') : 'critical';
      
      await recordHealthCheck('connectivity', status, { 
        statusCode: response.status,
        responseTime 
      }, responseTime);
      
      return { status, responseTime };
    } catch (err) {
      const responseTime = Date.now() - startTime;
      await recordHealthCheck('connectivity', 'critical', { error: err }, responseTime);
      return { status: 'critical', responseTime };
    }
  };

  const performHealthCheck = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      const [dbCheck, authCheck, connCheck] = await Promise.all([
        checkDatabase(),
        checkAuthentication(),
        checkConnectivity()
      ]);

      const statuses = [dbCheck.status, authCheck.status, connCheck.status];
      const overall = statuses.includes('critical') ? 'critical' : 
                    statuses.includes('degraded') ? 'degraded' : 'healthy';

      const newMetrics: SystemMetrics = {
        database: dbCheck.status as any,
        authentication: authCheck.status as any,
        connectivity: connCheck.status as any,
        storage: 'healthy', // Placeholder for now
        overall: overall as any,
        lastCheck: new Date().toISOString()
      };

      setMetrics(newMetrics);
      await fetchRecentChecks();
      
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const fetchRecentChecks = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('system_health_logs')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching health checks:', error);
        return;
      }
      
      setRecentChecks((data || []) as HealthCheck[]);
    } catch (err) {
      console.error('Failed to fetch recent health checks:', err);
    }
  };

  return {
    metrics,
    recentChecks,
    isChecking,
    performHealthCheck,
    fetchRecentChecks
  };
}
