
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Batch } from '@/types/index';
import { Search, Edit, Power, PowerOff, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function Batches() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [formData, setFormData] = useState({
    batch_name: '',
    serial_number: '',
    admin_name: '',
    username: '',
    max_students: 50
  });

  const queryClient = useQueryClient();

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches', searchTerm],
    queryFn: async () => {
      let query = supabase.from('batches').select('*');

      if (searchTerm) {
        query = query.or(`batch_name.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,admin_name.ilike.%${searchTerm}%`);
      }

      const { data: batchData, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching batches:', error);
        throw error;
      }

      // Get student count for each batch
      const batchesWithCounts: Batch[] = await Promise.all(
        (batchData || []).map(async (batch): Promise<Batch> => {
          const { count } = await supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('batch_id', batch.id)
            .eq('is_enabled', true);
          
          return {
            ...batch,
            student_count: count || 0,
            user_id: batch.user_id || undefined
          };
        })
      );

      return batchesWithCounts;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('batches')
        .insert([{
          ...data,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch created successfully');
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating batch:', error);
      toast.error('Failed to create batch');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('batches')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch updated successfully');
      setShowEditDialog(false);
      setSelectedBatch(null);
      resetForm();
    },
    onError: (error) => {
      console.error('Error updating batch:', error);
      toast.error('Failed to update batch');
    }
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('batches')
        .update({ 
          is_enabled: !is_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch status updated successfully');
    },
    onError: (error) => {
      console.error('Error toggling batch status:', error);
      toast.error('Failed to update batch status');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch deleted successfully');
      setShowDeleteDialog(false);
      setSelectedBatch(null);
    },
    onError: (error) => {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
    }
  });

  const resetForm = () => {
    setFormData({
      batch_name: '',
      serial_number: '',
      admin_name: '',
      username: '',
      max_students: 50
    });
  };

  const handleCreate = () => {
    setShowCreateDialog(true);
    resetForm();
  };

  const handleEdit = (batch: Batch) => {
    setSelectedBatch(batch);
    setFormData({
      batch_name: batch.batch_name,
      serial_number: batch.serial_number,
      admin_name: batch.admin_name,
      username: batch.username,
      max_students: batch.max_students
    });
    setShowEditDialog(true);
  };

  const handleDelete = (batch: Batch) => {
    setSelectedBatch(batch);
    setShowDeleteDialog(true);
  };

  const handleToggleStatus = (batch: Batch) => {
    toggleStatusMutation.mutate({
      id: batch.id,
      is_enabled: batch.is_enabled
    });
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBatch) {
      updateMutation.mutate({
        id: selectedBatch.id,
        data: formData
      });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedBatch) {
      deleteMutation.mutate(selectedBatch.id);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full mx-auto"></div>
            <div className="text-lg font-medium">Loading Batches...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Add Batch</h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span className="text-primary">Home</span>
              <span>/</span>
              <span>Add Batch</span>
            </div>
          </div>

          {/* Add Batch Form */}
          <Card className="bg-card border border-border">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Batch Name</label>
                  <Input
                    placeholder="Enter Batch Name"
                    className="max-w-md"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    onClick={handleCreate}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Batch List */}
          <Card className="bg-card border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-foreground">
                  Student Batch List
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">Search:</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder=""
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold text-foreground border-r">Sr. No ↑</TableHead>
                    <TableHead className="font-semibold text-foreground border-r">Batch Name</TableHead>
                    <TableHead className="font-semibold text-foreground border-r">Admin</TableHead>
                    <TableHead className="font-semibold text-foreground border-r">User Name</TableHead>
                    <TableHead className="font-semibold text-foreground border-r">Students</TableHead>
                    <TableHead className="font-semibold text-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch, index) => (
                    <TableRow key={batch.id} className="hover:bg-muted/30">
                      <TableCell className="border-r">{index + 1}</TableCell>
                      <TableCell className="font-medium border-r">{batch.batch_name}</TableCell>
                      <TableCell className="border-r">{batch.admin_name}</TableCell>
                      <TableCell className="border-r">{batch.username}</TableCell>
                      <TableCell className="border-r">
                        <span className="text-blue-600 font-medium">{batch.student_count || 0}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400 px-4"
                            >
                              Action ▼
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(batch)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(batch)}>
                              {batch.is_enabled ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Enable
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(batch)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {batches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No batches found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing 1 to {batches.length} of {batches.length} entries
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button size="sm" className="bg-primary text-primary-foreground">
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch_name">Batch Name</Label>
                <Input
                  id="batch_name"
                  value={formData.batch_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, batch_name: e.target.value }))}
                  placeholder="Enter batch name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                  placeholder="Enter serial number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_name">Admin Name</Label>
                <Input
                  id="admin_name"
                  value={formData.admin_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
                  placeholder="Enter admin name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_students">Max Students</Label>
                <Input
                  id="max_students"
                  type="number"
                  value={formData.max_students}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter max students"
                  min={1}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Batch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_batch_name">Batch Name</Label>
                <Input
                  id="edit_batch_name"
                  value={formData.batch_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, batch_name: e.target.value }))}
                  placeholder="Enter batch name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_serial_number">Serial Number</Label>
                <Input
                  id="edit_serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                  placeholder="Enter serial number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_admin_name">Admin Name</Label>
                <Input
                  id="edit_admin_name"
                  value={formData.admin_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
                  placeholder="Enter admin name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_username">Username</Label>
                <Input
                  id="edit_username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_max_students">Max Students</Label>
                <Input
                  id="edit_max_students"
                  type="number"
                  value={formData.max_students}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter max students"
                  min={1}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the batch 
                "{selectedBatch?.batch_name}" and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Batch'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
