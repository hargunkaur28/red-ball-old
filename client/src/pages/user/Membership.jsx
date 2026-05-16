import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';
import useAuthStore from '../../store/authStore';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { Trophy, Calendar, CreditCard, Clock, AlertTriangle, CheckCircle, Download, RefreshCw } from 'lucide-react';

export default function Membership() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['my-membership'],
    queryFn: () => api.get(`/memberships/${user.id}`).then(r => r.data),
    enabled: !!user?.id,
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, paymentMode }) => api.put(`/memberships/${id}/renew`, { paymentMode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-membership'] });
      toast.success('Membership renewed successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Renewal failed'),
  });

  const m = data?.membership;
  const plan = m?.planId;
  const payment = m?.paymentId;
  const msLeft = m?.endDate ? Math.max(0, new Date(m.endDate) - new Date()) : 0;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  
  let timeLeftDisplay = '';
  if (msLeft > 24 * 60 * 60 * 1000) timeLeftDisplay = `${Math.ceil(msLeft / (24 * 60 * 60 * 1000))} days`;
  else if (msLeft > 60 * 60 * 1000) timeLeftDisplay = `${Math.ceil(msLeft / (60 * 60 * 1000))} hours`;
  else if (msLeft > 0) timeLeftDisplay = `${Math.ceil(msLeft / (60 * 1000))} mins`;
  else timeLeftDisplay = '0 mins';

  const isExpired = m?.status === 'expired' || msLeft <= 0;
  const isPending = m?.status === 'pending';
  
  let currentStatus = m?.status;
  if (currentStatus === 'active' && msLeft <= 7 * 24 * 60 * 60 * 1000) {
    if (plan?.durationUnit === 'minutes' && msLeft <= 2 * 60 * 1000) currentStatus = 'expiring_soon';
    else if (plan?.durationUnit === 'hours' && msLeft <= 10 * 60 * 1000) currentStatus = 'expiring_soon';
    else if (['days', 'months', 'years'].includes(plan?.durationUnit) && msLeft <= 7 * 24 * 60 * 60 * 1000) currentStatus = 'expiring_soon';
  }

  return (
    <div>
      <PageHeader title="My Membership" subtitle="View and manage your membership" />

      {m ? (
        <div className="space-y-6">
          {/* Membership Status Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border-2 p-6 ${
              m.status === 'active' ? 'border-green-200 bg-green-50' :
              m.status === 'pending' ? 'border-amber-200 bg-amber-50' :
              m.status === 'frozen' ? 'border-blue-200 bg-blue-50' :
              'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {currentStatus === 'active' || currentStatus === 'frozen' ? <CheckCircle size={20} className="text-green-600" /> :
                   currentStatus === 'pending' ? <Clock size={20} className="text-amber-600" /> :
                   currentStatus === 'expiring_soon' ? <AlertTriangle size={20} className="text-orange-600" /> :
                   <AlertTriangle size={20} className="text-red-600" />}
                  <span className="text-sm font-bold uppercase text-[#111]">{currentStatus.replace('_', ' ')}</span>
                </div>
                <h2 className="text-3xl font-bold font-serif text-[#111] tracking-tight">{plan?.name || 'No Plan'}</h2>
                <p className="text-sm text-[#666] mt-1 capitalize">{plan?.durationValue ? `${plan.durationValue} ${plan.durationUnit}` : plan?.duration || `${plan?.durationDays || 30} days`}</p>
              </div>
              {!isPending && !isExpired && (
                <div className="text-right">
                  <p className="text-4xl font-bold text-[#111]">{timeLeftDisplay.split(' ')[0]}</p>
                  <p className="text-xs text-[#888]">{timeLeftDisplay.split(' ')[1]} remaining</p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {m.status === 'active' && (
              <div className="mt-4">
                <div className="w-full bg-black/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 rounded-full h-2 transition-all"
                    style={{ 
                      width: `${Math.min(100, Math.max(0, (daysLeft / (
                        plan?.durationUnit === 'months' ? plan.durationValue * 30 :
                        plan?.durationUnit === 'years' ? plan.durationValue * 365 :
                        plan?.durationUnit === 'days' ? plan.durationValue :
                        (plan?.durationDays || 30)
                      )) * 100))}%` 
                    }}
                  />
                </div>
              </div>
            )}

            {isPending && (
              <div className="mt-4 p-3 bg-white/50 rounded-xl">
                <p className="text-sm font-medium text-amber-800">⚠ Your membership is pending payment. Please visit reception to complete payment.</p>
              </div>
            )}
          </motion.div>

          {/* Plan Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-medium text-[#666] mb-4">Plan Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Plan Name</span>
                  <span className="text-[#111] font-medium">{plan?.name || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Duration</span>
                  <span className="text-[#111]">{plan?.durationValue ? `${plan.durationValue} ${plan.durationUnit}` : `${plan?.durationDays} days`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Price</span>
                  <span className="text-[#111]">{formatCurrency(plan?.price || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Start Date</span>
                  <span className="text-[#111]">{m.startDate ? new Date(m.startDate).toLocaleDateString('en-IN') : '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Expiry</span>
                  <span className={`font-semibold ${isExpired || currentStatus === 'expiring_soon' ? 'text-red-600' : 'text-[#111]'}`}>
                    {m.endDate ? new Date(m.endDate).toLocaleString('en-IN') : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-medium text-[#666] mb-4">Sports Access</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {plan?.sportsIncluded?.map(sport => (
                  <span key={sport} className="px-3 py-1.5 rounded-lg bg-[#F7F7F7] border border-[#EAEAEA] text-sm capitalize font-medium">
                    {sport}
                  </span>
                )) || <p className="text-sm text-[#888]">No sports assigned</p>}
              </div>

              {/* Invoice Download */}
              {payment && (
                <div className="border-t border-[#EAEAEA] pt-4">
                  <h4 className="text-xs font-semibold text-[#999] uppercase mb-2">Last Payment</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#111]">{payment.invoiceNumber}</p>
                      <p className="text-xs text-[#888]">{formatCurrency(payment.totalAmount)} • {payment.status}</p>
                    </div>
                    <button
                      onClick={() => window.open(`/api/payments/${payment._id}/invoice/print`, '_blank')}
                      className="btn-ghost text-xs gap-1"
                    >
                      <Download size={14} /> Invoice
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Renewal History */}
          {m.renewalHistory?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-medium text-[#666] mb-4">Renewal History</h3>
              <div className="space-y-2">
                {m.renewalHistory.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F7] border border-[#EAEAEA]">
                    <span className="text-sm text-[#111]">{new Date(r.date).toLocaleDateString('en-IN')}</span>
                    <span className="text-xs text-[#888]">Renewed</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Renew Button */}
          {(isExpired || currentStatus === 'expiring_soon') && m.status !== 'pending' && (
            <div className="card bg-[#F7F7F7] text-center py-6">
              <p className="text-sm text-[#666] mb-4">
                {isExpired ? 'Your membership has expired.' : `Your membership expires in ${timeLeftDisplay}.`}
              </p>
              <button
                onClick={() => renewMutation.mutate({ id: m._id, paymentMode: 'cash' })}
                disabled={renewMutation.isPending}
                className="btn-primary px-8 py-3 text-base"
              >
                <RefreshCw size={18} className="inline mr-2" />
                {renewMutation.isPending ? 'Renewing...' : 'Renew Membership'}
              </button>
              <p className="text-xs text-[#999] mt-2">Visit reception for payment</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Trophy size={48} className="mx-auto mb-4 text-[#CCC]" />
          <h3 className="text-lg font-semibold text-[#111] mb-2">No Membership Found</h3>
          <p className="text-sm text-[#888]">Visit the academy reception to sign up for a membership plan.</p>
        </div>
      )}
    </div>
  );
}
