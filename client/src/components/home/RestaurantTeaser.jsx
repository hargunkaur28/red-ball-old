import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Smartphone, 
  UtensilsCrossed, 
  Mail, 
  QrCode, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ShoppingBag, 
  ArrowRight, 
  ChefHat 
} from 'lucide-react';


const liveStatuses = [
  { id: 'preparing', label: 'Preparing in Kitchen', time: 'Est. 8 mins', icon: <Flame size={15} className="text-[#F5A623] animate-pulse" />, ring: 'border-[#F5A623] text-[#F5A623]' },
  { id: 'ready', label: 'Ready for Pickup', time: 'Counter 2', icon: <Clock size={15} className="text-emerald-400" />, ring: 'border-emerald-500 text-emerald-400' },
  { id: 'delivered', label: 'Delivered to Table', time: 'Enjoy your meal!', icon: <CheckCircle2 size={15} className="text-blue-400" />, ring: 'border-blue-500 text-blue-400' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function RestaurantTeaser() {
  const [selectedStatus, setSelectedStatus] = useState('preparing');
  const [addedItem, setAddedItem] = useState(null);

  const handleQuickOrder = (itemName) => {
    setAddedItem(itemName);
    setTimeout(() => setAddedItem(null), 2500);
  };

  return (
    <section id="restaurant" className="relative py-20 md:py-32 bg-[#0D0D0D] overflow-hidden">
      
      {/* Premium Warm Restaurant Lighting Ambient Overlay */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F5A623]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-[#C8102E]/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Cinematic Background overlay texture */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1920&auto=format&fit=crop')` }}
      />

      <div className="max-w-[1320px] mx-auto px-4 md:px-8 lg:px-12 relative z-10">
        
        {/* Section Heading Area */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <p className="uppercase tracking-[5px] text-[13px] text-[#F5A623] mb-3 font-body font-semibold">
            DINE & RECOVER IN STYLE
          </p>

          <h2 className="section-heading text-white mb-3">
            The Red Ball Kitchen
          </h2>

          <p className="text-[#F5A623] text-lg md:text-xl font-heading tracking-wider mb-4 opacity-90">
            — Premium Athlete Recovery Café —
          </p>

          <p className="text-white/70 max-w-2xl mx-auto font-body text-base md:text-lg leading-relaxed">
            Engineered nutritional excellence mapped for high-performance recovery. Scan your table QR code to place direct cashless orders with live real-time preparation status updates.
          </p>
        </motion.div>

        {/* Part 1: QR & Live Kitchen Status Interactive Mockup Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-20 bg-[#151515]/90 rounded-3xl p-6 md:p-10 border border-white/10 shadow-2xl relative backdrop-blur-xl">
          
          {/* Subtle glow behind mockup container */}
          <div className="absolute -top-10 left-1/3 w-40 h-40 bg-[#F5A623]/20 rounded-full blur-3xl" />

          {/* Left Column: Visual Mockup Explainer */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] text-xs font-bold uppercase tracking-wider">
              <QrCode size={14} /> Frictionless Table Service
            </div>

            <h3 className="text-3xl md:text-4xl font-heading text-white tracking-wide">
              Scan. Customise. Track Live.
            </h3>

            <p className="text-white/70 font-body text-sm md:text-base leading-relaxed">
              Experience our lightning-fast digital self-ordering workflow. Zero wait times for printed menus. Secure checkout integrated directly with live kitchen prep screens.
            </p>

            {/* Live Kitchen Status Selector Widget */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/50 uppercase tracking-widest font-body mb-3 font-semibold">
                Interactive Live Kitchen Tracker Demo:
              </p>
              
              <div className="flex flex-wrap gap-3">
                {liveStatuses.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => setSelectedStatus(status.id)}
                    className={`px-4 py-2.5 rounded-xl font-body text-xs md:text-sm font-semibold transition-all duration-300 flex items-center gap-2 border ${
                      selectedStatus === status.id 
                        ? `${status.ring} bg-white/10 shadow-md scale-105` 
                        : 'border-white/5 bg-transparent text-white/50 hover:text-white/80'
                    }`}
                  >
                    {status.icon}
                    <span>{status.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Live Status Pill Showcase */}
            <div className="bg-black/50 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#F5A623] animate-ping" />
                <div>
                  <p className="text-xs text-white/50 font-body uppercase tracking-wider">Current Table Order Status</p>
                  <p className="text-sm font-body font-bold text-white">
                    {liveStatuses.find(s => s.id === selectedStatus)?.label}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/5 text-[#F5A623] font-body text-xs font-semibold">
                {liveStatuses.find(s => s.id === selectedStatus)?.time}
              </span>
            </div>
          </div>

          {/* Right Column: Visual App Mockup Device View */}
          <div className="lg:col-span-6 flex justify-center relative">
            
            {/* Background absolute lighting decor */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#F5A623]/5 to-[#C8102E]/5 rounded-3xl blur-xl" />

            {/* Mockup smartphone wrapper */}
            <div className="relative w-[280px] md:w-[320px] bg-black rounded-[40px] p-3 border-4 border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
              {/* Camera notch */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30" />
              
              {/* Inner screen */}
              <div className="bg-[#121212] rounded-[32px] overflow-hidden text-white pt-8 pb-4 px-4 relative font-body select-none">
                
                {/* Mock Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div>
                    <p className="text-[10px] text-[#F5A623] font-bold">TABLE 04</p>
                    <p className="text-xs font-bold">Red Ball Café Menu</p>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-[#C8102E]/20 text-[#C8102E] flex items-center justify-center text-xs font-bold">
                    RB
                  </span>
                </div>

                {/* Simulated QR Notification banner */}
                <div className="bg-gradient-to-r from-[#F5A623]/20 to-[#C8102E]/20 p-2.5 rounded-xl border border-[#F5A623]/30 mb-4 flex items-center gap-2">
                  <Sparkles size={14} className="text-[#F5A623] shrink-0" />
                  <p className="text-[10px] text-white/90 leading-tight">
                    Athlete account linked. High-protein customisations enabled.
                  </p>
                </div>

                {/* Mockup order items list */}
                <div className="space-y-2.5 mb-6">
                  <div className="bg-white/5 p-2 rounded-lg flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-gray-700 overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" alt="shake" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-white/90">Whey Isolate Shake</p>
                        <p className="text-[9px] text-white/50">28g Protein</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#F5A623]">₹249</span>
                  </div>

                  <div className="bg-white/5 p-2 rounded-lg flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-gray-700 overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1626700051175-6818013e1d4f?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" alt="wrap" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-white/90">Chicken Avocado Wrap</p>
                        <p className="text-[9px] text-white/50">Extra Avocado</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#F5A623]">₹299</span>
                  </div>
                </div>

                {/* Live Mockup Track button */}
                <div className="bg-[#C8102E] text-white text-center py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 animate-pulse">
                  <span>Status: {selectedStatus.toUpperCase()}</span>
                  <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                </div>

                {/* Navigation pill simulation */}
                <div className="w-20 h-1 bg-white/20 rounded-full mx-auto mt-6" />
              </div>
            </div>

            {/* Overlapping floating floating element */}
            <div className="absolute -bottom-4 -left-4 md:-left-8 bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-2.5">
              <ChefHat className="text-[#F5A623]" size={20} />
              <div>
                <p className="text-[10px] text-white/50 uppercase font-body">Chef Recommended</p>
                <p className="text-xs font-bold text-white font-body">Optimised Macros</p>
              </div>
            </div>

          </div>

        </div>


        {/* Global navigation CTA link */}
        <div className="text-center mt-12">
          <Link
            to="/table-portal"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#C8102E] text-white font-body font-bold text-sm hover:bg-[#F5A623] hover:text-black transition-all duration-300 shadow-xl hover:scale-105"
          >
            Access Digital Table Menu Portal <ArrowRight size={16} />
          </Link>
        </div>

      </div>
    </section>
  );
}
