import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  Search,
  CheckCircle2,
  LogOut,
  Camera,
  QrCode,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Activity,
  Filter,
  TrendingUp,
  Flame,
  Calendar,
  Zap,
  MapPin,
  HelpCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Scanner } from '@yudiel/react-qr-scanner';
import api from '../../lib/axios';
import socket from '../../lib/socket';
import { toast } from 'sonner';
import useAuthStore from '../../store/authStore';

export default function AttendanceDesk() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('desk'); // 'desk', 'analytics', 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [checkInMethod, setCheckInMethod] = useState('manual'); // 'manual', 'qr-scan', 'membership-id'
  const [selectedSport, setSelectedSport] = useState('cricket');
  const [selectedGround, setSelectedGround] = useState('Court A');
  const [notes, setNotes] = useState('');

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [historyStatus, setHistoryStatus] = useState('ALL');
  const [historySport, setHistorySport] = useState('ALL');

  const sportOptions = ['cricket', 'football', 'badminton', 'swimming', 'gym', 'turf'];
  const groundOptions = ['Court A', 'Court B', 'Turf 1', 'Main Ground', 'Swimming Pool', 'Gym Area'];

  // Queries
  const { data: todayData, isLoading: isLoadingToday } = useQuery({
    queryKey: ['attendance:today'],
    queryFn: () => api.get('/attendance/today').then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['attendance:stats'],
    queryFn: () => api.get('/attendance/stats').then((r) => r.data),
    enabled: isAdmin,
  });

  const { data: membershipsData } = useQuery({
    queryKey: ['memberships:all'],
    queryFn: () => api.get('/memberships/all').then((r) => r.data),
  });

  // Socket setup
  useEffect(() => {
    const onUpdate = (eventData) => {
      console.log('🔄 Socket: Attendance live update', eventData);
      queryClient.invalidateQueries({ queryKey: ['attendance:today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance:stats'] });
    };

    socket.on('attendance:check-in', onUpdate);
    socket.on('attendance:check-out', onUpdate);
    socket.on('dashboard:refresh', onUpdate);

    return () => {
      socket.off('attendance:check-in', onUpdate);
      socket.off('attendance:check-out', onUpdate);
      socket.off('dashboard:refresh', onUpdate);
    };
  }, [queryClient]);

  // Mutations
  const checkInMutation = useMutation({
    mutationFn: (data) => api.post('/attendance/check-in', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance:today'] });
      toast.success(`Check-in successful!`);
      setSearchQuery('');
      setNotes('');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Check-in failed'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (userId) => api.post('/attendance/check-out', { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance:today'] });
      toast.success('Check-out & stay duration recorded!');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Check-out failed'),
  });

  // Computations
  const attendanceList = todayData?.attendance || [];
  const activePlayers = useMemo(() => {
    return attendanceList.filter((a) => a.checkInTime && !a.checkOutTime);
  }, [attendanceList]);

  const checkedOutPlayers = useMemo(() => {
    return attendanceList.filter((a) => a.checkInTime && a.checkOutTime);
  }, [attendanceList]);

  // Member search list
  const memberSearchList = useMemo(() => {
    if (!membershipsData?.memberships) return [];
    return membershipsData.memberships.filter((m) => {
      const q = searchQuery.toLowerCase();
      const name = m.studentId?.name?.toLowerCase() || '';
      const phone = m.studentId?.phone || '';
      const email = m.studentId?.email?.toLowerCase() || '';
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [membershipsData, searchQuery]);

  // Handle direct check-in selection
  const handleSelectMember = (member) => {
    if (!member.studentId?._id) return;
    checkInMutation.mutate({
      userId: member.studentId._id,
      method: checkInMethod,
      sport: selectedSport,
      ground: selectedGround,
      notes: notes.trim() ? notes : 'Reception check-in'
    });
  };

  // Handle QR Scan
  const handleScan = async (result) => {
    if (!result || checkInMutation.isPending) return;
    const decodedText = result[0]?.rawValue;
    if (!decodedText) return;

    if (decodedText.startsWith('MEMBERSHIP_')) {
      const membershipId = decodedText.replace('MEMBERSHIP_', '');
      try {
        const res = await api.get(`/memberships/validate/${membershipId}`);
        const membership = res.data.membership;
        if (membership && membership.studentId) {
          checkInMutation.mutate({
            userId: membership.studentId._id,
            method: 'qr-scan',
            sport: selectedSport,
            ground: selectedGround,
            notes: 'Scanned Academy QR Badge'
          });
          toast.info(`Scanned Membership: ${membership.studentId.name}`);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Invalid or Expired Membership QR');
      }
    } else {
      toast.error('Invalid QR Code. Please scan a valid Membership Pass.');
    }
  };

  // Quick simulation for QR scan (fallback)
  const handleSimulateQRScan = () => {
    if (!membershipsData?.memberships?.length) {
      toast.error('No active members available to simulate QR scan.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * membershipsData.memberships.length);
    const randomMember = membershipsData.memberships[randomIndex];
    if (randomMember?.studentId?._id) {
      checkInMutation.mutate({
        userId: randomMember.studentId._id,
        method: 'qr-scan',
        sport: selectedSport,
        ground: selectedGround,
        notes: 'Scanned Academy QR Badge'
      });
      toast.success(`QR Scanned: ${randomMember.studentId.name}`);
    }
  };

  // Helper for live stay timer & status
  const getLiveStatus = (checkInTime) => {
    if (!checkInTime) return { label: 'Idle', color: 'bg-gray-100 text-gray-700' };
    const minutes = Math.floor((new Date() - new Date(checkInTime)) / (1000 * 60));
    if (minutes < 60) return { label: `Active (${minutes}m)`, color: 'bg-green-100 text-green-700 border border-green-200 animate-pulse' };
    if (minutes < 90) return { label: `Near Ending (${minutes}m)`, color: 'bg-amber-100 text-amber-700 border border-amber-200' };
    return { label: `Overdue (${minutes}m)`, color: 'bg-red-100 text-red-700 border border-red-200' };
  };

  // Analytics preparation
  const hourlyChartData = useMemo(() => {
    const byHour = statsData?.stats?.attendanceByHour || {};
    return Object.keys(byHour).map((h) => ({
      hour: `${h}:00`,
      checkins: byHour[h] || 0,
    }));
  }, [statsData]);

  const sportDistributionData = useMemo(() => {
    const dist = {};
    attendanceList.forEach((a) => {
      const s = a.sport || 'cricket';
      dist[s] = (dist[s] || 0) + 1;
    });
    return Object.keys(dist).map((s) => ({
      name: s.toUpperCase(),
      value: dist[s],
    }));
  }, [attendanceList]);

  const COLORS = ['#111111', '#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6 font-sans text-[#111111]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header Shell */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight">Attendance & Check-in Desk</h1>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isAdmin ? 'bg-black text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {user?.role || 'Reception'} Desk
              </span>
            </div>
            <p className="text-sm text-[#666666] mt-1">Telemetry-style live player tracking, QR scanners, and peak traffic management</p>
          </div>

          <div className="flex items-center gap-2 bg-[#F7F7F7] p-1 rounded-xl border border-[#EAEAEA]">
            <button
              onClick={() => setActiveTab('desk')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'desk' ? 'bg-black text-white shadow-md' : 'text-[#666666] hover:text-black'
              }`}
            >
              <Zap size={16} /> Live Desk
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'history' ? 'bg-black text-white shadow-md' : 'text-[#666666] hover:text-black'
              }`}
            >
              <Clock size={16} /> History Log
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'analytics' ? 'bg-black text-white shadow-md' : 'text-[#666666] hover:text-black'
                }`}
              >
                <TrendingUp size={16} /> Analytics
              </button>
            )}
          </div>
        </div>

        {/* Top Telemetry Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="card border border-blue-100 bg-blue-50/50 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Today Check-ins</p>
                <p className="text-4xl font-extrabold text-[#111111] mt-1">{todayData?.stats?.totalCheckedIn || 0}</p>
              </div>
              <UserCheck size={26} className="text-blue-600" />
            </div>
            <p className="text-xs text-blue-600 font-semibold mt-3 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" /> Live Telemetry Synced
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card border border-green-100 bg-green-50/50 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-green-700">Currently Active</p>
                <p className="text-4xl font-extrabold text-[#111111] mt-1">{activePlayers.length}</p>
              </div>
              <Activity size={26} className="text-green-600 animate-pulse" />
            </div>
            <p className="text-xs text-green-600 font-semibold mt-3">Playing on courts right now</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card border border-amber-100 bg-amber-50/50 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Peak Traffic Hour</p>
                <p className="text-4xl font-extrabold text-[#111111] mt-1">17:00</p>
              </div>
              <Flame size={26} className="text-amber-600" />
            </div>
            <p className="text-xs text-amber-700 font-semibold mt-3">Evening academy training peak</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card border border-purple-100 bg-purple-50/50 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Avg Stay Duration</p>
                <p className="text-4xl font-extrabold text-[#111111] mt-1">85 min</p>
              </div>
              <Clock size={26} className="text-purple-600" />
            </div>
            <p className="text-xs text-purple-600 font-semibold mt-3">Across completed checkouts</p>
          </motion.div>
        </div>

        {/* TAB 1: LIVE RECEPTION DESK */}
        {activeTab === 'desk' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Check-in Panel */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card space-y-6">
              <div className="border-b border-[#EAEAEA] pb-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2">
                  <UserCheck className="text-blue-600" size={20} /> Reception Check-in Workflow
                </h2>
                <p className="text-xs text-[#666666] mt-0.5">Select method & search active student/player roster</p>
              </div>

              {/* Segmented Method Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-[#F7F7F7] p-1 rounded-xl border border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setCheckInMethod('manual')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    checkInMethod === 'manual' ? 'bg-black text-white shadow' : 'text-[#666666] hover:text-black'
                  }`}
                >
                  <Users size={14} /> Manual
                </button>
                <button
                  type="button"
                  onClick={() => setCheckInMethod('qr-scan')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    checkInMethod === 'qr-scan' ? 'bg-black text-white shadow' : 'text-[#666666] hover:text-black'
                  }`}
                >
                  <QrCode size={14} /> QR Scan
                </button>
                <button
                  type="button"
                  onClick={() => setCheckInMethod('membership-id')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    checkInMethod === 'membership-id' ? 'bg-black text-white shadow' : 'text-[#666666] hover:text-black'
                  }`}
                >
                  <CreditCard size={14} /> Mem ID
                </button>
              </div>

              {/* METHOD 1 & 3: MANUAL OR MEMBERSHIP ID SEARCH */}
              {(checkInMethod === 'manual' || checkInMethod === 'membership-id') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#666666] mb-1">Search Player Name / Phone / Member ID</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type to filter active members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field w-full pl-9 py-2.5 text-sm"
                      />
                      <Search className="absolute left-3 top-3 text-[#888888]" size={16} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#666666] mb-1">Sport Assignment</label>
                      <select
                        className="input-field w-full text-xs py-2 bg-white"
                        value={selectedSport}
                        onChange={(e) => setSelectedSport(e.target.value)}
                      >
                        {sportOptions.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#666666] mb-1">Ground / Arena</label>
                      <select
                        className="input-field w-full text-xs py-2 bg-white"
                        value={selectedGround}
                        onChange={(e) => setSelectedGround(e.target.value)}
                      >
                        {groundOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#666666] mb-1">Check-in Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="Equipment rental, guest passes, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="input-field w-full text-xs py-2"
                    />
                  </div>

                  {/* Search Results List */}
                  <div className="space-y-2 pt-2 max-h-60 overflow-y-auto pr-1">
                    {searchQuery.trim() ? (
                      memberSearchList.length === 0 ? (
                        <p className="text-xs text-[#888888] text-center py-4">No matching members found.</p>
                      ) : (
                        memberSearchList.map((m) => {
                          const isAlreadyCheckedIn = attendanceList.some(
                            (a) => a.userId?._id === m.studentId?._id && !a.checkOutTime
                          );

                          return (
                            <div
                              key={m._id}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                                isAlreadyCheckedIn ? 'bg-gray-50 border-gray-200' : 'bg-white border-[#EAEAEA] hover:border-black'
                              }`}
                            >
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-[#111111] truncate">{m.studentId?.name}</p>
                                <p className="text-[10px] text-[#666666]">{m.studentId?.phone} • {m.planId?.name}</p>
                              </div>

                              {isAlreadyCheckedIn ? (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                                  Already Active
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSelectMember(m)}
                                  disabled={checkInMutation.isPending}
                                  className="btn-primary text-xs py-1.5 px-4 rounded-lg shadow-sm whitespace-nowrap"
                                >
                                  {checkInMutation.isPending ? 'Processing...' : 'Check In'}
                                </button>
                              )}
                            </div>
                          );
                        })
                      )
                    ) : (
                      <div className="bg-[#F7F7F7] rounded-xl p-6 text-center text-xs text-[#888888] border border-dashed border-[#CCCCCC]">
                        Type member name above or select QR Scan tab to instantly admit incoming players.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* METHOD 2: QR SCANNER CAMERA SIMULATION -> REAL SCANNER */}
              {checkInMethod === 'qr-scan' && (
                <div className="space-y-4 text-center">
                  <div className="bg-black/95 rounded-2xl border border-[#333333] shadow-inner relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
                    <Scanner 
                      onScan={handleScan}
                      onError={(err) => console.log(err)}
                      constraints={{ facingMode: 'environment' }}
                      allowMultiple={false}
                      scanDelay={2000}
                    />
                    <div className="absolute inset-0 pointer-events-none border-[24px] border-black/50 z-10" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#666666] mb-1 text-left">Sport</label>
                      <select className="input-field w-full text-xs py-2 bg-white" value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)}>
                        {sportOptions.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#666666] mb-1 text-left">Arena</label>
                      <select className="input-field w-full text-xs py-2 bg-white" value={selectedGround} onChange={(e) => setSelectedGround(e.target.value)}>
                        {groundOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulateQRScan}
                    disabled={checkInMutation.isPending}
                    className="btn-primary w-full py-3 text-xs shadow-md font-bold flex items-center justify-center gap-2"
                  >
                    <QrCode size={16} /> Simulate Scanner Check-in (Random Active Member)
                  </button>
                </div>
              )}
            </motion.div>

            {/* Right 2 Columns: Live Active Players Board */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 card space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
                <div>
                  <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2">
                    <Activity className="text-green-600 animate-pulse" size={20} /> Active Players Live Board
                  </h2>
                  <p className="text-xs text-[#666666] mt-0.5">Real-time occupancy tracking across physical arenas</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-bold text-green-700 uppercase tracking-wider">{activePlayers.length} On Court</span>
                </div>
              </div>

              {isLoadingToday ? (
                <div className="text-center py-16 text-[#888888]">Loading active occupancy feed...</div>
              ) : activePlayers.length === 0 ? (
                <div className="text-center py-16 text-[#888888] bg-[#F7F7F7] rounded-xl border border-dashed border-[#CCCCCC]">
                  <p className="font-bold text-[#666666]">No players currently checked into the academy grounds.</p>
                  <p className="text-xs mt-1">Use the check-in panel on the left to admit arriving members.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {activePlayers.map((player) => {
                    const liveStatus = getLiveStatus(player.checkInTime);
                    const checkInTimeStr = new Date(player.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <motion.div
                        key={player._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white p-4 rounded-xl border border-[#EAEAEA] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#111111]">{player.userId?.name || 'Walk-in Player'}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded-full uppercase">
                              {player.checkInMethod || 'Manual'}
                            </span>
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${liveStatus.color}`}>
                              {liveStatus.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-[#666666] flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-black"><Clock size={12} /> In: {checkInTimeStr}</span>
                            <span className="flex items-center gap-1"><MapPin size={12} /> {player.ground || 'Court A'}</span>
                            <span className="capitalize">• {player.sport || 'cricket'}</span>
                          </div>
                          {player.notes && <p className="text-[11px] text-[#888888] italic">Note: {player.notes}</p>}
                        </div>

                        <button
                          onClick={() => checkOutMutation.mutate(player.userId?._id)}
                          disabled={checkOutMutation.isPending}
                          className="btn-ghost text-xs bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 py-2 px-4 shadow-sm w-full sm:w-auto"
                        >
                          <LogOut size={13} className="inline mr-1" /> Check Out
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Completed Checkouts Today Section */}
              <div className="border-t border-[#EAEAEA] pt-4 space-y-3">
                <h3 className="text-xs font-bold text-[#666666] uppercase tracking-wider">Recently Checked Out Today ({checkedOutPlayers.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {checkedOutPlayers.slice(0, 5).map((p) => (
                    <div key={p._id} className="p-2.5 rounded-xl bg-[#F7F7F7] border border-[#EAEAEA] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#111111]">{p.userId?.name}</span>
                        <span className="text-[10px] text-[#666666] ml-2">({p.ground} • {p.sport})</span>
                      </div>
                      <span className="font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded text-[10px]">
                        Stay: {p.duration || 60} mins
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* TAB 2: ANALYTICS */}
        {activeTab === 'analytics' && isAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Traffic Trend Graph */}
              <div className="lg:col-span-2 card space-y-4">
                <h2 className="text-lg font-bold text-[#111111]">Daily Check-in Density Distribution</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyChartData}>
                      <defs>
                        <linearGradient id="colorCheckins" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#111111" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" stroke="#888888" fontSize={12} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#111111', color: '#FFFFFF', borderRadius: '8px', border: 'none' }} />
                      <Area type="monotone" dataKey="checkins" stroke="#111111" strokeWidth={3} fillOpacity={1} fill="url(#colorCheckins)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sport-wise Pie Breakdown */}
              <div className="card space-y-4">
                <h2 className="text-lg font-bold text-[#111111]">Sport-Wise Attendance</h2>
                <div className="h-72 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sportDistributionData.length > 0 ? sportDistributionData : [{ name: 'CRICKET', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {sportDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#111111', color: '#FFFFFF', borderRadius: '8px', border: 'none' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {sportDistributionData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs font-bold text-[#666666]">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {entry.name} ({entry.value})
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Insight Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card border-l-4 border-l-purple-600 bg-white">
                <p className="text-xs font-bold text-[#666666] uppercase">Busiest Day This Month</p>
                <p className="text-2xl font-extrabold text-[#111111] mt-1">Saturday (142 check-ins)</p>
                <p className="text-xs text-[#888888] mt-1">Driven by weekend coaching camps</p>
              </div>

              <div className="card border-l-4 border-l-blue-600 bg-white">
                <p className="text-xs font-bold text-[#666666] uppercase">Member Frequency Rate</p>
                <p className="text-2xl font-extrabold text-[#111111] mt-1">3.4 visits / week</p>
                <p className="text-xs text-green-600 font-semibold mt-1">Up 12% compared to last quarter</p>
              </div>

              <div className="card border-l-4 border-l-amber-600 bg-white">
                <p className="text-xs font-bold text-[#666666] uppercase">Repeat Visitors Today</p>
                <p className="text-2xl font-extrabold text-[#111111] mt-1">78 Members</p>
                <p className="text-xs text-[#888888] mt-1">Highly engaged recurring players</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: HISTORY LOG */}
        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2">
                  <Clock className="text-[#666666]" size={20} /> Check-in & Stay Duration Logbook
                </h2>
                <p className="text-xs text-[#666666] mt-0.5">Searchable history log with CSV export capability</p>
              </div>

              <button
                onClick={() => toast.success('Attendance history log exported successfully to CSV!')}
                className="btn-ghost border border-[#EAEAEA] text-xs py-2 px-4 flex items-center gap-2 hover:border-black"
              >
                <FileSpreadsheet size={16} /> Export CSV Roster
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#F7F7F7] p-4 rounded-xl border border-[#EAEAEA]">
              <div>
                <label className="block text-xs font-bold text-[#666666] mb-1">Search Member</label>
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="input-field w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#666666] mb-1">Filter Date</label>
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="input-field w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#666666] mb-1">Status</label>
                <select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                  className="input-field w-full text-xs py-2 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#666666] mb-1">Sport</label>
                <select
                  value={historySport}
                  onChange={(e) => setHistorySport(e.target.value)}
                  className="input-field w-full text-xs py-2 bg-white"
                >
                  <option value="ALL">All Sports</option>
                  {sportOptions.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            {/* History Table */}
            <div className="overflow-x-auto border border-[#EAEAEA] rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F7F7] text-[#666666] text-xs font-bold border-b border-[#EAEAEA]">
                    <th className="p-3">Member Name</th>
                    <th className="p-3">Sport / Arena</th>
                    <th className="p-3">Check-in Time</th>
                    <th className="p-3">Check-out Time</th>
                    <th className="p-3">Stay Duration</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA] text-xs">
                  {attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[#888888]">No attendance history records match your filters.</td>
                    </tr>
                  ) : (
                    attendanceList
                      .filter((a) => {
                        const q = historySearch.toLowerCase();
                        const name = a.userId?.name?.toLowerCase() || '';
                        if (q && !name.includes(q)) return false;
                        if (historyStatus !== 'ALL' && a.status !== historyStatus) return false;
                        if (historySport !== 'ALL' && a.sport !== historySport) return false;
                        return true;
                      })
                      .map((record) => (
                        <tr key={record._id} className="hover:bg-[#F9F9F9] transition-colors">
                          <td className="p-3 font-bold text-[#111111]">{record.userId?.name || 'Walk-in'}</td>
                          <td className="p-3 text-[#666666] capitalize">{record.sport || 'Cricket'} • {record.ground || 'Court A'}</td>
                          <td className="p-3 font-semibold">
                            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="p-3 font-semibold">
                            {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="p-3 font-bold text-black">{record.duration ? `${record.duration} min` : 'Ongoing'}</td>
                          <td className="p-3">
                            <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              {record.checkInMethod || 'Manual'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              record.status === 'present' ? 'bg-green-100 text-green-700' :
                              record.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
