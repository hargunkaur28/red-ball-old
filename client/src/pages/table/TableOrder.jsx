import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/axios';
import useCartStore from '../../store/cartStore';
import { formatCurrency, calcGST } from '../../lib/utils';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { Clock, Flame, CheckCircle, AlertCircle, ShoppingBag, X, Plus, User, Phone, FileText, Sparkles, ArrowRight, ArrowLeft, ChefHat, CheckCircle2 } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');
const CATEGORIES = ['All', 'Featured', 'Protein Meals', 'Drinks', 'Recovery Shakes', 'Snacks', 'Healthy Bowls', 'Recovery Combos', 'High Carb Meals', 'Vegetarian'];

// Initial Premium Sports Café Dishes (Exact match with homepage showcase + additions)
const initialCatalog = [
  {
    _id: 'dish-1',
    name: 'Whey Protein Isolate Shake',
    category: 'Recovery Shakes',
    price: 249,
    calories: 210,
    protein: 28,
    preparationTime: 5,
    featured: true,
    chefRecommended: true,
    isVeg: true,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=800&auto=format&fit=crop',
    description: 'Pure grass-fed isolate blended with raw cocoa, banana, and almond milk for rapid post-game muscle recovery.',
    tags: '28g Protein • 210 kcal'
  },
  {
    _id: 'dish-2',
    name: 'Grilled Chicken Avocado Wrap',
    category: 'Protein Meals',
    price: 299,
    calories: 420,
    protein: 32,
    preparationTime: 12,
    featured: true,
    chefRecommended: true,
    isVeg: false,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?q=80&w=800&auto=format&fit=crop',
    description: 'Tender seasoned chicken breast, fresh avocado guacamole, and crisp iceberg folded in a toasted multigrain wrap.',
    tags: '32g Protein • 420 kcal'
  },
  {
    _id: 'dish-3',
    name: 'Gourmet Pesto Grilled Sandwich',
    category: 'Snacks',
    price: 219,
    calories: 380,
    protein: 14,
    preparationTime: 10,
    featured: true,
    chefRecommended: false,
    isVeg: true,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=800&auto=format&fit=crop',
    description: 'Thick sourdough toast packed with fresh basil pesto, chargrilled peppers, zucchini, and stringy low-fat mozzarella.',
    tags: '14g Protein • 380 kcal'
  },
  {
    _id: 'dish-4',
    name: 'Hydration Electrolyte Elixir',
    category: 'Drinks',
    price: 149,
    calories: 45,
    protein: 0,
    preparationTime: 5,
    featured: true,
    chefRecommended: false,
    isVeg: true,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=800&auto=format&fit=crop',
    description: 'Chilled pink Himalayan salt, pure organic coconut water, fresh lime, and essential trace minerals to stop cramps.',
    tags: '0g Protein • 45 kcal'
  },
  {
    _id: 'dish-5',
    name: 'Superfood Quinoa Energy Bowl',
    category: 'Healthy Bowls',
    price: 349,
    calories: 450,
    protein: 18,
    preparationTime: 15,
    featured: true,
    chefRecommended: true,
    isVeg: true,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop',
    description: 'Protein-rich tri-color quinoa, spiced sweet potato, steamed edamame, and toasted flax seeds in citrus vinaigrette.',
    tags: '18g Protein • 450 kcal'
  },
  {
    _id: 'dish-6',
    name: 'Wholewheat Protein Pasta',
    category: 'High Carb Meals',
    price: 379,
    calories: 520,
    protein: 26,
    preparationTime: 18,
    featured: true,
    chefRecommended: false,
    isVeg: true,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop',
    description: 'High-fiber durum wheat pasta cooked perfectly in authentic arrabbiata tomato-herb reduction with paneer cubes.',
    tags: '26g Protein • 520 kcal'
  },
  {
    _id: 'dish-7',
    name: 'Peanut Butter Banana Smoothie',
    category: 'Recovery Shakes',
    price: 199,
    calories: 320,
    protein: 24,
    preparationTime: 5,
    featured: false,
    chefRecommended: true,
    isVeg: true,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop',
    description: 'Creamy high-protein organic peanut butter, ripe bananas, Greek yogurt, and cinnamon blended smooth.',
    tags: '24g Protein • 320 kcal'
  },
  {
    _id: 'dish-8',
    name: 'Chicken Rice Performance Meal',
    category: 'Protein Meals',
    price: 399,
    calories: 580,
    protein: 42,
    preparationTime: 15,
    featured: false,
    chefRecommended: true,
    isVeg: false,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop',
    description: 'Herb-grilled lean chicken breast served over steamed brown rice and sautéed broccoli florets.',
    tags: '42g Protein • 580 kcal'
  }
];

