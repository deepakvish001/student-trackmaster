import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Trash2, Ban, Key, UserCheck, Power } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/hooks/useUserProfile';
import { useUserManagementState } from '@/hooks/useUserManagementState';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { state, updateState, resetCreateForm } = useUserManagementState();

  // Fetch all users with persistent caching
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
    staleTime: 30 * 1000, // 30 seconds - shorter for testing
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false, // Prevent refresh when navigating back
    refetchOnMount: false, // Use cached data when returning to page
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof state.createUserForm) => {
      console.log('Creating user with data:', userData);
      
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create_user',
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name,
          role: userData.role
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      updateState({ isCreateDialogOpen: false });
      resetCreateForm();
      toast({
        title: "Success",
        description: "User created successfully"
      });
    },
    onError: (error: Error) => {
      console.error('Create user mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete_user', user_id: userId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "Success",
        description: "User deleted successfully"
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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
    onSuccess: () => {
      updateState({ 
        isPasswordDialogOpen: false,
        newPassword: '',
        selectedUserId: ''
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
        
        <Dialog open={state.isCreateDialogOpen} onOpenChange={(open) => updateState({ isCreateDialogOpen: open })}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent>
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
    </div>
  );
}