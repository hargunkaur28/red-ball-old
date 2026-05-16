import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/axios';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { 
  Search, 
  Calendar, 
  Filter, 
  Clock, 
  User, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ChefHat,
  ArrowRight,
  Eye,
  Download,
  Utensils
} from 'lucide-react';
import socket from '../../lib/socket';

export default function RestaurantOrders() {
  const queryClient = useQueryClient();
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filterDate, setFilterDate] = useState(getLocalDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch Orders
  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-orders-history', filterDate, statusFilter],
    queryFn: () => api.get(`/orders?date=${filterDate}&status=${statusFilter === 'all' ? '' : statusFilter}`).then(r => r.data),
  });

  // Socket listener for live updates
  useEffect(() => {
    socket.on('order:status-update', () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders-history'] });
    });
    socket.on('order:new', () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders-history'] });
      toast.info('New order received!');
    });
    return () => {
      socket.off('order:status-update');
      socket.off('order:new');
    };
  }, [queryClient]);

  const orders = data?.orders || [];

  const filteredOrders = orders.filter(o => {
    // Only show cash orders or paid online orders
    const isValidPayment = o.paymentMethod === 'cash' || o.paymentStatus === 'paid';
    if (!isValidPayment) return false;

    const query = searchQuery.toLowerCase();
    return (
      o._id.toLowerCase().includes(query) ||
      o.customerName?.toLowerCase().includes(query) ||
      o.tableId?.label?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-gray-100 text-gray-700 border-gray-200',
      preparing: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
      ready: 'bg-blue-50 text-blue-700 border-blue-200',
      delivered: 'bg-green-50 text-green-700 border-green-200',
      cancelled: 'bg-red-50 text-red-700 border-red-200',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.new}`}>
        {status}
      </span>
    );
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders-history'] });
      toast.success('Order status updated');
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Restaurant Order History" 
        subtitle="Manage and track every order across all academy tables"
      />

      {/* Filters & Stats Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Order ID, Table or Customer..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="date" 
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm appearance-none bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready / Served</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500">Order ID</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500">Time & Table</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500">Customer</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500">Items</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500">Status</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500 text-right">Amount</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-4"><div className="h-10 bg-gray-100 rounded-lg w-full" /></td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400 italic text-sm">
                    No orders found for this date and filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-black group-hover:text-white transition-colors">
                          <Receipt size={14} />
                        </div>
                        <span className="text-xs font-mono font-bold">#{order._id.slice(-6).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Clock size={12} className="text-gray-400" />
                          <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-black font-black uppercase tracking-tighter">
                          <Utensils size={10} className="text-[#C8102E]" />
                          <span>{order.tableId?.label || 'T-Unknown'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                          {order.customerName?.slice(0, 2).toUpperCase() || 'GU'}
                        </div>
                        <div className="text-xs">
                          <p className="font-bold">{order.customerName || 'Guest Table User'}</p>
                          <p className="text-[10px] text-gray-400">{order.customerPhone || 'No contact'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 max-w-[200px] truncate">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-xs font-bold">{formatCurrency(order.totalAmount)}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{order.paymentMethod}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          title="View Details"
                          className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-black hover:text-white transition-all"
                        >
                          <Eye size={14} />
                        </button>
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => updateStatusMutation.mutate({ id: order._id, status: 'delivered' })}
                              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all"
                              title="Mark Delivered"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button 
                              onClick={() => updateStatusMutation.mutate({ id: order._id, status: 'cancelled' })}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                              title="Cancel Order"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium">
            Showing {filteredOrders.length} orders for {new Date(filterDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <button className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-black">
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-black text-lg">Order #{selectedOrder._id.slice(-6).toUpperCase()}</h3>
                <p className="text-xs text-gray-500 font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
              >
                <XCircle size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Customer & Table */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Customer</p>
                  <p className="text-sm font-bold">{selectedOrder.customerName || 'Guest User'}</p>
                  <p className="text-xs text-gray-500">{selectedOrder.customerPhone || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Table</p>
                  <p className="text-sm font-bold text-[#C8102E]">{selectedOrder.tableId?.label || 'Takeaway'}</p>
                  <p className="text-xs text-gray-500">{selectedOrder.tableId?.section || 'Main'}</p>
                </div>
              </div>

              {/* Status & Payment */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Order Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Payment</p>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${selectedOrder.paymentStatus === 'paid' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <span className="text-xs font-bold uppercase">{selectedOrder.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Order Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-sm font-bold"><span className="text-[#C8102E] mr-1">{item.quantity}x</span> {item.name}</p>
                        {item.size && item.size !== 'Regular' && <p className="text-xs text-gray-500">Size: {item.size}</p>}
                        {item.kitchenNote && <p className="text-xs italic text-amber-600 mt-1">Note: {item.kitchenNote}</p>}
                      </div>
                      <p className="font-mono text-sm font-bold">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {selectedOrder.specialInstructions && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-[10px] uppercase font-black text-amber-800 mb-1">Special Instructions</p>
                  <p className="text-sm text-amber-900 italic">{selectedOrder.specialInstructions}</p>
                </div>
              )}
            </div>

            {/* Total Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-black text-gray-500 uppercase tracking-widest">Grand Total</span>
              <span className="text-xl font-mono font-black text-[#C8102E]">{formatCurrency(selectedOrder.totalAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
