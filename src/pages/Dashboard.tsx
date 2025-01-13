import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Users, AlertOctagon } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const stats = [
    {
      title: 'Total Batches',
      value: '0',
      icon: ShoppingBag,
      color: 'bg-[#00c0ef]',
      link: '/batches',
    },
    {
      title: 'Total Students',
      value: '314',
      icon: Users,
      color: 'bg-[#00a65a]',
      link: '/students/view',
    },
    {
      title: 'Remaining Batches',
      value: '-6',
      icon: AlertOctagon,
      color: 'bg-[#f39c12]',
      link: '/batches',
    },
  ];

  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className={`border-none ${stat.color} text-white`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">{stat.value}</CardTitle>
              <stat.icon className="h-8 w-8 opacity-75" />
            </CardHeader>
            <CardContent>
              <p className="text-lg">{stat.title}</p>
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