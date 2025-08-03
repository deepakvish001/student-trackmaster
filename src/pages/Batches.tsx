
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { BatchCRUD } from '@/components/batches/BatchCRUD';
import { Batch } from '@/types/index';
import { Search } from 'lucide-react';

export default function Batches() {
  const [searchTerm, setSearchTerm] = useState('');

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
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                    Create
                  </Button>
                  <Button variant="outline" className="px-6">
                    Edit
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
                        <div className="relative">
                          <Button 
                            variant="outline" 
                            className="bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400 px-4"
                          >
                            Action ▼
                          </Button>
                        </div>
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
      </div>
    </DashboardLayout>
  );
}
