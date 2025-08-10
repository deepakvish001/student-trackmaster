import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BatchTable } from '@/components/batches/BatchTable';
import { BatchListSkeleton } from '@/components/batches/BatchListSkeleton';
import { useOptimizedBatches } from '@/hooks/useOptimizedBatches';
import { useRealTimeBatchAccess } from '@/hooks/useRealTimeBatchAccess';
import { Batch } from '@/types/index';
import { GraduationCap, Home, ChevronRight, Plus, Edit } from 'lucide-react';

export default function Batches() {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchName, setBatchName] = useState('');

  // Enable real-time batch access updates
  const { isSubscribed } = useRealTimeBatchAccess();
  
  const {
    batches,
    stats,
    pagination,
    filters,
    actions,
    loading,
    error
  } = useOptimizedBatches({
    pageSize: 10,
    enablePrefetch: true
  });

  const handleEdit = (batch: Batch) => {
    setSelectedBatch(batch);
    // Add edit logic here
  };

  const handleStatusChange = (batch: Batch) => {
    // Add status change logic here
  };

  const handleCreateBatch = () => {
    if (batchName.trim()) {
      // Add create batch logic here
      console.log('Creating batch:', batchName);
      setBatchName('');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <BatchListSkeleton />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Breadcrumbs */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Home className="h-4 w-4" />
                <span>Home</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-electric-blue font-medium">Add Batch</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Add Batch</h1>
            </div>
          </div>

          {/* Add Batch Form */}
          <Card className="glass-card border-foreground/10">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Batch Name</label>
                  <Input 
                    placeholder="Enter Batch Name" 
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="max-w-md glass bg-background border-foreground/20 focus:border-electric-blue"
                  />
                </div>
                <div className="flex space-x-3">
                  <Button 
                    onClick={handleCreateBatch}
                    className="bg-electric-blue hover:bg-electric-blue/90 text-white"
                  >
                    Create
                  </Button>
                  <Button variant="outline" className="glass-card">
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Batch List */}
          <Card className="glass-card border-foreground/10">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-foreground">Student Batch List</CardTitle>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-foreground">Search:</label>
                  <Input 
                    placeholder="Search..." 
                    value={filters.searchTerm}
                    onChange={(e) => actions.handleSearch(e.target.value)}
                    className="w-64 glass bg-background border-foreground/20 focus:border-electric-blue"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {batches.length === 0 ? (
                <div className="text-center py-8">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                      <GraduationCap className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">No Accessible Batches</h3>
                      <p className="text-muted-foreground">You don't have access to any batches yet.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <BatchTable 
                      currentBatches={batches}
                      onEdit={handleEdit}
                      onStatusChange={handleStatusChange}
                    />
                  </div>
                  
                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-foreground/10">
                      <div className="text-sm text-muted-foreground">
                        Showing {(pagination.currentPage - 1) * 10 + 1} to {Math.min(pagination.currentPage * 10, pagination.totalCount)} of {pagination.totalCount} entries
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => actions.handlePageChange(pagination.currentPage - 1)} 
                          disabled={!pagination.hasPreviousPage}
                          className="glass-card"
                        >
                          Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            const page = i + 1;
                            const isCurrentPage = page === pagination.currentPage;
                            return (
                              <Button 
                                key={page}
                                variant={isCurrentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => actions.handlePageChange(page)}
                                className={isCurrentPage ? "bg-electric-blue text-white" : "glass-card hover:bg-electric-blue/10"}
                              >
                                {page}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => actions.handlePageChange(pagination.currentPage + 1)} 
                          disabled={!pagination.hasNextPage}
                          className="glass-card"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}