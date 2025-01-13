import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

export default function Dashboard() {
  const stats = [
    {
      title: 'Total Batches',
      value: '0',
      icon: BookOpen,
      color: 'text-blue-600',
    },
    {
      title: 'Total Students',
      value: '314',
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Remaining Batches',
      value: '-6',
      icon: AlertCircle,
      color: 'text-yellow-600',
    },
  ];

  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <a href="#" className="text-blue-600 hover:underline">
                  More Info
                </a>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}