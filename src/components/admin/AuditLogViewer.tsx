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
}

export default function AuditLogViewer() {
  const queryClient = useQueryClient();
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Super fast audit logs with aggressive caching
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as AuditLogEntry[];
    },
    staleTime: Infinity, // Never consider stale
    gcTime: Infinity, // Keep in cache forever
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Real-time subscription for audit logs
  useEffect(() => {
    const channel = supabase
      .channel('audit-logs-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Super fast filtering with useMemo
  const filteredLogs = React.useMemo(() => {
    let filtered = logs;

    // Filter by action
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(actionFilter.toLowerCase())
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_id.toLowerCase().includes(searchTerm.toLowerCase())
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
    switch (log.action) {
      case 'USER_LOGIN':
        return 'User successfully logged in';
      case 'USER_LOGOUT':
        return 'User logged out';
      case 'LOGIN_FAILED':
        return 'Failed login attempt';
      case 'DISABLED_USER_LOGIN_ATTEMPT':
        return 'Disabled user attempted to login';
      case 'USER_CREATED':
        return 'New user account created';
      case 'USER_UPDATED':
        return 'User profile updated';
      case 'USER_DELETED':
        return 'User account deleted';
      case 'USER_ENABLED':
        return 'User account enabled';
      case 'USER_DISABLED':
        return 'User account disabled';
      case 'PASSWORD_CHANGED':
        return 'User password changed';
      case 'ROLE_CHANGED':
        return 'User role modified';
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
                <TableHead>User ID</TableHead>
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
                  <TableCell className="font-mono text-sm">
                    {log.user_id.substring(0, 8)}...
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
            <div className="text-center py-8 text-muted-foreground">
              {isLoading ? 'Loading audit logs...' : 'No audit logs found'}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}