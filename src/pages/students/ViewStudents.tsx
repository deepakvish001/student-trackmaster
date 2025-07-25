
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { EnhancedStudentTable } from '@/components/students/EnhancedStudentTable';
import { StudentDataDebugger } from '@/components/students/StudentDataDebugger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Bug } from 'lucide-react';

export default function ViewStudents() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">View Students</h1>
            <p className="text-muted-foreground">
              View and manage student records with fingerprint data
            </p>
          </div>
        </div>

        <Tabs defaultValue="students" className="w-full">
          <TabsList>
            <TabsTrigger value="students" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Students</span>
            </TabsTrigger>
            <TabsTrigger value="debug" className="flex items-center space-x-2">
              <Bug className="h-4 w-4" />
              <span>Debug Data</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Student Records</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedStudentTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug" className="space-y-4">
            <StudentDataDebugger />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
