import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Check, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Trash2, Ban, Key, UserCheck, Power, Activity, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/hooks/useUserProfile';
import { useUserManagementState } from '@/hooks/useUserManagementState';
import { useAuditLog } from '@/hooks/useAuditLog';
import AuditLogViewer from './AuditLogViewer';
import { BatchSelector } from '@/components/BatchSelector';
import { Checkbox } from '@/components/ui/checkbox';
import type { Batch, UserBatchAccess } from '@/types';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  max_batches_allowed: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { state, updateState, resetCreateForm } = useUserManagementState();
  const { logEvent } = useAuditLog();
  const [showAuditLogs, setShowAuditLogs] = React.useState(false);
  const [selectedUserForBatchAccess, setSelectedUserForBatchAccess] = React.useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = React.useState(false);

  // Real-time subscription for batches
  React.useEffect(() => {
    const channel = supabase
      .channel('batches-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'batches' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['batches'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch available batches with aggressive caching (moved up for dependency)
  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('is_enabled', true)
        .order('batch_name');
      
      if (error) throw error;
      return data as Batch[];
    },
    staleTime: Infinity, // Never consider data stale
    gcTime: Infinity, // Keep in cache forever
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Super fast auto-save batch access changes with optimistic updates
  const handleBatchAccessChange = React.useCallback(async (batchId: string, checked: boolean) => {
    const currentBatchAccess = state.createUserForm.batch_access || [];
    const newBatchAccess = checked
      ? [...currentBatchAccess, batchId]
      : currentBatchAccess.filter(id => id !== batchId);
    
    // Instant UI update (optimistic)
    updateState({
      createUserForm: { ...state.createUserForm, batch_access: newBatchAccess }
    });

    // Show instant save feedback
    setIsAutoSaving(true);
    
    // Super fast autosave simulation (in real app, this would save to draft/temp state)
    try {
      // Simulate instant save to localStorage for draft state
      const draftData = {
        ...state.createUserForm,
        batch_access: newBatchAccess,
        lastModified: Date.now()
      };
      localStorage.setItem('user-creation-draft', JSON.stringify(draftData));
      
      // Ultra-fast feedback
      setTimeout(() => {
        setIsAutoSaving(false);
        toast({
          title: "✓ Saved",
          description: checked ? "Batch access added" : "Batch access removed",
          duration: 1000,
          className: "bg-green-50 border-green-200"
        });
      }, 100); // Ultra-fast 100ms feedback
      
    } catch (error) {
      setIsAutoSaving(false);
      console.error('Auto-save error:', error);
    }
  }, [state.createUserForm, updateState, toast]);

  // Handle Select All with super fast autosave
  const handleSelectAllBatches = React.useCallback(async (checked: boolean) => {
    const newBatchAccess = checked ? batches?.map(b => b.id) || [] : [];
    
    // Instant UI update
    updateState({
      createUserForm: { ...state.createUserForm, batch_access: newBatchAccess }
    });

    setIsAutoSaving(true);
    
    // Super fast autosave
    try {
      const draftData = {
        ...state.createUserForm,
        batch_access: newBatchAccess,
        lastModified: Date.now()
      };
      localStorage.setItem('user-creation-draft', JSON.stringify(draftData));
      
      setTimeout(() => {
        setIsAutoSaving(false);
        toast({
          title: "✓ Batch Selection Saved",
          description: checked ? "All batches selected" : "All batches deselected",
          duration: 1000,
          className: "bg-green-50 border-green-200"
        });
      }, 100);
      
    } catch (error) {
      setIsAutoSaving(false);
      console.error('Select all auto-save error:', error);
    }
  }, [state.createUserForm, updateState, toast, batches]);

  // Fetch user batch access
  const { data: userBatchAccess, refetch: refetchBatchAccess } = useQuery({
    queryKey: ['user-batch-access', selectedUserForBatchAccess],
    queryFn: async () => {
      if (!selectedUserForBatchAccess) return [];
      
      const { data, error } = await supabase
        .from('user_batch_access')
        .select(`
          *,
          batches (
            batch_name,
            admin_name
          )
        `)
        .eq('user_id', selectedUserForBatchAccess);
      
      if (error) throw error;
      return data as UserBatchAccess[];
    },
    enabled: !!selectedUserForBatchAccess,
  });

  // Fetch all users with aggressive caching to prevent reloads
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      console.log('Fetching users...');
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'get_users' }
      });
      
      console.log('Users fetch result:', { data, error });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.users as UserProfile[];
    },
    staleTime: Infinity, // Never consider data stale
    gcTime: Infinity, // Keep in cache forever
    refetchOnWindowFocus: false, // Never refetch when window gains focus
    refetchOnMount: false, // Never refetch when component mounts
    refetchOnReconnect: false, // Never refetch on network reconnect
    refetchInterval: false, // Disable interval refetching
    retry: 1, // Only retry once on failure
  });

  // Create user mutation with optimistic updates
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof state.createUserForm) => {
      console.log('Creating user with data:', userData);
      
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create_user',
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name,
          role: userData.role,
          batch_access: userData.batch_access,
          max_batches_allowed: userData.max_batches_allowed
        }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      if (!data.success) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }
      
      return data;
    },
    onMutate: async (userData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-users'] });
      
      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(['admin-users']);
      
      // Optimistically update to the new value
      const newUser: UserProfile = {
        id: 'temp-' + Date.now(),
        user_id: 'temp-' + Date.now(),
        full_name: userData.full_name,
        role: userData.role,
        is_active: true,
        max_batches_allowed: userData.max_batches_allowed,
        last_login_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['admin-users'], (old: UserProfile[] | undefined) => 
        old ? [...old, newUser] : [newUser]
      );
      
      // Return a context object with the snapshotted value
      return { previousUsers };
    },
    onError: (err, userData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['admin-users'], context?.previousUsers);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct data
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      updateState({ isCreateDialogOpen: false });
      resetCreateForm();
      
      // Log user creation event
      logEvent('USER_CREATED', 'user_profiles', data.user_id, null, {
        email: state.createUserForm.email,
        full_name: state.createUserForm.full_name,
        role: state.createUserForm.role
      });
      
      toast({
        title: "Success",
        description: "User created successfully"
      });
    }
  });

  // Delete user mutation with optimistic updates
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete_user', user_id: userId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['admin-users'] });
      const previousUsers = queryClient.getQueryData(['admin-users']);
      
      // Optimistically remove user
      queryClient.setQueryData(['admin-users'], (old: UserProfile[] | undefined) => 
        old?.filter(user => user.user_id !== userId) || []
      );
      
      return { previousUsers };
    },
    onError: (err, userId, context) => {
      queryClient.setQueryData(['admin-users'], context?.previousUsers);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    },
    onSuccess: (data, userId) => {
      const deletedUser = users?.find(u => u.user_id === userId);
      logEvent('USER_DELETED', 'user_profiles', userId, {
        full_name: deletedUser?.full_name,
        role: deletedUser?.role
      }, null);
      
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
    }
  });

  // Toggle user status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'toggle_status', user_id: userId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      
      // Log status change event
      const targetUser = users?.find(u => u.user_id === userId);
      const newStatus = !targetUser?.is_active;
      logEvent(newStatus ? 'USER_ENABLED' : 'USER_DISABLED', 'user_profiles', userId, {
        is_active: targetUser?.is_active
      }, {
        is_active: newStatus
      });
      
      toast({
        title: "Success",
        description: data.message
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Ban/Unban user mutation
  const toggleBanMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'ban_user' | 'unban_user' }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action, user_id: userId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, { userId, action }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      
      // Log ban/unban event
      const targetUser = users?.find(u => u.user_id === userId);
      logEvent(action === 'ban_user' ? 'USER_BANNED' : 'USER_UNBANNED', 'user_profiles', userId, {
        is_active: targetUser?.is_active
      }, {
        is_active: action === 'unban_user'
      });
      
      toast({
        title: "Success",
        description: "User status updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'update_password', user_id: userId, new_password: password }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, { userId }) => {
      updateState({ 
        isPasswordDialogOpen: false,
        newPassword: '',
        selectedUserId: ''
      });
      
      // Log password change event
      const targetUser = users?.find(u => u.user_id === userId);
      logEvent('PASSWORD_CHANGED', 'user_profiles', userId, null, {
        full_name: targetUser?.full_name
      });
      
      toast({
        title: "Success",
        description: "Password updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCreateUser = () => {
    if (!state.createUserForm.email || !state.createUserForm.password || !state.createUserForm.full_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    createUserMutation.mutate(state.createUserForm);
  };

  const handleUpdatePassword = () => {
    if (!state.newPassword || state.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }
    updatePasswordMutation.mutate({ userId: state.selectedUserId, password: state.newPassword });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">User Management</h2>
          <p className="text-muted-foreground">Manage system users and their permissions</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={showAuditLogs ? "default" : "outline"}
            onClick={() => setShowAuditLogs(!showAuditLogs)}
            className="gap-2"
          >
            <Activity className="h-4 w-4" />
            {showAuditLogs ? 'Hide' : 'Show'} Audit Logs
          </Button>
          
          <Dialog open={state.isCreateDialogOpen} onOpenChange={(open) => updateState({ isCreateDialogOpen: open })}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add New User
              </Button>
            </DialogTrigger>
          <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={state.createUserForm.email}
                  onChange={(e) => updateState({ 
                    createUserForm: { ...state.createUserForm, email: e.target.value }
                  })}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={state.createUserForm.password}
                  onChange={(e) => updateState({ 
                    createUserForm: { ...state.createUserForm, password: e.target.value }
                  })}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={state.createUserForm.full_name}
                  onChange={(e) => updateState({ 
                    createUserForm: { ...state.createUserForm, full_name: e.target.value }
                  })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={state.createUserForm.role}
                  onValueChange={(value: UserRole) => updateState({ 
                    createUserForm: { ...state.createUserForm, role: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="max_batches">Maximum Batches Allowed</Label>
                <Input
                  id="max_batches"
                  type="number"
                  min="1"
                  max="100"
                  value={state.createUserForm.max_batches_allowed}
                  onChange={(e) => updateState({ 
                    createUserForm: { ...state.createUserForm, max_batches_allowed: parseInt(e.target.value) || 1 }
                  })}
                  placeholder="Number of batches this user can create"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Each batch can contain up to 50 students
                </p>
              </div>
              
              {state.createUserForm.role === 'user' && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Batch Access (Optional - User can always access their own created batches)</Label>
                    {isAutoSaving && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Auto-saving...
                      </div>
                    )}
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between hover:bg-accent transition-colors"
                      >
                        {state.createUserForm.batch_access?.length > 0
                          ? `${state.createUserForm.batch_access.length} batches selected`
                          : "Select batches"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-full p-0 bg-background/95 backdrop-blur border shadow-lg z-50" 
                      align="start"
                    >
                      <ScrollArea className="max-h-64">
                        <div className="p-3 space-y-1">
                        {/* Select All option */}
                        <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                          <Checkbox
                            id="select-all-batches"
                            checked={
                              batches?.length > 0 && 
                              (state.createUserForm.batch_access || []).length === batches.length
                            }
                            onCheckedChange={(checked) => handleSelectAllBatches(!!checked)}
                          />
                          <Label htmlFor="select-all-batches" className="text-sm font-medium">
                            Select All
                          </Label>
                        </div>
                        
                         {batches?.map((batch) => (
                           <div key={batch.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer">
                             <Checkbox
                               id={`batch-${batch.id}`}
                               checked={(state.createUserForm.batch_access || []).includes(batch.id)}
                               onCheckedChange={(checked) => handleBatchAccessChange(batch.id, !!checked)}
                             />
                             <Label 
                               htmlFor={`batch-${batch.id}`} 
                               className="text-sm flex-1 cursor-pointer"
                               onClick={() => {
                                 const isCurrentlyChecked = (state.createUserForm.batch_access || []).includes(batch.id);
                                 handleBatchAccessChange(batch.id, !isCurrentlyChecked);
                               }}
                             >
                               {batch.batch_name} - {batch.admin_name}
                             </Label>
                             {(state.createUserForm.batch_access || []).includes(batch.id) && (
                               <Check className="h-4 w-4 text-primary" />
                             )}
                           </div>
                         ))}
                         {(!batches || batches.length === 0) && (
                           <p className="text-sm text-muted-foreground p-2">No batches available</p>
                         )}
                       </div>
                     </ScrollArea>
                   </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which batches this user can access
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => updateState({ isCreateDialogOpen: false })}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {showAuditLogs && (
        <AuditLogViewer />
      )}

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Max Batches</TableHead>
                <TableHead>Batch Access</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                      {user.role === 'super_admin' ? 'Super Admin' : 'User'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                      {user.is_active ? 'Enabled' : 'Disabled'}
                    </Badge>
                   </TableCell>
                   <TableCell>
                     <div className="flex items-center gap-2">
                       <span>{user.max_batches_allowed}</span>
                       <Dialog>
                         <DialogTrigger asChild>
                           <Button variant="ghost" size="sm" title="Edit Max Batches">
                             <Settings className="h-3 w-3" />
                           </Button>
                         </DialogTrigger>
                         <DialogContent>
                           <DialogHeader>
                             <DialogTitle>Update Max Batches</DialogTitle>
                           </DialogHeader>
                           <div className="space-y-4">
                             <div>
                               <Label htmlFor="max_batches_edit">Maximum Batches Allowed</Label>
                               <Input
                                 id="max_batches_edit"
                                 type="number"
                                 min="1"
                                 max="100"
                                 defaultValue={user.max_batches_allowed}
                                 onChange={(e) => {
                                   const newValue = parseInt(e.target.value) || 1;
                                   // Update user immediately
                                   supabase.functions.invoke('manage-users', {
                                     body: {
                                       action: 'update_max_batches',
                                       user_id: user.user_id,
                                       max_batches_allowed: newValue
                                     }
                                   }).then(({ data, error }) => {
                                     if (!error && data.success) {
                                       queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                                       toast({ title: "Success", description: "Max batches updated" });
                                     } else {
                                       toast({ 
                                         title: "Error", 
                                         description: "Failed to update max batches",
                                         variant: "destructive" 
                                       });
                                     }
                                   });
                                 }}
                               />
                               <p className="text-xs text-muted-foreground mt-1">
                                 Each batch can contain up to 50 students
                               </p>
                             </div>
                           </div>
                         </DialogContent>
                       </Dialog>
                     </div>
                   </TableCell>
                   <TableCell>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => setSelectedUserForBatchAccess(user.user_id)}
                       title="Manage Batch Access"
                     >
                       <Settings className="h-4 w-4" />
                     </Button>
                  </TableCell>
                  <TableCell>
                    {user.last_login_at 
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          updateState({
                            selectedUserId: user.user_id,
                            isPasswordDialogOpen: true
                          });
                        }}
                        title="Change Password"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatusMutation.mutate(user.user_id)}
                        disabled={toggleStatusMutation.isPending}
                        title={user.is_active ? 'Disable User' : 'Enable User'}
                      >
                        <Power className={`h-4 w-4 ${user.is_active ? 'text-green-600' : 'text-red-600'}`} />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => 
                          toggleBanMutation.mutate({ 
                            userId: user.user_id, 
                            action: user.is_active ? 'ban_user' : 'unban_user' 
                          })
                        }
                        disabled={toggleBanMutation.isPending}
                        title={user.is_active ? 'Ban User' : 'Unban User'}
                      >
                        {user.is_active ? <Ban className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Delete User">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {user.full_name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUserMutation.mutate(user.user_id)}
                              disabled={deleteUserMutation.isPending}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Update Password Dialog */}
      <Dialog open={state.isPasswordDialogOpen} onOpenChange={(open) => updateState({ isPasswordDialogOpen: open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={state.newPassword}
                onChange={(e) => updateState({ newPassword: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => updateState({ isPasswordDialogOpen: false })}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePassword}
                disabled={updatePasswordMutation.isPending}
              >
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Access Management Dialog */}
      <Dialog open={!!selectedUserForBatchAccess} onOpenChange={(open) => !open && setSelectedUserForBatchAccess(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Batch Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Current Batch Access</h4>
              {userBatchAccess && userBatchAccess.length > 0 ? (
                <div className="space-y-2">
                  {userBatchAccess.map((access) => (
                    <div key={access.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{access.batches?.batch_name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          - {access.batches?.admin_name}
                        </span>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          const { error } = await supabase
                            .from('user_batch_access')
                            .delete()
                            .eq('id', access.id);
                          
                          if (!error) {
                            refetchBatchAccess();
                            toast({ title: "Success", description: "Batch access removed" });
                          } else {
                            toast({ 
                              title: "Error", 
                              description: "Failed to remove batch access",
                              variant: "destructive" 
                            });
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No batch access assigned</p>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">Add Batch Access</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {batches
                  ?.filter(batch => !userBatchAccess?.some(access => access.batch_id === batch.id))
                  ?.map((batch) => (
                    <div key={batch.id} className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{batch.batch_name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          - {batch.admin_name}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const { error } = await supabase
                            .from('user_batch_access')
                            .insert({
                              user_id: selectedUserForBatchAccess!,
                              batch_id: batch.id,
                              granted_by: (await supabase.auth.getUser()).data.user?.id
                            });
                          
                          if (!error) {
                            refetchBatchAccess();
                            toast({ title: "Success", description: "Batch access granted" });
                          } else {
                            toast({ 
                              title: "Error", 
                              description: "Failed to grant batch access",
                              variant: "destructive" 
                            });
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                {batches?.filter(batch => !userBatchAccess?.some(access => access.batch_id === batch.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground">All available batches have been assigned</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedUserForBatchAccess(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}