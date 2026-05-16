import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CheckCircle, XCircle, Loader2, Camera, User, Calendar, Clock, MapPin, X } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'sonner';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency } from '../../lib/utils';

export default function QRCheckIn() {
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [validating, setValidating] = useState(false);

  const handleScan = async (result) => {
    if (!result || validating) return;
    
    const decodedText = result[0]?.rawValue;
    if (!decodedText) return;

    setValidating(true);
    setScanning(false);
    
    try {
      if (decodedText.startsWith('MEMBERSHIP_')) {
        const membershipId = decodedText.replace('MEMBERSHIP_', '');
        const res = await api.get(`/memberships/validate/${membershipId}`);
        const membership = res.data.membership;
        setScannedResult({
          type: 'membership',
          _id: membership._id,
          status: membership.status,
          playerName: membership.studentId?.name || 'Academy Member',
          slotName: membership.planId?.name || 'Membership Plan',
          startTime: new Date().toLocaleTimeString(),
          totalAmount: membership.planId?.price || 0,
          rawMembership: membership
        });
        toast.info(`Membership found for ${membership.studentId?.name}`);
      } else {
        const res = await api.get(`/bookings/${decodedText}`);
        const booking = res.data.booking;
        if (!booking) {
          throw new Error('Booking not found');
        }
        setScannedResult({ type: 'booking', ...booking });
        toast.info(`Booking found for ${booking.playerName}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid QR Code');
      setScanning(true); // Resume scanning
    } finally {
      setValidating(false);
    }
  };

  function onScanFailure(error) {
    // console.warn(`Code scan error = ${error}`);
  }

  const handleCheckIn = async () => {
    if (!scannedResult) return;
    
    setValidating(true);
    try {
      if (scannedResult.type === 'membership') {
        await api.post('/attendance/check-in', {
          userId: scannedResult.rawMembership.studentId._id,
          method: 'qr-scan',
          notes: 'Scanned at Reception QR Check-In'
        });
      } else {
        await api.post(`/bookings/${scannedResult._id}/check-in`);
      }
      toast.success('Check-in successful!');
      setScannedResult(null);
      setScanning(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="pb-24">
      <PageHeader 
        title="QR Check-In" 
        subtitle="Scan player booking QR codes for instant entry validation" 
      />

      <div className="max-w-xl mx-auto mt-10">
        {!scanning && !scannedResult && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-10 text-center flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-[#C8102E]/5 rounded-full flex items-center justify-center text-[#C8102E] mb-6">
              <QrCode size={48} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Scan?</h3>
            <p className="text-gray-500 mb-8 max-w-sm">
              Point your camera at the player's entry pass QR code to verify their booking and mark attendance.
            </p>
            <button 
              onClick={() => setScanning(true)}
              className="btn-primary h-14 w-full gap-3 text-lg"
            >
              <Camera size={24} /> Open Scanner
            </button>
          </motion.div>
        )}

        {scanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-black aspect-square relative">
              <Scanner 
                onScan={handleScan}
                onError={(err) => toast.error('Camera access denied')}
                constraints={{ facingMode: 'environment' }}
                allowMultiple={false}
              />
            </div>
            <button 
              onClick={() => setScanning(false)}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-black z-10"
            >
              <X size={20} />
            </button>
            <div className="mt-6 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-sm font-medium">Align QR code within the frame</span>
            </div>
          </motion.div>
        )}

        {scannedResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card overflow-hidden"
          >
            <div className={`p-6 text-center ${(scannedResult.type === 'booking' && scannedResult.status === 'confirmed') || (scannedResult.type === 'membership' && scannedResult.status === 'active') ? 'bg-blue-600' : 'bg-green-600'} text-white`}>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <User size={32} />
              </div>
              <h3 className="text-xl font-bold">{scannedResult.playerName}</h3>
              <p className="text-white/80 text-sm">
                {scannedResult.type === 'membership' 
                  ? (scannedResult.status === 'active' ? 'Membership Validated' : `Membership ${scannedResult.status}`)
                  : (scannedResult.status === 'confirmed' ? 'Booking Validated' : 'Already Checked-In')
                }
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{scannedResult.type === 'membership' ? 'Plan' : 'Service'}</span>
                  <p className="font-bold flex items-center gap-2"><MapPin size={14} className="text-[#C8102E]" /> {scannedResult.slotName || 'Sport Session'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Status</span>
                  <p className={`font-bold capitalize ${(scannedResult.type === 'booking' && scannedResult.status === 'confirmed') || (scannedResult.type === 'membership' && scannedResult.status === 'active') ? 'text-blue-600' : 'text-green-600'}`}>{scannedResult.status}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{scannedResult.type === 'membership' ? 'Time of Entry' : 'Time Slot'}</span>
                  <p className="font-bold flex items-center gap-2"><Clock size={14} className="text-gray-400" /> {scannedResult.startTime}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Total Amount</span>
                  <p className="font-bold">{formatCurrency(scannedResult.totalAmount)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => { setScannedResult(null); setScanning(true); }}
                  className="flex-1 h-12 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                {((scannedResult.type === 'booking' && scannedResult.status === 'confirmed') || 
                  (scannedResult.type === 'membership' && scannedResult.status === 'active')) && (
                  <button 
                    onClick={handleCheckIn}
                    disabled={validating}
                    className="flex-[2] h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                  >
                    {validating ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> Complete Check-In</>}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
