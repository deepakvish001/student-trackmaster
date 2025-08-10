import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuditLog } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Shield, User, Activity, AlertTriangle, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_profiles?: {
    full_name: string;
  };
}

export default function AuditLogViewer() {
  const queryClient = useQueryClient();
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Optimized audit logs query with proper error handling
  const { data: logs = [], isLoading, refetch, error, isFetching } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      console.log('🔍 Fetching audit logs...');
      
      try {
        // Get audit logs first
        const { data: auditData, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        
        console.log('📊 Audit logs result:', { data: auditData?.length, error });
        
        if (error) {
          console.error('❌ Error fetching audit logs:', error);
          throw error;
        }

        if (!auditData || auditData.length === 0) {
          console.log('ℹ️ No audit logs found');
          return [];
        }

        // Get unique user IDs from audit logs
        const userIds = [...new Set(auditData.map(log => log.user_id).filter(Boolean))];
        console.log('👤 Found user IDs:', userIds.length);
        
        // Fetch user profiles for these users
        let userData: any[] = [];
        if (userIds.length > 0) {
          const { data: userProfiles, error: userError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          
          console.log('👥 User profiles result:', { data: userProfiles?.length, error: userError });
          
          if (!userError && userProfiles) {
            userData = userProfiles;
          }
        }
        
        // Combine audit logs with user data
        const transformedData = auditData.map(log => ({
          ...log,
          user_profiles: userData.find(user => user.user_id === log.user_id) || null
        }));
        
        console.log('✅ Transformed data:', transformedData.length, 'logs');
        return transformedData as AuditLogEntry[];
      } catch (err) {
        console.error('❌ Error in audit logs query:', err);
        throw err;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
  });

  // Debug: Log query state
  console.log('🔍 Query state:', { logs: logs?.length, isLoading, error });

  // Real-time subscription for audit logs
  useEffect(() => {
    console.log('🔔 Setting up real-time subscription for audit logs');
    
    const channel = supabase
      .channel('audit-logs-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          console.log('📥 New audit log received:', payload);
          // Add a small delay to avoid rapid refreshes
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
      });

    return () => {
      console.log('🔚 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Apply client-side filtering for better user experience
  const filteredLogs = React.useMemo(() => {
    if (!logs || logs.length === 0) return [];
    
    let filtered = [...logs];
    
    // Apply action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(actionFilter.toLowerCase())
      );
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchLower) ||
        log.table_name?.toLowerCase().includes(searchLower) ||
        log.user_profiles?.full_name?.toLowerCase().includes(searchLower) ||
        formatActionMessage(log).toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [logs, actionFilter, searchTerm]);

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN') || action.includes('SIGNUP')) {
      return <User className="h-4 w-4" />;
    }
    if (action.includes('CREATE') || action.includes('INSERT')) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (action.includes('DELETE') || action.includes('BAN')) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    if (action.includes('UPDATE') || action.includes('MODIFY')) {
      return <Activity className="h-4 w-4 text-blue-600" />;
    }
    if (action.includes('FAILED') || action.includes('ERROR')) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    if (action.includes('SECURITY') || action.includes('UNAUTHORIZED')) {
      return <Shield className="h-4 w-4 text-red-600" />;
    }
    return <Eye className="h-4 w-4" />;
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('FAILED') || action.includes('ERROR') || action.includes('UNAUTHORIZED')) {
      return 'destructive';
    }
    if (action.includes('SUCCESS') || action.includes('CREATE')) {
      return 'default';
    }
    if (action.includes('UPDATE') || action.includes('MODIFY')) {
      return 'secondary';
    }
    return 'outline';
  };

  const formatActionMessage = (log: AuditLogEntry) => {
    // If action is already a complete sentence, return it as is
    if (log.action.includes(' ')) {
      return log.action;
    }
    
    // Legacy action format handling
    switch (log.action.toUpperCase()) {
      case 'USER_LOGIN':
        return `${log.user_profiles?.full_name || 'User'} logged in`;
      case 'USER_LOGOUT':
        return `${log.user_profiles?.full_name || 'User'} logged out`;
      case 'LOGIN_FAILED':
        return 'Failed login attempt';
      case 'DISABLED_USER_LOGIN_ATTEMPT':
        return 'Disabled user attempted to login';
      case 'USER_CREATED':
        return `${log.user_profiles?.full_name || 'User'} created a new user account`;
      case 'USER_UPDATED':
        return `${log.user_profiles?.full_name || 'User'} updated user profile`;
      case 'USER_DELETED':
        return `${log.user_profiles?.full_name || 'User'} deleted user account`;
      case 'USER_ENABLED':
        return `${log.user_profiles?.full_name || 'User'} enabled user account`;
      case 'USER_DISABLED':
        return `${log.user_profiles?.full_name || 'User'} disabled user account`;
      case 'PASSWORD_CHANGED':
        return `${log.user_profiles?.full_name || 'User'} changed password`;
      case 'ROLE_CHANGED':
        return `${log.user_profiles?.full_name || 'User'} changed user role`;
      case 'UNAUTHORIZED_ACCESS_ATTEMPT':
        return 'Unauthorized access attempt detected';
      case 'SUSPICIOUS_INACTIVITY':
        return 'Suspicious user inactivity detected';
      default:
        return log.action.replace(/_/g, ' ').toLowerCase();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Audit Log
        </CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login Events</SelectItem>
              <SelectItem value="create">Create Events</SelectItem>
              <SelectItem value="update">Update Events</SelectItem>
              <SelectItem value="delete">Delete Events</SelectItem>
              <SelectItem value="failed">Failed Events</SelectItem>
              <SelectItem value="security">Security Events</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              refetch();
            }} 
            disabled={isLoading || isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${(isLoading || isFetching) ? 'animate-spin' : ''}`} />
            {(isLoading || isFetching) ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)} className="flex items-center gap-1 w-fit">
                      {getActionIcon(log.action)}
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatActionMessage(log)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.user_profiles?.full_name || 'Unknown User'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {log.table_name && (
                        <div><span className="text-muted-foreground">Table:</span> {log.table_name}</div>
                      )}
                      {log.record_id && (
                        <div><span className="text-muted-foreground">Record:</span> {log.record_id}</div>
                      )}
                      {log.ip_address && (
                        <div><span className="text-muted-foreground">IP:</span> {log.ip_address}</div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isLoading || isFetching ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading audit logs...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">Error loading audit logs</div>
              <div className="text-sm text-muted-foreground mb-4">{error.message}</div>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2">
                {logs.length === 0 ? 'No audit logs found' : 'No logs match your filters'}
              </div>
              <div className="text-sm text-muted-foreground">
                {logs.length === 0 
                  ? 'Start using the system to generate audit logs'
                  : 'Try adjusting your search term or filter'
                }
              </div>
              {(searchTerm || actionFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => {
                    setSearchTerm('');
                    setActionFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : null}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}