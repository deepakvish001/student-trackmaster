import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, AlertOctagon } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Link } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [totalBatches, setTotalBatches] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeStudents, setActiveStudents] = useState(0);

  useEffect(() => {
    fetchStats();
    subscribeToChanges();
  }, []);

  const subscribeToChanges = () => {
    const batchesChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batches'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    const studentsChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(studentsChannel);
    };
  };

  const fetchStats = async () => {
    // Fetch total batches
    const { data: batchesData } = await supabase
      .from('batches')
      .select('id', { count: 'exact' });
    
    setTotalBatches(batchesData?.length || 0);

    // Fetch total students
    const { data: studentsData } = await supabase
      .from('students')
      .select('id', { count: 'exact' });
    
    setTotalStudents(studentsData?.length || 0);

    // Fetch active students
    const { data: activeStudentsData } = await supabase
      .from('students')
      .select('id', { count: 'exact' })
      .eq('is_enabled', true);
    
    setActiveStudents(activeStudentsData?.length || 0);
  };

  const stats = [
    {
      title: 'Total Students',
      value: totalStudents.toString(),
      icon: Users,
      color: 'bg-[#00a65a]',
      link: '/students/view',
      description: 'Total registered students'
    },
    {
      title: 'Active Students',
      value: activeStudents.toString(),
      icon: AlertOctagon,
      color: 'bg-[#00c0ef]',
      link: '/students/view',
      description: 'Currently active students'
    },
    {
      title: 'Total Batches',
      value: totalBatches.toString(),
      icon: BookOpen,
      color: 'bg-[#f39c12]',
      link: '/batches',
      description: 'Total number of batches'
    },
  ];

  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className={`border-none ${stat.color} text-white hover:opacity-90 transition-opacity`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">{stat.value}</CardTitle>
              <stat.icon className="h-8 w-8 opacity-75" />
            </CardHeader>
            <CardContent>
              <p className="text-lg">{stat.title}</p>
              <p className="text-sm opacity-75 mb-4">{stat.description}</p>
              <Link 
                to={stat.link} 
                className="mt-4 block text-sm text-white/80 hover:text-white hover:underline"
              >
                More info →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}