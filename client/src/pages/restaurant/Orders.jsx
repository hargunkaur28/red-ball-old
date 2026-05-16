import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/axios';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { Clock, ChefHat, CheckCircle, Truck, X, AlertTriangle, DollarSign, FileText, User, Phone, LayoutGrid, List } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');

const statusConfig = {
  new: { label: 'New Orders', color: 'border-blue-500 bg-blue-50/40', headerBg: 'bg-blue-600 text-white', icon: <Clock size={18} /> },
  preparing: { label: 'Preparing', color: 'border-amber-500 bg-amber-50/40', headerBg: 'bg-amber-500 text-black', icon: <ChefHat size={18} /> },
  ready: { label: 'Ready for Table', color: 'border-green-500 bg-green-50/40', headerBg: 'bg-green-600 text-white', icon: <CheckCircle size={18} /> },
  delivered: { label: 'Delivered / Closed', color: 'border-gray-300 bg-gray-50/40', headerBg: 'bg-gray-700 text-white', icon: <Truck size={18} /> },
};

const getTimeAgo = (mins) => {
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
};

export default function RestaurantOrders() {
  const qc = useQueryClient();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [viewMode, setViewMode] = useState('card');

  // Refetch timer every minute for live elapsed order duration tracking
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const { data } = useQuery({
    queryKey: ['restaurant-orders'],
    queryFn: () => api.get('/orders').then(r => r.data),
    refetchInterval: 10000,
  });

  // Socket.io Subscriptions & Audio Alert
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.emit('join-managers');

    socket.on('order:new', (payload) => {
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
      
      // Play Audio Oscillator Beep Notification
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch A5 alert note
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) { console.log('Audio autoplay blocked'); }

      const tableLbl = payload?.order?.tableId?.label || 'a Table';
      toast.success(`🔔 Incoming Order from ${tableLbl}!`, {
        description: 'Check New Orders column immediately.'
      });
    });

    socket.on('order:updated', () => qc.invalidateQueries({ queryKey: ['restaurant-orders'] }));
    socket.on('order:cancelled', () => qc.invalidateQueries({ queryKey: ['restaurant-orders'] }));
    socket.on('dashboard:refresh', () => qc.invalidateQueries({ queryKey: ['restaurant-orders'] }));

    return () => socket.disconnect();
  }, [qc]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status, paymentStatus }) => api.put(`/orders/${id}/status`, { status, paymentStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
      toast.success('Order status updated successfully!');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/orders/${id}/cancel`, { reason, refund: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
      toast.success('Order cancelled');
    },
  });

  const rawOrders = data?.orders || [];
  const orders = rawOrders.filter(o => o.paymentMethod === 'cash' || o.paymentStatus === 'paid');
  const kanbanColumns = ['new', 'preparing', 'ready', 'delivered'];
  const nextStatus = { new: 'preparing', preparing: 'ready', ready: 'delivered' };
  const actionLabels = { new: '✓ Accept & Start Prep', preparing: '🍽️ Mark Ready for Table', ready: '🚚 Handover / Delivered' };

  return (
    <div className="pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <PageHeader
          title="Live Kitchen Orders"
          subtitle={`${orders.filter(o => o.status === 'new').length} New • ${orders.filter(o => o.status === 'preparing').length} Preparing • ${orders.filter(o => o.status === 'ready').length} Ready`}
        />
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'card' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid size={16} />
            Card View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'list' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List size={16} />
            List View
          </button>
        </div>
      </div>

      {viewMode === 'card' ? (
        /* Kanban Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          {kanbanColumns.map(status => {
            const config = statusConfig[status];
            const columnOrders = orders.filter(o => o.status === status);

            return (
              <div key={status} className={`rounded-3xl border-2 ${config.color} shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px]`}>
                {/* Column Header Bar */}
                <div className={`p-4 ${config.headerBg} flex items-center justify-between shadow-md shrink-0`}>
                  <div className="flex items-center gap-2 font-black tracking-wide uppercase text-sm">
                    {config.icon}
                    <span>{config.label}</span>
                  </div>
                  <span className="text-xs font-black px-3 py-1 bg-black/30 rounded-full text-white">
                    {columnOrders.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-4 flex-1 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                  {columnOrders.length === 0 && (
                    <div className="text-center py-16 text-gray-400 font-medium text-xs">
                      No active orders
                    </div>
                  )}
                  
                  <AnimatePresence>
                    {columnOrders.map((order, index) => {
                      // Elapsed Time Calculation
                      const orderTimeMs = new Date(order.createdAt).getTime();
                      const diffMins = Math.max(0, Math.floor((currentTime - orderTimeMs) / 60000));
                      
                      const isManualPending = order.paymentMethod === 'cash' && order.paymentStatus === 'pending';

                      return (
                        <motion.div
                          key={order._id}
                          initial={{ opacity: 0, scale: 0.95, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2, delay: index * 0.04 }}
                          className={`bg-white rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all ${
                            status === 'new' ? 'border-l-8 border-l-blue-600' : ''
                          } ${status === 'preparing' ? 'border-l-8 border-l-amber-500' : ''} ${
                            status === 'ready' ? 'border-l-8 border-l-green-600' : ''
                          }`}
                        >
                          <div>
                            {/* Order ID & Elapsed Time Badge */}
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                              <span className="font-mono font-black text-xs text-black">
                                {order.orderNumber}
                              </span>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                diffMins > 25 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                ⏱️ {getTimeAgo(diffMins)}
                              </span>
                            </div>

                            {/* Table Info & Customer Name */}
                            <div className="mb-3 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-extrabold text-[#C8102E]">
                                  📍 {order.tableId?.label || `Table #${order.tableId?.tableNumber || 'Takeaway'}`}
                                </span>
                                <span className="text-xs text-gray-500 font-semibold">
                                  {order.tableId?.section || 'Indoor'}
                                </span>
                              </div>
                              {(order.customerName || order.customerId?.name) && (
                                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1 font-medium">
                                  <User size={12} />
                                  <span>{order.customerName || order.customerId?.name}</span>
                                  {order.customerPhone && <span>({order.customerPhone})</span>}
                                </p>
                              )}
                            </div>

                            {/* Payment Pending Alert / Collection Reminder */}
                            {isManualPending && (
                              <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-2 text-xs text-red-700 animate-pulse flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <DollarSign size={16} />
                                  <span>Collect Payment from Table</span>
                                </div>
                                <button
                                  onClick={() => updateMutation.mutate({ id: order._id, paymentStatus: 'paid' })}
                                  className="px-2.5 py-1 bg-[#C8102E] text-white rounded-lg text-[10px] font-black tracking-wider uppercase shadow hover:bg-[#A00D24] transition-all"
                                >
                                  Mark Paid
                                </button>
                              </div>
                            )}

                            {!isManualPending && (
                              <div className="mb-3 bg-green-50 border border-green-200 rounded-xl p-1.5 text-[11px] text-green-700 font-extrabold flex items-center gap-1">
                                <CheckCircle size={14} />
                                <span className="uppercase tracking-wider">Paid via {order.paymentMethod}</span>
                              </div>
                            )}

                            {/* Special Kitchen Instructions */}
                            {order.specialInstructions && (
                              <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs text-amber-900 font-medium shadow-sm">
                                <div className="flex items-center gap-1 font-bold text-amber-800 mb-0.5">
                                  <FileText size={14} />
                                  <span>Customer Instructions:</span>
                                </div>
                                <p className="italic">{order.specialInstructions}</p>
                              </div>
                            )}

                            {/* Items Ordered List */}
                            <div className="space-y-1.5 mb-4 border-t border-gray-100 pt-2">
                              {order.items?.map((item, j) => (
                                <div key={j} className="flex justify-between items-start text-xs font-semibold text-black">
                                  <div className="flex-1 pr-2">
                                    <span className="font-extrabold text-[#C8102E]">{item.quantity}×</span> {item.name} {item.size && item.size !== 'Regular' ? `(${item.size})` : ''}
                                    {item.kitchenNote && (
                                      <p className="text-[10px] text-gray-500 italic mt-0.5">Note: {item.kitchenNote}</p>
                                    )}
                                  </div>
                                  <span className="font-mono text-gray-600 font-normal">{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            {/* Grand Total */}
                            <div className="flex justify-between items-center text-sm font-extrabold border-t border-gray-100 pt-3 mb-3 text-black">
                              <span>Bill Total</span>
                              <span className="font-mono text-[#C8102E] text-base">{formatCurrency(order.totalAmount)}</span>
                            </div>

                            {/* Status Actions */}
                            {status !== 'delivered' && (
                              <div className="flex gap-2">
                                {nextStatus[status] && (
                                  <button
                                    onClick={() => updateMutation.mutate({ id: order._id, status: nextStatus[status] })}
                                    className={`flex-1 py-3 rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 ${
                                      status === 'new' 
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                        : status === 'preparing' 
                                        ? 'bg-[#F5A623] hover:bg-[#E09410] text-black font-black' 
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                                  >
                                    <span>{actionLabels[status]}</span>
                                  </button>
                                )}
                                {status === 'new' && (
                                  <button
                                    onClick={() => cancelMutation.mutate({ id: order._id, reason: 'Rejected by kitchen' })}
                                    className="px-3 py-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 font-bold transition-all flex items-center justify-center"
                                    title="Reject Order"
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden border border-gray-100 shadow-sm mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500">Time & Table</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500">Customer</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500">Items</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500">Status</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500">Amount & Payment</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic text-sm">
                      No live orders.
                    </td>
                  </tr>
                ) : (
                  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => {
                    const orderTimeMs = new Date(order.createdAt).getTime();
                    const diffMins = Math.max(0, Math.floor((currentTime - orderTimeMs) / 60000));
                    const isManualPending = order.paymentMethod === 'cash' && order.paymentStatus === 'pending';
                    const sConf = statusConfig[order.status];

                    return (
                      <tr key={order._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-full">{order.orderNumber}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${diffMins > 25 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                ⏱️ {getTimeAgo(diffMins)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-black font-black uppercase tracking-tighter">
                              <span className="text-[#C8102E]">📍</span>
                              <span>{order.tableId?.label || `Table #${order.tableId?.tableNumber || 'Takeaway'}`}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                              {(order.customerName || order.customerId?.name || 'GU').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="text-xs">
                              <p className="font-bold">{order.customerName || order.customerId?.name || 'Guest User'}</p>
                              <p className="text-[10px] text-gray-400">{order.customerPhone || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-800 space-y-1 max-w-[250px]">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start gap-4">
                                <span><span className="font-extrabold text-[#C8102E]">{item.quantity}×</span> {item.name} {item.size && item.size !== 'Regular' && `(${item.size})`}</span>
                              </div>
                            ))}
                            {order.specialInstructions && (
                              <p className="text-[10px] text-amber-700 italic mt-1 bg-amber-50 p-1 rounded">Inst: {order.specialInstructions}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${sConf?.color || 'bg-gray-100'} shadow-sm`}>
                            {sConf?.icon}
                            <span className="text-[10px] font-black uppercase tracking-wider">{sConf?.label || order.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-extrabold font-mono">{formatCurrency(order.totalAmount)}</p>
                            {isManualPending ? (
                              <div className="inline-flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse border border-amber-200">Pending (Cash)</span>
                                <button 
                                  onClick={() => updateMutation.mutate({ id: order._id, paymentStatus: 'paid' })}
                                  className="text-[10px] font-bold text-white bg-[#C8102E] hover:bg-[#A00D24] px-2 py-1 rounded shadow"
                                >
                                  Mark Paid
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                <CheckCircle size={10} className="mr-1 inline" /> Paid ({order.paymentMethod})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {order.status !== 'delivered' && (
                            <div className="flex items-center justify-center gap-2">
                              {nextStatus[order.status] && (
                                <button
                                  onClick={() => updateMutation.mutate({ id: order._id, status: nextStatus[order.status] })}
                                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                    order.status === 'new' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                                    order.status === 'preparing' ? 'bg-[#F5A623] hover:bg-[#E09410] text-black' :
                                    'bg-green-600 hover:bg-green-700 text-white'
                                  }`}
                                >
                                  {actionLabels[order.status].replace(/[^a-zA-Z\s]/g, '').trim()}
                                </button>
                              )}
                              {order.status === 'new' && (
                                <button
                                  onClick={() => cancelMutation.mutate({ id: order._id, reason: 'Rejected by kitchen' })}
                                  className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all border border-red-100"
                                  title="Reject Order"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
