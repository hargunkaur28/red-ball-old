import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';
import PageHeader from '../../components/shared/PageHeader';
import RevenueChart from '../../components/charts/RevenueChart';
import MembershipChart from '../../components/charts/MembershipChart';
import SalesChart from '../../components/charts/SalesChart';

export default function Analytics() {
  const { data: revenue } = useQuery({ queryKey: ['analytics', 'revenue', 30], queryFn: () => api.get('/analytics/revenue?range=30').then(r => r.data) });
  const { data: memberships } = useQuery({ queryKey: ['analytics', 'memberships', 90], queryFn: () => api.get('/analytics/memberships?range=90').then(r => r.data) });
  const { data: sports } = useQuery({ queryKey: ['analytics', 'sports'], queryFn: () => api.get('/analytics/sports-popularity').then(r => r.data) });

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Detailed insights and reports" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenue?.revenue || []} />
        <MembershipChart data={memberships} />
        <SalesChart data={sports?.sports || []} />
        <div className="card flex items-center justify-center text-[#888888] text-sm py-20">
          More analytics coming soon...
        </div>
      </div>
    </div>
  );
}
