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

  // Super fast audit logs with aggressive caching
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', actionFilter, searchTerm],
    queryFn: async () => {
      console.log('🔍 Fetching audit logs with filter:', { actionFilter, searchTerm });
      
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user_profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      // Apply database-level filtering for better performance
      if (actionFilter !== 'all') {
        query = query.ilike('action', `%${actionFilter}%`);
      }

      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,table_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(200);
      
      console.log('📊 Query result:', { data: data?.length, error });
      
      if (error) {
        console.error('❌ Error fetching audit logs:', error);
        throw error;
      }
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(log => ({
        ...log,
        user_profiles: Array.isArray(log.user_profiles) ? log.user_profiles[0] : log.user_profiles
      }));
      
      console.log('✅ Transformed data:', transformedData.length, 'logs');
      return transformedData as AuditLogEntry[];
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 3,
  });

  // Enhanced real-time subscription for audit logs
  useEffect(() => {
    console.log('🔔 Setting up real-time subscription for audit logs');
    
    const channel = supabase
      .channel('audit-logs-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          console.log('📥 New audit log received:', payload);
          queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'audit_logs' },
        (payload) => {
          console.log('📝 Audit log updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'audit_logs' },
        (payload) => {
          console.log('🗑️ Audit log deleted:', payload);
          queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
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

  // Logs are now pre-filtered at database level for better performance
  const filteredLogs = logs;

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
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
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
          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              {isLoading ? (
                <div className="text-muted-foreground">Loading audit logs...</div>
              ) : (
                <div>
                  <div className="text-muted-foreground mb-2">No audit logs found</div>
                  <div className="text-sm text-muted-foreground">
                    {searchTerm || actionFilter !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Start using the system to generate audit logs'
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}