import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/axios';
import useAuthStore from '../../store/authStore';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { Trophy, Clock, AlertTriangle, CheckCircle, Download, RefreshCw, Check } from 'lucide-react';

const emptyDash = '-';

const formatDateTime = (dateStr) => {
  if (!dateStr) return emptyDash;
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const statusStyles = {
  active: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  pending: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
  frozen: 'border-sky-400/20 bg-sky-500/10 text-sky-300',
  expiring_soon: 'border-orange-400/20 bg-orange-500/10 text-orange-300',
  expired: 'border-red-400/20 bg-red-500/10 text-red-300',
};

const sessionStyles = {
  Active: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  Completed: 'border-sky-400/20 bg-sky-500/10 text-sky-300',
  Overtime: 'border-red-400/20 bg-red-500/10 text-red-300',
};

function Surface({ children, className = '' }) {
  return (
    <div className={`rounded-[28px] border border-[#222A2A] bg-[#111515] shadow-2xl shadow-black/25 ${className}`}>
      {children}
    </div>
  );
}

function DetailRow({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/45">{label}</span>
      <span className={`text-right font-semibold ${valueClass}`}>{value || emptyDash}</span>
    </div>
  );
}

export default function Membership() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['my-membership'],
    queryFn: () => api.get(`/memberships/${user.id}`).then(r => r.data),
    enabled: !!user?.id,
  });

  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['my-attendance', user?.id],
    queryFn: () => api.get(`/attendance/user/${user.id}`).then(r => r.data),
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

  const activeMemberships = data?.memberships || (data?.membership ? [data.membership] : []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#df1526]">Red Ball Academy</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">My Membership</h1>
        <p className="mt-2 text-sm text-white/50">View and manage your membership</p>
      </div>

      {activeMemberships.length > 0 ? (
        activeMemberships.map((membership) => {
          const plan = membership.planId;
          const payment = membership.paymentId;
          const msLeft = membership?.endDate ? Math.max(0, new Date(membership.endDate) - new Date()) : 0;
          const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

          let timeLeftDisplay = '';
          if (msLeft > 24 * 60 * 60 * 1000) timeLeftDisplay = `${Math.ceil(msLeft / (24 * 60 * 60 * 1000))} days`;
          else if (msLeft > 60 * 60 * 1000) timeLeftDisplay = `${Math.ceil(msLeft / (60 * 60 * 1000))} hours`;
          else if (msLeft > 0) timeLeftDisplay = `${Math.ceil(msLeft / (60 * 1000))} mins`;
          else timeLeftDisplay = '0 mins';

          const isExpired = membership?.status === 'expired' || msLeft <= 0;
          const isPending = membership?.status === 'pending';

          let currentStatus = membership?.status;
          if (currentStatus === 'active' && msLeft <= 7 * 24 * 60 * 60 * 1000) {
            if (plan?.durationUnit === 'minutes' && msLeft <= 2 * 60 * 1000) currentStatus = 'expiring_soon';
            else if (plan?.durationUnit === 'hours' && msLeft <= 10 * 60 * 1000) currentStatus = 'expiring_soon';
            else if (['days', 'months', 'years'].includes(plan?.durationUnit) && msLeft <= 7 * 24 * 60 * 60 * 1000) currentStatus = 'expiring_soon';
          }

          if (!plan) return null;

          const totalPlanDays =
            plan?.durationUnit === 'months' ? plan.durationValue * 30 :
            plan?.durationUnit === 'years' ? plan.durationValue * 365 :
            plan?.durationUnit === 'days' ? plan.durationValue :
            (plan?.durationDays || 30);

          return (
            <div key={membership._id} className="space-y-6 border-b border-white/10 pb-10 last:border-b-0 last:pb-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[28px] border p-6 ${statusStyles[currentStatus] || statusStyles.expired}`}
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      {currentStatus === 'active' || currentStatus === 'frozen' ? <CheckCircle size={20} /> :
                        currentStatus === 'pending' ? <Clock size={20} /> :
                        currentStatus === 'expiring_soon' ? <AlertTriangle size={20} /> :
                        <CheckCircle size={20} />}
                      <span className="text-xs font-black uppercase tracking-[0.18em]">
                        Membership Status: {currentStatus?.replace('_', ' ') || 'unknown'}
                      </span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-white">{plan?.name || 'No Plan'}</h2>
                    <p className="mt-1 text-sm capitalize text-white/52">
                      {plan?.durationValue ? `${plan.durationValue} ${plan.durationUnit}` : plan?.duration || `${plan?.durationDays || 30} days`}
                    </p>
                  </div>

                  {!isPending && !isExpired && (
                    <div className="rounded-3xl border border-white/10 bg-black/18 px-6 py-4 text-left sm:text-right">
                      <p className="text-3xl font-black text-white sm:text-4xl">{timeLeftDisplay.split(' ')[0]}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/42">{timeLeftDisplay.split(' ')[1]} remaining</p>
                    </div>
                  )}
                </div>

                {membership.status === 'active' && (
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, (daysLeft / totalPlanDays) * 100))}%` }}
                    />
                  </div>
                )}

                {isPending && (
                  <div className="mt-5 flex gap-2 rounded-2xl border border-amber-300/15 bg-black/16 p-4 text-sm font-semibold text-amber-200">
                    <Check size={16} className="mt-0.5 shrink-0" />
                    Your membership is pending payment. Please visit reception to complete payment.
                  </div>
                )}
              </motion.div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Surface className="p-6">
                  <h3 className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-white/42">Plan Details</h3>
                  <div className="space-y-4">
                    <DetailRow label="Plan Name" value={plan?.name} />
                    <DetailRow label="Duration" value={plan?.durationValue ? `${plan.durationValue} ${plan.durationUnit}` : `${plan?.durationDays} days`} />
                    <DetailRow label="Price" value={formatCurrency(plan?.price || 0)} />
                    <DetailRow label="Start Date" value={membership.startDate ? new Date(membership.startDate).toLocaleDateString('en-IN') : emptyDash} />
                    <DetailRow
                      label="Expiry"
                      value={membership.endDate ? new Date(membership.endDate).toLocaleString('en-IN') : emptyDash}
                      valueClass={isExpired || currentStatus === 'expiring_soon' ? 'text-red-300' : 'text-white'}
                    />
                  </div>
                </Surface>

                <Surface className="p-6">
                  <h3 className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-white/42">Sports Access</h3>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {plan?.sportsIncluded?.length ? plan.sportsIncluded.map(sport => (
                      <span key={sport} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm font-semibold capitalize text-white/72">
                        {sport}
                      </span>
                    )) : <p className="text-sm text-white/45">No sports assigned</p>}
                  </div>

                  {payment && (
                    <div className="border-t border-white/10 pt-5">
                      <h4 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/34">Last Payment</h4>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{payment.invoiceNumber}</p>
                          <p className="text-xs text-white/45">{formatCurrency(payment.totalAmount)} - {payment.status}</p>
                        </div>
                        <button
                          onClick={() => window.open(`/api/payments/${payment._id}/invoice/print`, '_blank')}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-white transition hover:bg-white/10"
                        >
                          <Download size={14} /> Invoice
                        </button>
                      </div>
                    </div>
                  )}
                </Surface>
              </div>

              {membership.renewalHistory?.length > 0 && (
                <Surface className="p-6">
                  <h3 className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-white/42">Renewal History</h3>
                  <div className="space-y-2">
                    {membership.renewalHistory.map((renewal, index) => (
                      <div key={index} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <span className="text-sm font-semibold text-white">{new Date(renewal.date).toLocaleDateString('en-IN')}</span>
                        <span className="text-xs uppercase tracking-[0.16em] text-white/42">Renewed</span>
                      </div>
                    ))}
                  </div>
                </Surface>
              )}

              {(isExpired || currentStatus === 'expiring_soon') && membership.status !== 'pending' && (
                <Surface className="p-6 text-center">
                  <p className="mb-4 text-sm text-white/58">
                    {isExpired ? 'Your membership has expired.' : `Your membership expires in ${timeLeftDisplay}.`}
                  </p>
                  <button
                    onClick={() => renewMutation.mutate({ id: membership._id, paymentMode: 'cash' })}
                    disabled={renewMutation.isPending}
                    className="rounded-full bg-white px-7 py-3 text-sm font-black text-black transition hover:bg-[#df1526] hover:text-white disabled:opacity-60"
                  >
                    <RefreshCw size={18} className="mr-2 inline" />
                    {renewMutation.isPending ? 'Renewing...' : 'Renew Membership'}
                  </button>
                  <p className="mt-3 text-xs text-white/35">Visit reception for payment</p>
                </Surface>
              )}
            </div>
          );
        })
      ) : (
        <Surface className="p-12 text-center">
          <Trophy size={52} className="mx-auto mb-5 text-white/24" />
          <h3 className="mb-2 text-xl font-black text-white">No Membership Found</h3>
          <p className="text-sm text-white/50">Visit the academy reception to sign up for a membership plan.</p>
        </Surface>
      )}

      <Surface className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white/45">Recent Check-ins & Check-outs</h3>
          <span className="text-xs text-white/35">Last 10 sessions</span>
        </div>

        {isAttendanceLoading ? (
          <div className="py-14 text-center text-sm text-white/45">Loading activity history...</div>
        ) : !attendanceData?.attendance || attendanceData.attendance.length === 0 ? (
          <div className="py-14 text-center text-sm text-white/45">No check-in history found yet.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-white/38">
                    <th className="px-6 py-4 font-semibold">Sport</th>
                    <th className="px-6 py-4 font-semibold">Check-In</th>
                    <th className="px-6 py-4 font-semibold">Check-Out</th>
                    <th className="px-6 py-4 font-semibold">Duration</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.attendance.slice(0, 10).map((record) => {
                    const duration = record.checkOutTime
                      ? `${record.actualDurationMinutes || Math.round((new Date(record.checkOutTime) - new Date(record.checkInTime)) / 60000)} mins`
                      : emptyDash;

                    return (
                      <tr key={record._id} className="border-b border-white/7 last:border-b-0">
                        <td className="px-6 py-4 font-semibold capitalize whitespace-nowrap text-white">{record.sport}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-white/58">{formatDateTime(record.checkInTime)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-white/58">
                          {record.checkOutTime ? formatDateTime(record.checkOutTime) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-white/58">{duration}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-block rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${sessionStyles[record.sessionStatus] || 'border-white/10 bg-white/[0.05] text-white/55'}`}>
                            {record.sessionStatus || 'Completed'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col divide-y divide-white/10">
              {attendanceData.attendance.slice(0, 10).map((record) => {
                const duration = record.checkOutTime
                  ? `${record.actualDurationMinutes || Math.round((new Date(record.checkOutTime) - new Date(record.checkInTime)) / 60000)} mins`
                  : null;

                return (
                  <div key={record._id} className="p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white capitalize">{record.sport}</span>
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${sessionStyles[record.sessionStatus] || 'border-white/10 bg-white/[0.05] text-white/55'}`}>
                        {record.sessionStatus || 'Completed'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 text-xs text-white/55">
                      <div className="flex justify-between">
                        <span>Check-In:</span>
                        <span className="text-white/80">{formatDateTime(record.checkInTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Check-Out:</span>
                        {record.checkOutTime ? (
                          <span className="text-white/80">{formatDateTime(record.checkOutTime)}</span>
                        ) : (
                          <span className="text-emerald-400 font-bold animate-pulse">Active Now</span>
                        )}
                      </div>
                      {duration && (
                        <div className="flex justify-between mt-1 pt-1 border-t border-white/5">
                          <span>Duration:</span>
                          <span className="text-white/80 font-medium">{duration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Surface>
    </div>
  );
}