export default function TableOrder() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { items, addItem, updateQuantity, getSubtotal, getItemCount, clearCart, setTableId } = useCartStore();
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' (Pay at table) vs 'online' (Razorpay/UPI)

  useEffect(() => { setTableId(tableId); }, [tableId, setTableId]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // Socket.io Realtime Menu & Orders Synchronization
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socket.on('menu:updated', () => {
      qc.invalidateQueries({ queryKey: ['menu'] });
      toast('🔄 Live Menu Synced', { description: 'Dishes and availability updated in real-time.' });
    });
    socket.on('order:updated', () => {
      qc.invalidateQueries({ queryKey: ['table-orders', tableId] });
    });
    socket.on('order:status', () => {
      qc.invalidateQueries({ queryKey: ['table-orders', tableId] });
    });
    socket.on('order:status-update', () => {
      qc.invalidateQueries({ queryKey: ['table-orders', tableId] });
    });
    return () => socket.disconnect();
  }, [qc, tableId]);

  // Fetch Table Details
  const { data: tableData } = useQuery({ 
    queryKey: ['table-public', tableId], 
    queryFn: () => api.get(`/tables/${tableId}/public`).then(r => r.data),
    retry: false
  });

  // Fetch Live Table Orders
  const { data: tableOrdersData } = useQuery({
    queryKey: ['table-orders', tableId],
    queryFn: () => api.get(`/orders/table/${tableId}`).then(r => r.data),
    enabled: ordersOpen || !!orderPlaced,
    refetchInterval: ordersOpen ? 3000 : false,
  });

  // Fetch Live Menu Items from backend API
  const { data: menuData } = useQuery({ 
    queryKey: ['menu'], 
    queryFn: () => api.get('/menu').then(r => r.data) 
  });

  const placeOrder = async () => {
    if (items.length === 0) return toast.error('Your order cart is empty!');
    setLoading(true);

    try {
      const orderItems = items.map(i => ({ 
        menuItemId: i.menuItemId, 
        name: i.name, 
        size: i.size || 'Regular', 
        quantity: i.quantity, 
        price: i.price, 
        kitchenNote: i.kitchenNote 
      }));

      const isOnline = paymentMethod === 'online';

      const res = await api.post('/orders/table-order', { 
        tableId, 
        items: orderItems,
        customerName: customerName || 'Guest Table User',
        customerPhone: customerPhone || 'N/A',
        paymentMethod: isOnline ? 'online' : 'cash',
        paymentStatus: 'pending',
        specialInstructions
      });

      const newOrder = res.data.order;

      if (isOnline) {
        if (!scriptLoaded || !window.Razorpay) {
          toast.error('Payment gateway loading... Please try again.');
          setLoading(false);
          return;
        }

        const payRes = await api.post('/payments/create-order', {
          amount: getSubtotal(),
          gstPercent: 5,
          type: 'restaurant',
          studentId: null,
          referenceId: newOrder._id,
          customerName: customerName || `Table ${tableData?.table?.label || tableId}`,
          description: `Table Order #${newOrder._id.slice(-6).toUpperCase()}`,
        });

        const rzpData = payRes.data;

        const options = {
          key: rzpData.keyId,
          order_id: rzpData.razorpayOrder.id,
          amount: rzpData.razorpayOrder.amount,
          currency: rzpData.razorpayOrder.currency,
          name: 'Red Ball Sports CAFÉ',
          description: `Digital Menu Order • Table ${tableData?.table?.label || tableId}`,
          theme: { color: '#C8102E' },
          handler: async (response) => {
            try {
              await api.post('/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              toast.success('Payment successful via Razorpay! Order sent to kitchen. 🚀');
              clearCart();
              setCartOpen(false);
              setOrderPlaced({ ...newOrder, paymentStatus: 'paid' });
              qc.invalidateQueries({ queryKey: ['table-orders', tableId] });
            } catch (err) {
              toast.error('Payment verification failed.');
            }
          },
          modal: {
            ondismiss: async () => {
              toast.error('Payment cancelled. Please try again or switch to Pay at Table.');
              setLoading(false);
              try { 
                await api.put(`/orders/${newOrder._id}/cancel`, { reason: 'User abandoned online payment', refund: false }); 
              } catch (e) {}
              qc.invalidateQueries({ queryKey: ['table-orders', tableId] });
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        clearCart();
        setCartOpen(false);
        setOrderPlaced(newOrder);
        toast.success('Order sent to kitchen! Please pay at table. 🍽️');
        qc.invalidateQueries({ queryKey: ['table-orders', tableId] });
      }
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to place order'); 
    } finally { 
      setLoading(false); 
    }
  };

  const gst = calcGST(getSubtotal(), 5);

  // Use backend dishes if present, otherwise instantly fallback to initialCatalog
  const apiItems = menuData?.items || [];
  const allDishes = apiItems.length > 0 ? apiItems.map((item, index) => {
    const fallback = initialCatalog[index % initialCatalog.length];
    return {
      ...item,
      image: item.image || fallback.image,
      calories: item.calories || fallback.calories,
      protein: item.protein || fallback.protein,
      preparationTime: item.preparationTime || fallback.preparationTime,
      category: item.category || fallback.category,
      featured: item.featured ?? fallback.featured,
      chefRecommended: item.chefRecommended ?? fallback.chefRecommended,
      description: item.description || fallback.description
    };
  }) : initialCatalog;

  // Separate Featured Items for the Hero Section
  const featuredItems = allDishes.filter(i => i.featured);
  const filteredDishes = activeCategory === 'All' ? allDishes : allDishes.filter(i => i.category === activeCategory || (activeCategory === 'Featured' && i.featured));

  // Success Confirmation Screen
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col items-center justify-center p-6 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="bg-[#161616] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8102E]/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle2 size={44} />
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-wide text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            ORDER SENT TO KITCHEN!
          </h1>
          <p className="text-[#9CA3AF] text-xs mb-6 leading-relaxed">
            Your masterfully prepared recovery meal is queued for real-time preparation.
          </p>
          
          <div className="bg-black/50 rounded-2xl p-4 mb-6 border border-white/5 text-left text-xs space-y-2">
            <div className="flex justify-between text-[#888]">
              <span>Order ID</span>
              <span className="font-mono text-white font-bold">{orderPlaced.orderNumber}</span>
            </div>
            <div className="flex justify-between text-[#888]">
              <span>Table Service</span>
              <span className="text-[#F5A623] font-bold">{tableData?.table?.label || 'Dine-In Lounge'}</span>
            </div>
            <div className="flex justify-between text-[#888]">
              <span>Payment Mode</span>
              <span className="capitalize text-white font-bold">
                {orderPlaced.paymentMethod} ({orderPlaced.paymentStatus})
              </span>
            </div>
            <div className="border-t border-white/10 pt-2 mt-2 space-y-1">
              {orderPlaced.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between font-medium">
                  <span>{item.quantity}× {item.name}</span>
                  <span className="font-mono text-[#F5A623]">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-2 mt-2 flex justify-between text-sm font-bold text-white">
              <span>Grand Total</span>
              <span className="text-[#C8102E] font-mono">{formatCurrency(orderPlaced.totalAmount)}</span>
            </div>
          </div>

          <button 
            onClick={() => setOrderPlaced(null)} 
            className="w-full py-4 rounded-full bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg hover:scale-[1.02]"
          >
            Order Additional Recovery Items
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white pb-36 relative select-none overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      
      {/* Immersive Cinematic Background Gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F5A623]/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-[#C8102E]/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Cinematic Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-lg border-b border-white/10 px-3 py-3 sm:px-6 sm:py-4 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#C8102E] flex items-center justify-center font-black tracking-tighter text-white shadow-[0_0_15px_rgba(200,16,46,0.4)] text-xs sm:text-base">
              RB
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-xl leading-tight tracking-wider text-white truncate" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                <span className="sm:hidden">RB SPORTS CAFÉ</span>
                <span className="hidden sm:inline">RED BALL SPORTS CAFÉ</span>
              </h1>
              <p className="text-[9px] sm:text-[11px] text-[#F5A623] font-bold tracking-widest uppercase truncate opacity-90">
                {tableData?.table?.label || 'Table'} • {tableData?.table?.section || 'Lounge'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <button 
              onClick={() => setOrdersOpen(true)}
              className="p-2 sm:px-4 sm:py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] text-[#F5A623] text-[10px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-lg transition-all border border-white/5 uppercase tracking-wider relative"
            >
              <Clock size={16} />
              <span className="hidden sm:inline">My Orders</span>
              {tableOrdersData?.orders?.some(o => o.status !== 'delivered' && o.status !== 'cancelled') && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse border-2 border-[#0D0D0D]" />
              )}
            </button>

            <button 
              onClick={() => setCartOpen(true)} 
              className="p-2 sm:px-4 sm:py-2 rounded-xl bg-[#C8102E] hover:bg-[#A00D24] text-white text-[10px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-lg transition-all border border-white/10"
            >
              <ShoppingBag size={16} />
              <span className="hidden sm:inline">Cart</span>
              <span>({getItemCount()})</span>
            </button>
            
            <button 
              onClick={() => navigate('/table-portal')} 
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
              title="Return to Portal"
            >
              <ArrowLeft size={16} />
            </button>
          </div>
        </div>
      </header>
      {/* Hero-style FEATURED RECOVERY ITEMS SECTION */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-12 border-b border-white/10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} /> Premium Athlete Hub
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-wide text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            FEATURED RECOVERY ITEMS
          </h2>
          <p className="text-gray-400 text-xs md:text-sm max-w-2xl leading-relaxed">
            Handcrafted inside the Red Ball Kitchen using premium recovery-focused ingredients mapped for rapid muscle refuel and hydration.
          </p>
        </div>

        {/* Featured Items Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-6">
          {featuredItems.map(item => {
            const inCart = items.find(i => i.menuItemId === item._id && (i.size === 'Regular' || !i.size));
            const qty = inCart ? inCart.quantity : 0;
            const price = item.sizes?.[0]?.price || item.price || 249;

            return (
              <motion.div 
                key={item._id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className={`bg-[#161616] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-between group transition-all duration-300 hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${
                  !item.isAvailable ? 'opacity-60 grayscale' : ''
                }`}
              >
                {/* Clickable Area */}
                <div className="flex-1 flex flex-col cursor-pointer" onClick={() => setSelectedFood(item)}>
                  {/* Immersive Image Header */}
                  <div className="relative h-32 sm:h-60 overflow-hidden bg-gradient-to-br from-[#161616] to-[#2D1215]">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-black/20 to-transparent" />

                    {/* Top Badges - Only on Desktop */}
                    <div className="absolute top-3 inset-x-3 hidden sm:flex items-start justify-between pointer-events-none">
                      <span className="px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-white text-[10px] font-black tracking-widest uppercase border border-white/10">
                        {item.category}
                      </span>
                      {item.chefRecommended && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5A623] text-black text-[10px] font-extrabold shadow-lg">
                          <ChefHat size={12} /> Choice
                        </span>
                      )}
                    </div>

                    {/* Veg/Non-Veg Tag - For Mobile */}
                    <div className="absolute top-2 left-2 sm:hidden flex flex-wrap gap-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider text-white uppercase ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}>
                        {item.isVeg ? 'Veg' : 'Non-Veg'}
                      </span>
                    </div>

                    {/* Out of stock overlay */}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <span className="px-4 py-1.5 bg-red-600 text-white text-xs font-black tracking-widest uppercase rounded-full">
                          Out of Stock
                        </span>
                      </div>
                    )}

                    {/* Price Tag - Desktop only */}
                    <div className="absolute bottom-3 right-3 px-3 py-1 bg-[#C8102E] text-white rounded-xl font-bold text-sm shadow-xl font-mono hidden sm:block">
                      {formatCurrency(price)}
                    </div>
                  </div>

                  {/* Content Details Area */}
                  <div className="p-4 sm:p-6 flex flex-col justify-between grow">
                    <div>
                      {/* Nutrition stats strip - Desktop only */}
                      <div className="text-[#F5A623] font-bold text-xs tracking-wider mb-2 hidden sm:flex items-center gap-2">
                        <span>⚡ {item.protein}g Protein</span>
                        <span>•</span>
                        <span>{item.calories} kcal</span>
                      </div>

                      <h3 className="text-sm sm:text-xl font-bold text-white tracking-wide mb-1 sm:mb-2 line-clamp-1 group-hover:text-[#F5A623] transition-colors">
                        {item.name}
                      </h3>

                      <p className="text-gray-400 text-[11px] sm:text-xs leading-relaxed mb-3 sm:mb-6 line-clamp-2 min-h-[30px] sm:min-h-[36px]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quantity & CTA Action Bar */}
                <div className="p-4 pt-0">
                  <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/10">
                    <div>
                      <span className="text-lg font-bold font-mono text-[#F5A623] sm:hidden">
                        {formatCurrency(price)}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500">
                        <Clock size={12} />
                        <span>{item.preparationTime} min prep</span>
                      </div>
                    </div>

                    {item.isAvailable && (
                      <div>
                        {qty > 0 ? (
                          <div className="flex items-center gap-2 bg-black rounded-full p-1 border border-white/10 shadow-lg scale-90 sm:scale-100">
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item._id, 'Regular', qty - 1); }}
                              className="w-7 h-7 rounded-full bg-[#222] text-white hover:bg-[#333] flex items-center justify-center font-bold text-xs"
                            >
                              −
                            </button>
                            <span className="text-white text-xs font-bold w-5 text-center font-mono">{qty}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item._id, 'Regular', qty + 1); }}
                              className="w-7 h-7 rounded-full bg-[#F5A623] text-black hover:bg-[#E09410] flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Mobile Circular Button */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); addItem({ menuItemId: item._id, name: item.name, size: 'Regular', price }); toast.success('Added!'); }}
                              className="w-10 h-10 rounded-full bg-[#C8102E] text-white flex sm:hidden flex-col items-center justify-center shadow-lg active:scale-90 transition-transform"
                            >
                              <span className="text-[10px] font-black leading-none">ADD</span>
                              <Plus size={14} strokeWidth={3} />
                            </button>
                            {/* Desktop Pill Button */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); addItem({ menuItemId: item._id, name: item.name, size: 'Regular', price }); toast.success('Added to order!'); }}
                              className="hidden sm:flex px-5 py-2.5 bg-[#C8102E] hover:bg-[#A00D24] text-white rounded-full text-xs font-bold transition-all shadow-lg hover:scale-105 active:scale-95 items-center gap-1.5 uppercase tracking-wider"
                            >
                              <span>Add</span>
                              <span className="text-white/70 font-normal">+</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Sticky Category Sliding Navigation Bar */}
      <div className="sticky top-[64px] sm:top-[73px] z-30 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-white/10 py-3.5 shadow-md overflow-x-auto scrollbar-none w-full">
        <div className="flex items-center gap-2 px-4 sm:justify-center min-w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs font-extrabold transition-all duration-200 tracking-wider shadow-sm uppercase shrink-0 ${
                activeCategory === cat 
                  ? 'bg-[#C8102E] text-white scale-105 shadow-[0_0_15px_rgba(200,16,46,0.4)]' 
                  : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#222] hover:text-white border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Menu Catalog Grids */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h3 className="text-2xl font-black tracking-wide text-white mb-6 uppercase" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          {activeCategory} MENU SELECTION
        </h3>

        {filteredDishes.length === 0 && (
          <div className="text-center py-16 text-gray-500 bg-[#161616] rounded-3xl border border-white/5 p-8">
            <AlertCircle size={36} className="mx-auto mb-2 text-[#F5A623] opacity-60" />
            <p className="text-sm font-bold">No masterfully prepared dishes available in this specific category.</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {filteredDishes.map(item => {
            const inCart = items.find(i => i.menuItemId === item._id && (i.size === 'Regular' || !i.size));
            const qty = inCart ? inCart.quantity : 0;
            const price = item.sizes?.[0]?.price || item.price || 199;

            return (
              <motion.div 
                key={item._id} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#161616] rounded-2xl border border-white/5 shadow-lg overflow-hidden flex flex-col justify-between transition-all hover:border-white/20 group ${
                  !item.isAvailable ? 'opacity-50 grayscale' : ''
                }`}
              >
                {/* Clickable Area */}
                <div className="flex-1 flex flex-col cursor-pointer" onClick={() => setSelectedFood(item)}>
                  {/* Image Section */}
                  <div className="relative h-32 sm:h-48 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-transparent to-black/30" />
                    
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider text-white uppercase ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}>
                        {item.isVeg ? 'Veg' : 'Non-Veg'}
                      </span>
                      {item.featured && (
                        <span className="bg-[#F5A623] text-black px-2 py-0.5 rounded text-[9px] font-black shadow">
                          ★ Hero
                        </span>
                      )}
                    </div>
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center text-white text-[11px] font-black uppercase tracking-widest shadow-lg">
                        Out of Stock
                      </div>
                    )}
                  </div>

                  {/* Content Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-1 mb-1">
                        <h4 className="font-extrabold text-sm text-white line-clamp-1 group-hover:text-[#F5A623] transition-colors">{item.name}</h4>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2 mb-3 min-h-[30px]">
                        {item.description || 'Nutrient-rich sports performance meal.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div>
                      <span className="text-lg font-bold font-mono text-[#F5A623]">
                        {formatCurrency(price)}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Clock size={10} />
                        <span>{item.preparationTime}m prep</span>
                      </div>
                    </div>

                    {item.isAvailable && (
                      <div>
                        {qty > 0 ? (
                          <div className="flex items-center gap-1.5 bg-black rounded-full p-1 border border-white/10 shadow">
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item._id, 'Regular', qty - 1); }}
                              className="w-6 h-6 rounded-full bg-[#222] text-white font-bold text-xs flex items-center justify-center"
                            >
                              −
                            </button>
                            <span className="text-white text-xs font-bold w-4 text-center font-mono">{qty}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item._id, 'Regular', qty + 1); }}
                              className="w-6 h-6 rounded-full bg-[#F5A623] text-black font-bold text-xs flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); addItem({ menuItemId: item._id, name: item.name, size: 'Regular', price }); toast.success('Added to order!'); }}
                            className="px-4 py-2 bg-[#C8102E] hover:bg-[#A00D24] text-white rounded-full text-xs font-bold uppercase transition-all shadow-md active:scale-95"
                          >
                            Add +
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {getItemCount() > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          className="fixed bottom-6 inset-x-4 z-40 flex justify-center"
        >
          <button 
            onClick={() => setCartOpen(true)} 
            className="w-full max-w-sm bg-black/90 backdrop-blur-2xl text-white border border-white/10 p-3.5 pl-4 pr-6 rounded-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] flex items-center justify-between group transition-all duration-300 hover:scale-[1.03] hover:border-[#F5A623]/40 active:scale-95"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 bg-[#F5A623] text-black rounded-full flex items-center justify-center font-black text-sm shadow-[0_0_20px_rgba(245,166,35,0.3)]">
                  {getItemCount()}
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping opacity-75" />
              </div>
              <div className="text-left">
                <p className="text-[9px] text-gray-500 uppercase font-black tracking-[0.2em] mb-0.5">Active Order</p>
                <p className="text-lg font-black text-white font-mono leading-none">{formatCurrency(gst.totalAmount)}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5 font-black text-[10px] text-[#F5A623] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                <span>Checkout</span>
                <ArrowRight size={14} strokeWidth={3} />
              </div>
              <p className="text-[8px] text-gray-500 uppercase font-bold pr-5">Tap to view cart</p>
            </div>
          </button>
        </motion.div>
      )}

      {/* Checkout Drawer */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" 
              onClick={() => setCartOpen(false)} 
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }} 
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#161616] rounded-t-3xl max-h-[88vh] overflow-y-auto shadow-2xl border-t border-white/10"
            >
              <div className="max-w-xl mx-auto p-6 md:p-8 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="text-[#C8102E]" size={22} />
                    <h2 className="text-xl font-extrabold tracking-wide text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                      COMPLETE TABLE ORDER
                    </h2>
                  </div>
                  <button onClick={() => setCartOpen(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-400">
                    <X size={18} />
                  </button>
                </div>

                {/* Items in Cart */}
                <div className="space-y-3 mb-6 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
                  {items.length === 0 ? (
                    <div className="text-center py-8 bg-black/30 rounded-2xl border border-white/5 text-gray-400 text-xs font-bold">
                      Your active table cart is empty. Add premium recovery dishes from the menu below!
                    </div>
                  ) : (
                    items.map(i => (
                      <div key={`${i.menuItemId}-${i.size}`} className="flex items-center justify-between p-3.5 bg-black/50 rounded-2xl border border-white/5">
                        <div className="flex-1 pr-3">
                          <p className="text-sm font-extrabold text-white">{i.name}</p>
                          <p className="text-xs text-[#F5A623] font-mono">{formatCurrency(i.price)} each</p>
                        </div>
                        <div className="flex items-center gap-2 bg-[#1A1A1A] rounded-full p-1 border border-white/10">
                          <button onClick={() => updateQuantity(i.menuItemId, i.size, i.quantity - 1)} className="w-6 h-6 rounded-full bg-[#222] text-white hover:bg-[#333] font-bold text-xs flex items-center justify-center">−</button>
                          <span className="text-xs font-bold text-white w-4 text-center font-mono">{i.quantity}</span>
                          <button onClick={() => updateQuantity(i.menuItemId, i.size, i.quantity + 1)} className="w-6 h-6 rounded-full bg-[#C8102E] text-white hover:bg-[#A00D24] font-bold text-xs flex items-center justify-center">+</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bill Breakdown */}
                <div className="space-y-2 mb-6 p-4 bg-black/40 rounded-2xl border border-white/5 text-xs font-medium">
                  <div className="flex justify-between text-gray-400"><span>Items Subtotal</span><span className="font-mono text-white">{formatCurrency(gst.amount)}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Restaurant GST (5%)</span><span className="font-mono text-white">{formatCurrency(gst.gstAmount)}</span></div>
                  <div className="flex justify-between text-sm font-black text-white border-t border-white/10 pt-2 mt-2">
                    <span>Grand Total Payable</span>
                    <span className="text-[#C8102E] font-mono">{formatCurrency(gst.totalAmount)}</span>
                  </div>
                </div>

                {/* Guest Details & Special Instructions */}
                <div className="space-y-4 mb-6 border-t border-white/10 pt-5 text-left">
                  <h3 className="font-black text-xs text-white uppercase tracking-widest">Customer Details & Instructions</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute top-3.5 left-3.5 text-gray-500"><User size={16} /></span>
                      <input
                        type="text"
                        placeholder="Your Name (Optional)"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-black border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute top-3.5 left-3.5 text-gray-500"><Phone size={16} /></span>
                      <input
                        type="tel"
                        placeholder="Phone Number (Optional)"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-black border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute top-3.5 left-3.5 text-gray-500"><FileText size={16} /></span>
                    <textarea
                      placeholder="Special kitchen notes (e.g., make it extra spicy, allergy instructions...)"
                      rows="2"
                      value={specialInstructions}
                      onChange={e => setSpecialInstructions(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-[#C8102E] resize-none"
                    />
                  </div>
                </div>

                {/* Payment Mode Selection */}
                <div className="space-y-3 mb-6 border-t border-white/10 pt-5 text-left">
                  <h3 className="font-black text-xs text-white uppercase tracking-widest">Choose Payment Mode</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        paymentMethod === 'cash' 
                          ? 'border-[#C8102E] bg-red-950/20 shadow-lg' 
                          : 'border-white/10 bg-black/50 hover:bg-black'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-xs text-white">Pay at Table</span>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cash' ? 'border-[#C8102E] bg-[#C8102E]' : 'border-gray-600'}`}>
                          {paymentMethod === 'cash' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-tight">Pay waiter via cash or card terminal.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        paymentMethod === 'online' 
                          ? 'border-[#F5A623] bg-amber-950/20 shadow-lg' 
                          : 'border-white/10 bg-black/50 hover:bg-black'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-xs text-white">UPI / Razorpay</span>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'online' ? 'border-[#F5A623] bg-[#F5A623]' : 'border-gray-600'}`}>
                          {paymentMethod === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-tight">Instant checkout via GPay, PhonePe, Paytm.</p>
                    </button>
                  </div>
                </div>

                {/* Submit Order Button */}
                <button 
                  onClick={placeOrder} 
                  disabled={loading}
                  className="w-full py-4 rounded-full bg-[#C8102E] hover:bg-[#A00D24] text-white font-extrabold text-sm uppercase tracking-widest shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Confirm Order & Send to Kitchen →</span>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Live Order Status Tracking Drawer */}
      <AnimatePresence>
        {ordersOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" 
              onClick={() => setOrdersOpen(false)} 
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }} 
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#161616] rounded-t-3xl max-h-[88vh] overflow-y-auto shadow-2xl border-t border-white/10"
            >
              <div className="max-w-xl mx-auto p-6 md:p-8 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="text-[#F5A623]" size={22} />
                    <h2 className="text-xl font-extrabold tracking-wide text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                      LIVE TABLE ORDERS & STATUS
                    </h2>
                  </div>
                  <button onClick={() => setOrdersOpen(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-400">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 mb-4">
                  {!tableOrdersData?.orders || tableOrdersData.orders.length === 0 ? (
                    <div className="text-center py-10 bg-black/30 rounded-2xl border border-white/5 text-gray-400 text-xs font-bold">
                      No orders placed from this table yet. Place your first order from the menu!
                    </div>
                  ) : (
                    tableOrdersData.orders
                      .filter(o => o.paymentMethod === 'cash' || o.paymentStatus === 'paid')
                      .map(order => (
                      <div key={order._id} className="p-4 bg-black/50 rounded-2xl border border-white/10 space-y-3 text-left">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <div>
                            <span className="text-xs font-mono text-gray-400">Order #{order._id.slice(-6).toUpperCase()}</span>
                            <span className="text-[10px] text-gray-500 ml-2">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            order.status === 'delivered' ? 'bg-green-950 text-green-400 border border-green-500/30' :
                            order.status === 'served' ? 'bg-blue-950 text-blue-400 border border-blue-500/30' :
                            order.status === 'preparing' ? 'bg-amber-950 text-amber-400 border border-amber-500/30 font-bold animate-pulse' :
                            order.status === 'cancelled' ? 'bg-red-950 text-red-400 border border-red-500/30' :
                            'bg-gray-800 text-gray-300 border border-white/10'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 scrollbar-thin">
                          {order.items.map(item => (
                            <div key={item._id} className="flex justify-between text-xs font-bold text-gray-200">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="text-[#F5A623] font-mono">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs font-bold">
                          <span className="text-gray-400">Payment: <span className="uppercase text-white">{order.paymentMethod} ({order.paymentStatus})</span></span>
                          <span className="text-[#C8102E] font-mono">{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
        {/* Product Quick View Modal */}
        <AnimatePresence mode="wait">
          {selectedFood && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                onClick={() => setSelectedFood(null)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative z-10 w-full max-w-md bg-[#161616] rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Image */}
                <div className="relative h-56 sm:h-72 w-full overflow-hidden">
                  <img src={selectedFood.image} alt={selectedFood.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-transparent to-black/20" />
                  
                  <button 
                    onClick={() => setSelectedFood(null)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition-colors border border-white/10"
                  >
                    <X size={20} />
                  </button>

                  <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 bg-[#F5A623] text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg mb-1.5 inline-block">
                        {selectedFood.category}
                      </span>
                      <h2 className="text-2xl font-black text-white tracking-wide uppercase leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                        {selectedFood.name}
                      </h2>
                    </div>
                    <div className="text-xl font-black text-[#F5A623] font-mono">
                      {formatCurrency(selectedFood.sizes?.[0]?.price || selectedFood.price || 199)}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[55vh] scrollbar-none">
                  {/* Nutrition Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-black/40 rounded-2xl p-3 border border-white/5 text-center">
                      <div className="text-[#C8102E] mb-1 flex justify-center"><Flame size={16} /></div>
                      <div className="text-lg font-black text-white">{selectedFood.calories || '---'}</div>
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Calories</div>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-3 border border-white/5 text-center">
                      <div className="text-[#F5A623] mb-1 flex justify-center"><Sparkles size={16} /></div>
                      <div className="text-lg font-black text-white">{selectedFood.protein || '---'}g</div>
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Protein</div>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-3 border border-white/5 text-center">
                      <div className="text-blue-500 mb-1 flex justify-center"><Clock size={16} /></div>
                      <div className="text-lg font-black text-white">{selectedFood.preparationTime || '---'}m</div>
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Prep Time</div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-[#888] uppercase tracking-widest border-l-2 border-[#C8102E] pl-2.5">
                      The Performance Recipe
                    </h4>
                    <p className="text-gray-400 text-[13px] leading-relaxed font-medium">
                      {selectedFood.description || 'This masterfully prepared dish is optimized for high-performance recovery and sustained energy levels.'}
                    </p>
                  </div>

                  {/* Added Stuff / Ingredients (Mocked) */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-[#888] uppercase tracking-widest border-l-2 border-[#F5A623] pl-2.5">
                      Recovery Matrix
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {['No Added Sugar', 'Gluten Free', 'High Fiber', 'Natural Ingredients'].map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold text-gray-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <button 
                      onClick={() => { 
                        addItem({ 
                          menuItemId: selectedFood._id, 
                          name: selectedFood.name, 
                          size: 'Regular', 
                          price: selectedFood.sizes?.[0]?.price || selectedFood.price || 199 
                        }); 
                        toast.success('Added to your cart!');
                        setSelectedFood(null);
                      }}
                      className="w-full py-4 bg-[#C8102E] hover:bg-[#A00D24] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(200,16,46,0.3)] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                    >
                      <ShoppingBag size={16} />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
