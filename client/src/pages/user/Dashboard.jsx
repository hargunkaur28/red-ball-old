import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../lib/axios';
import useAuthStore from '../../store/authStore';
import { formatCurrency } from '../../lib/utils';
import socket from '../../lib/socket';
import { Trophy, Calendar, Utensils, Clock, AlertTriangle, CheckCircle, QrCode, TimerReset } from 'lucide-react';
import { toast } from 'sonner';

const formatSessionClock = (milliseconds) => {
  const abs = Math.abs(milliseconds);
  const totalSeconds = Math.max(0, Math.floor(abs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (milliseconds < 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s overtime`;
  }
  if (totalSeconds <= 60) return `${seconds} secs remaining`;
  return `${Math.ceil(totalSeconds / 60)} mins remaining`;
};

export default function UserDashboard() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus');

  const { data: membership } = useQuery({
    queryKey: ['my-membership'],
    queryFn: () => api.get(`/memberships/${user.id}`).then(r => r.data),
    enabled: !!user?.id,
  });

  const { data: orders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my-orders').then(r => r.data),
    enabled: !!user?.id,
  });

  const { data: sessionData } = useQuery({
    queryKey: ['attendance', 'active-session', user?.id],
    queryFn: () => api.get('/attendance/active-sessions').then(r => r.data),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: passesData, isLoading: passesLoading } = useQuery({
    queryKey: ['my-passes'],
    queryFn: () => api.get('/onetimeaccess/my-passes').then(r => r.data),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const passesList = useMemo(() => passesData?.passes || [], [passesData]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (focus === 'passes' && !passesLoading) {
      setTimeout(() => {
        const element = document.getElementById('my-passes-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast.info('Viewing your purchased access passes.', { id: 'focus-passes-toast' });
        }
      }, 500);
    }
  }, [focus, passesLoading]);

  useEffect(() => {
    const refreshSession = () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'active-session'] });
      qc.invalidateQueries({ queryKey: ['my-passes'] });
    };
    socket.on('session:started', refreshSession);
    socket.on('session:ended', refreshSession);
    socket.on('attendance:check-in', refreshSession);
    socket.on('attendance:check-out', refreshSession);
    socket.on('attendance:auto-checkout', refreshSession);
    socket.on('dashboard:refresh', refreshSession);
    return () => {
      socket.off('session:started', refreshSession);
      socket.off('session:ended', refreshSession);
      socket.off('attendance:check-in', refreshSession);
      socket.off('attendance:check-out', refreshSession);
      socket.off('attendance:auto-checkout', refreshSession);
      socket.off('dashboard:refresh', refreshSession);
    };
  }, [qc]);

  const activeMemberships = membership?.memberships || (membership?.membership ? [membership.membership] : []);
  const activeSessions = sessionData?.activeSessions || [];
  const activeSession = activeSessions[0];
  const sessionState = useMemo(() => {
    if (!activeSession?.checkInTime) return null;
    const allowedMinutes = activeSession.allowedDurationMinutes || sessionData?.allowedDurationMinutes || 75;
    const checkInMs = new Date(activeSession.checkInTime).getTime();
    const endsAt = checkInMs + allowedMinutes * 60000;
    const remainingMs = endsAt - now;
    const remainingMinutes = Math.ceil(Math.max(0, remainingMs) / 60000);
    const overtimeMinutes = Math.max(0, Math.floor((now - endsAt) / 60000));
    const tone = remainingMs <= 0
      ? 'border-red-500/35 bg-red-500/10 text-red-200'
      : remainingMinutes <= 5
        ? 'border-orange-500/35 bg-orange-500/10 text-orange-200'
        : remainingMinutes <= 15
          ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
          : 'border-green-500/35 bg-green-500/10 text-green-200';
    const message = remainingMs <= 0
      ? 'Overtime charges now active'
      : remainingMinutes <= 5
        ? 'Session ending very soon'
        : remainingMinutes <= 15
          ? 'Session ending soon'
          : 'Session running normally';

    return {
      allowedMinutes,
      remainingMs,
      overtimeMinutes,
      label: formatSessionClock(remainingMs),
      tone,
      message,
      checkInLabel: new Date(activeSession.checkInTime).toLocaleString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
      }),
    };
  }, [activeSession, now, sessionData?.allowedDurationMinutes]);

  const statusConfig = {
    active: { color: 'border-green-500/25 bg-green-500/8 text-green-300', icon: <CheckCircle size={20} />, text: 'Active' },
    pending: { color: 'border-amber-500/25 bg-amber-500/8 text-amber-300', icon: <Clock size={20} />, text: 'Payment Pending' },
    expired: { color: 'border-red-500/25 bg-red-500/8 text-red-300', icon: <AlertTriangle size={20} />, text: 'Expired' },
    frozen: { color: 'border-blue-500/25 bg-blue-500/8 text-blue-300', icon: <Clock size={20} />, text: 'Frozen' },
  };

  return (
    <div className="ota-user-root min-h-screen text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .ota-user-root { font-family: 'Outfit', sans-serif; }
        .ota-card {
          background: #111515;
          border: 1px solid #222A2A;
          border-radius: 24px;
          box-shadow: 0 26px 70px rgba(0,0,0,0.28);
        }
        .ota-soft-card {
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.075);
          border-radius: 18px;
        }
      `}</style>

      <div className="mb-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#df1526]">Red Ball Academy</p>
        <h1 className="mt-2 text-3xl md:text-5xl font-black tracking-tight text-white">
          Welcome, {user?.name?.split(' ')[0] || 'Player'}
        </h1>
        <p className="mt-2 text-sm md:text-base text-white/50">Your sport access, passes, sessions, and orders in one place.</p>
      </div>

      {/* Premium Scan QR Entry Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl text-white p-6 md:p-7 mb-8 border shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 ${
          activeSession
            ? 'bg-gradient-to-r from-[#2a050b] to-black border-[#C8102E]/45'
            : 'bg-gradient-to-r from-[#111515] to-black border-[#222A2A]'
        }`}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-14 h-14 rounded-xl border flex items-center justify-center shrink-0 ${
            activeSession
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-[#C8102E]/10 border-[#C8102E]/30 text-[#C8102E] animate-pulse'
          }`}>
            {activeSession ? <TimerReset size={28} /> : <QrCode size={28} />}
          </div>
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">
              {activeSession ? 'Checkout Required' : 'Smart Sport Entry'}
            </h3>
            <p className="text-sm text-white/50 mt-1">
              {activeSession
                ? `You're checked in for ${activeSession.sport || 'this sport'}. Scan the same sport QR when you leave to check out.`
                : 'Scan the QR code at any sport court (Cricket, Badminton, Pickleball, Gym) for instant entry validation and automated check-in.'}
            </p>
          </div>
        </div>
        <Link
          to="/user/scan"
          className={`w-full md:w-auto px-6 py-3 rounded-xl text-white font-bold text-sm active:scale-95 transition-all text-center flex items-center justify-center gap-2 ${
            activeSession ? 'bg-white/12 border border-white/20 hover:bg-white/18' : 'bg-[#C8102E] hover:bg-[#a80e27]'
          }`}
        >
          <QrCode size={16} /> {activeSession ? 'Scan to Check Out' : 'Scan QR Now'}
        </Link>
      </motion.div>

      {/* Active Sport Session (Standalone - only if not linked to a membership/pass) */}
      {activeSession && sessionState && !activeMemberships.some(m => m._id === activeSession.relatedBookingId) && !passesList.some(p => p._id === activeSession.relatedBookingId) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border p-5 mb-8 transition-colors ${sessionState.tone}`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                <TimerReset size={24} />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider opacity-75">Active Sport Session</p>
                <h3 className="text-xl font-extrabold text-white mt-1">{activeSession.sport || 'Sport'}</h3>
                <p className="text-sm font-semibold mt-1">Checked in: {sessionState.checkInLabel}</p>
                <p className="text-sm mt-1">{sessionState.message}</p>
              </div>
            </div>
            <div className="md:text-right">
              <p className="text-2xl font-black tabular-nums">{sessionState.label}</p>
              <p className="text-xs font-semibold opacity-75 mt-1">Allowed: {sessionState.allowedMinutes} mins</p>
              <Link
                to="/user/scan"
                className="mt-3 inline-flex w-full md:w-auto items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-bold hover:bg-white/15 transition-colors"
              >
                <QrCode size={15} /> Scan Same QR to Check Out
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Membership Cards */}
      {activeMemberships.length > 0 ? (
        activeMemberships.map((m) => {
          const plan = m?.planId;
          if (!plan) return null;
          const daysLeft = m?.endDate ? Math.max(0, Math.ceil((new Date(m.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
          const isExpired = m?.status === 'expired' || daysLeft <= 0;
          const isPending = m?.status === 'pending';
          const sc = statusConfig[m?.status] || statusConfig.pending;
          
          return (
            <motion.div key={m._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-3xl border p-6 mb-4 ${sc.color}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2 pr-12">
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sc.icon}
                      <span className="text-sm font-bold uppercase">{sc.text}</span>
                    </div>
                    {activeSessions.some(s => s.relatedBookingId === m._id) && (
                      <span className={`px-2 py-0.5 shrink-0 whitespace-nowrap rounded text-[10px] font-extrabold uppercase tracking-wider ${sessionState?.tone?.split(' ')[1] || 'bg-green-500/10'} ${sessionState?.tone?.split(' ')[2] || 'text-green-200'} border ${sessionState?.tone?.split(' ')[0] || 'border-green-500/35'} animate-pulse`}>
                        {sessionState?.message === 'Overtime charges now active' ? 'Overtime Active' : 'Currently Checked In'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">{plan?.name || 'No Plan'}</h2>
                  <p className="text-sm opacity-75 mt-1">
                    {plan?.sportsIncluded?.join(' • ') || 'No sports assigned'}
                  </p>
                </div>
                <div className="text-right">
                  {!isPending && !isExpired && (
                    <>
                      <p className="text-3xl font-bold">{daysLeft}</p>
                      <p className="text-xs opacity-75">days left</p>
                    </>
                  )}
                </div>
              </div>

              {m.endDate && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span>Valid until: {new Date(m.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  {(isExpired || daysLeft <= 7) && (
                    <Link to="/user/membership" className="font-bold underline">Renew Now →</Link>
                  )}
                </div>
              )}

              {isPending && (
                <div className="mt-4 p-3 bg-white/10 rounded-xl">
                  <p className="text-sm font-medium">⚠ Your membership is pending payment. Please contact the reception to complete payment.</p>
                </div>
              )}

              {activeSessions.some(s => s.relatedBookingId === m._id) && (
                <div className={`mt-5 pt-5 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <TimerReset size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider opacity-75">Active Session</p>
                      <h3 className="text-lg font-extrabold text-white leading-tight">{activeSession?.sport || 'Sport'}</h3>
                      <p className="text-xs font-semibold mt-0.5">Checked in: {sessionState?.checkInLabel}</p>
                    </div>
                  </div>
                  <div className="md:text-right w-full md:w-auto">
                    <p className={`text-xl font-black tabular-nums ${sessionState?.tone?.split(' ')[2] || ''}`}>{sessionState?.label}</p>
                    <p className="text-[11px] font-semibold opacity-75 mt-0.5">{sessionState?.message} (Allowed: {sessionState?.allowedMinutes}m)</p>
                    <Link
                      to="/user/scan"
                      className="mt-2 inline-flex w-full md:w-auto items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                    >
                      <QrCode size={14} /> Scan QR to Check Out
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })
      ) : (
        <div className="ota-card mb-8 text-center py-8 px-6">
          <p className="text-white/55 text-sm">No active membership found.</p>
          <p className="text-xs text-white/35 mt-1">Visit the academy reception to get started.</p>
        </div>
      )}
      {/* Prepaid Passes Section */}
      <div id="my-passes-section" className="mb-8">
        <h3 className="text-sm font-extrabold text-white/70 uppercase tracking-wider mb-4">Purchased One-Time Access</h3>
        {passesLoading ? (
          <div className="text-sm text-white/45 py-2">Loading passes...</div>
        ) : passesList.length === 0 ? (
          <div className="ota-card text-center py-7 px-6 border-dashed">
            <p className="text-white/55 text-sm">No prepaid passes purchased.</p>
            <Link to="/user/book-slots" className="text-xs text-[#df1526] font-bold mt-1 inline-block hover:underline">
              Purchase Flexible Access Pass →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {passesList.map((pass) => {
              const sportName = pass.sportId?.name || 'Sport';
              const sportSlug = pass.sportId?.qrSlug || pass.sportId?.slug || '';
              const expiresAtDate = new Date(pass.expiresAt);
              const msRemaining = expiresAtDate.getTime() - now;
              const isPassExpired = msRemaining <= 0 || pass.accessStatus === 'expired';

              const hoursLeft = Math.floor(msRemaining / (1000 * 60 * 60));
              const minutesLeft = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

              const countdownLabel = msRemaining > 0
                ? `${hoursLeft}h ${minutesLeft}m left`
                : 'Expired';

              if (pass.accessStatus === 'unused') {
                return (
                  <motion.div
                    key={pass._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 p-5 shadow-lg flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 px-3 py-1 bg-green-500/10 border-b border-l border-green-500/20 rounded-bl-xl text-[10px] font-extrabold text-green-400 uppercase tracking-wider">
                      Access Ready
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white uppercase tracking-tight">{sportName} Pass</h4>
                      <p className="text-xs text-neutral-400 mt-1">1-Hour Prepaid Walk-In Entry</p>

                      <div className="mt-4 flex items-center gap-2 text-xs">
                        <Clock size={13} className="text-amber-400" />
                        <span className="text-neutral-400">Expires in:</span>
                        <span className="font-semibold text-amber-400">{countdownLabel}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      <Link
                        to={`/entry/${sportSlug}`}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a80e27] text-white text-xs font-extrabold text-center transition-colors flex items-center justify-center gap-1.5"
                      >
                        <QrCode size={14} /> Scan QR to Start Session
                      </Link>
                      <button
                        onClick={() => {
                          toast.info(`Sport QR slug: ${sportSlug}`);
                        }}
                        className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-xs font-bold transition-all"
                        title="View Sport QR Slug"
                        type="button"
                      >
                        View QR Slug
                      </button>
                    </div>
                  </motion.div>
                );
              }

              if (pass.accessStatus === 'active') {
                return (
                  <motion.div
                    key={pass._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl bg-[#2a050b]/20 border border-[#C8102E]/30 p-5 shadow-lg flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 px-3 py-1 bg-[#C8102E]/20 border-b border-l border-[#C8102E]/30 rounded-bl-xl text-[10px] font-extrabold text-[#C8102E] uppercase tracking-wider animate-pulse">
                      Active Now
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white uppercase tracking-tight">{sportName} Pass</h4>
                      <p className="text-xs text-neutral-400 mt-1">Session currently active</p>

                      <div className="mt-4 flex items-center gap-2 text-xs">
                        <Clock size={13} className="text-green-400" />
                        <span className="text-neutral-400">Used at:</span>
                        <span className="font-semibold text-neutral-200">
                          {pass.usedAt ? new Date(pass.usedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <Link
                        to="/user/scan"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a80e27] text-white text-xs font-extrabold text-center transition-colors flex items-center justify-center gap-1.5"
                      >
                        <QrCode size={14} /> Scan QR to Check Out
                      </Link>
                    </div>
                  </motion.div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/user/membership">
          <motion.div whileHover={{ scale: 1.02 }} className="ota-card flex items-center gap-4 cursor-pointer p-5 hover:border-white/15 transition-all">
            <Trophy size={28} strokeWidth={1.5} className="text-[#df1526]" />
            <div>
              <h3 className="font-bold text-white">Membership</h3>
              <p className="text-xs text-white/45">View plan, sports & invoices</p>
            </div>
          </motion.div>
        </Link>
        <Link to="/user/food">
          <motion.div whileHover={{ scale: 1.02 }} className="ota-card flex items-center gap-4 cursor-pointer p-5 hover:border-white/15 transition-all">
            <Utensils size={28} strokeWidth={1.5} className="text-[#df1526]" />
            <div>
              <h3 className="font-bold text-white">Order Food</h3>
              <p className="text-xs text-white/45">Browse menu & place orders</p>
            </div>
          </motion.div>
        </Link>
        <Link to="/user/orders">
          <motion.div whileHover={{ scale: 1.02 }} className="ota-card flex items-center gap-4 cursor-pointer p-5 hover:border-white/15 transition-all">
            <Calendar size={28} strokeWidth={1.5} className="text-[#df1526]" />
            <div>
              <h3 className="font-bold text-white">Order History</h3>
              <p className="text-xs text-white/45">{orders?.orders?.length || 0} orders</p>
            </div>
          </motion.div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="ota-card p-6">
        <h3 className="text-sm font-extrabold text-white/70 uppercase tracking-wider mb-4">Recent Food Orders</h3>
        <div className="space-y-2">
          {(!orders?.orders || orders.orders.length === 0) ? (
            <p className="text-sm text-white/45 text-center py-6">No orders yet. Try ordering from the restaurant.</p>
          ) : (
            orders.orders.slice(0, 5).map(order => (
              <div key={order._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/7">
                <div>
                  <p className="text-sm font-medium text-white">{order.orderNumber}</p>
                  <p className="text-xs text-white/40">{order.items?.length} items • {new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatCurrency(order.totalAmount)}</p>
                  <span className={`text-[10px] font-bold uppercase ${
                    order.status === 'delivered' ? 'text-green-600' :
                    order.status === 'cancelled' ? 'text-red-600' : 'text-amber-600'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
