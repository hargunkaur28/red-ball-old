import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../lib/axios';
import PageHeader from '../components/shared/PageHeader';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { Calendar, MapPin, Clock, Users, Check, X, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const sports = ['cricket', 'badminton', 'swimming', 'gym', 'turf'];

export default function BookSlots() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    sport: 'cricket'
  });
  const [bookingForm, setBookingForm] = useState({
    playerName: '',
    numberOfPlayers: 1
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [qrBooking, setQrBooking] = useState(null);

  // Fetch available slots
  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['available-slots', filters.date, filters.sport],
    queryFn: () => api.get(`/slots?date=${filters.date}&sport=${filters.sport}`).then(r => r.data),
  });

  // Fetch user's bookings
  const { data: myBookings } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/slots/bookings/my-bookings').then(r => r.data).catch(() => ({ bookings: [] })),
  });

  const bookMutation = useMutation({
    mutationFn: (slotId) => api.post(`/slots/${slotId}/book`, {
      playerName: bookingForm.playerName,
      numberOfPlayers: parseInt(bookingForm.numberOfPlayers)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success('Slot booked successfully!');
      setShowBookingModal(false);
      setBookingForm({ playerName: '', numberOfPlayers: 1 });
      setSelectedSlot(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Booking failed'),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId) => api.post(`/slots/bookings/${bookingId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success('Booking cancelled');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Cancellation failed'),
  });

  const handleBook = (slot) => {
    setSelectedSlot(slot);
    setShowBookingModal(true);
  };

  const handleSubmitBooking = (e) => {
    e.preventDefault();
    if (!bookingForm.playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    bookMutation.mutate(selectedSlot._id);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'filling-fast':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'full':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getOccupancyPercent = (slot) => {
    return Math.round((slot.currentBookings / slot.capacity) * 100);
  };

  const isSlotFull = (slot) => slot.currentBookings >= slot.capacity;

  return (
    <div>
      <PageHeader title="Book a Slot" subtitle="Reserve your time at Red Ball Academy" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card lg:col-span-1">
          <h3 className="text-sm font-medium text-[#666666] mb-4">Filters</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#666666] mb-1">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666666] mb-1">Sport</label>
              <select
                value={filters.sport}
                onChange={(e) => setFilters({ ...filters, sport: e.target.value })}
                className="input-field bg-white text-sm w-full"
              >
                {sports.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Available Slots */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3">
          <div className="card">
            <h3 className="text-sm font-medium text-[#666666] mb-4">
              Available Slots - {filters.sport.toUpperCase()} on {new Date(filters.date).toLocaleDateString()}
            </h3>

            {isLoading ? (
              <div className="text-center py-12 text-[#888888]">Loading slots...</div>
            ) : !slotsData?.slots?.length ? (
              <div className="text-center py-12 text-[#888888]">No slots available for this date & sport</div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {slotsData.slots.map(slot => {
                  const occupancyPercent = getOccupancyPercent(slot);
                  const isFull = isSlotFull(slot);
                  const effectivePrice = slot.isPeakHour ? Math.round(slot.pricePerSlot * slot.peakHourMultiplier) : slot.pricePerSlot;
                  return (
                    <motion.div
                      key={slot._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 rounded-xl border-2 ${getStatusColor(slot.status)} transition-all hover:shadow-md`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-sm">{slot.name}</p>
                          <div className="flex gap-2 flex-wrap text-xs mt-2">
                            <span className="flex items-center gap-1 bg-white bg-opacity-60 px-2 py-1 rounded">
                              <Clock size={12} /> {slot.startTime} - {slot.endTime}
                            </span>
                            <span className="flex items-center gap-1 bg-white bg-opacity-60 px-2 py-1 rounded">
                              <Users size={12} /> {slot.currentBookings}/{slot.capacity}
                            </span>
                            {slot.isPeakHour && (
                              <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded font-semibold">
                                Peak Hour
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Occupancy Bar */}
                      <div className="mb-3">
                        <div className="w-full bg-gray-300 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              slot.status === 'full' ? 'bg-red-600' :
                              slot.status === 'filling-fast' ? 'bg-yellow-600' : 'bg-green-600'
                            }`}
                            style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Details & Action */}
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4 text-xs">
                          <div>
                            <span className="text-[#888888]">Price</span>
                            <p className="font-semibold text-sm">{formatCurrency(effectivePrice)}</p>
                          </div>
                          <div>
                            <span className="text-[#888888]">Duration</span>
                            <p className="font-semibold text-sm">{slot.duration} min</p>
                          </div>
                          <div>
                            <span className="text-[#888888]">Status</span>
                            <p className="font-semibold text-sm capitalize">{slot.status}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBook(slot)}
                          disabled={isFull || bookMutation.isPending}
                          className={`btn-primary text-sm ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isFull ? 'Full' : 'Book Now'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* My Bookings */}
      {myBookings?.bookings?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card mt-6">
          <h3 className="text-sm font-medium text-[#666666] mb-4">My Bookings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBookings.bookings.map(booking => (
              <div key={booking._id} className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{booking.slotName || 'Slot'}</p>
                    <p className="text-xs text-[#666666]">{booking.playerName}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    booking.status === 'checked-in' ? 'bg-blue-100 text-blue-700' :
                    booking.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <p className="text-xs text-[#888888] mb-2">{booking.numberOfPlayers} player(s)</p>
                <p className="text-sm font-semibold text-blue-700 mb-3">{formatCurrency(booking.price)}</p>
                {booking.status === 'confirmed' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setQrBooking(booking)}
                      className="btn-primary text-xs flex-1 flex items-center justify-center gap-1 py-2"
                    >
                      <QrCode size={14} /> Entry Pass
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Cancel this booking?')) {
                          cancelBookingMutation.mutate(booking._id);
                        }
                      }}
                      disabled={cancelBookingMutation.isPending}
                      className="btn-ghost text-xs text-red-600 flex-1 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {booking.status === 'checked-in' && (
                   <p className="text-xs text-center text-blue-600 font-semibold bg-white p-2 rounded border border-blue-100">Checked-In</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <h2 className="text-lg font-semibold text-[#111111] mb-4">Book {selectedSlot.name}</h2>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#666666]">Time</span>
                <span className="font-semibold">{selectedSlot.startTime} - {selectedSlot.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">Duration</span>
                <span className="font-semibold">{selectedSlot.duration} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">Price</span>
                <span className="font-semibold">{formatCurrency(selectedSlot.isPeakHour ? Math.round(selectedSlot.pricePerSlot * selectedSlot.peakHourMultiplier) : selectedSlot.pricePerSlot)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">Available</span>
                <span className="font-semibold">{selectedSlot.capacity - selectedSlot.currentBookings} spots</span>
              </div>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-3">
              <div>
                <label className="block text-xs text-[#666666] mb-1">Your Name *</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={bookingForm.playerName}
                  onChange={(e) => setBookingForm({ ...bookingForm, playerName: e.target.value })}
                  className="input-field text-sm w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs text-[#666666] mb-1">Number of Players *</label>
                <input
                  type="number"
                  min={1}
                  max={selectedSlot.capacity - selectedSlot.currentBookings}
                  value={bookingForm.numberOfPlayers}
                  onChange={(e) => setBookingForm({ ...bookingForm, numberOfPlayers: parseInt(e.target.value) || 1 })}
                  className="input-field text-sm w-full"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                ⚠️ You will need to pay {formatCurrency(selectedSlot.isPeakHour ? Math.round(selectedSlot.pricePerSlot * selectedSlot.peakHourMultiplier) : selectedSlot.pricePerSlot)} at the counter after booking confirmation.
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={bookMutation.isPending}
                  className="btn-primary text-sm flex-1"
                >
                  {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setSelectedSlot(null);
                    setBookingForm({ playerName: '', numberOfPlayers: 1 });
                  }}
                  className="btn-ghost text-sm flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* QR Code Pass Modal */}
      {qrBooking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setQrBooking(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <QrCode size={32} />
            </div>
            <h2 className="text-2xl font-black text-black mb-2 uppercase tracking-tight">Entry Pass</h2>
            <p className="text-[#666] text-sm mb-8 font-medium">Show this code at the reception scanner to check in.</p>
            
            <div className="bg-white p-4 rounded-3xl inline-block shadow-sm border border-gray-100 mb-8">
              <QRCodeSVG 
                value={qrBooking._id} 
                size={220} 
                level="Q" 
                includeMargin={true}
                className="rounded-xl"
              />
            </div>
            
            <div className="bg-[#F7F7F7] p-4 rounded-2xl mb-6 text-left">
              <p className="text-xs text-[#888] font-bold uppercase tracking-wider mb-1">Session Details</p>
              <p className="font-bold text-[#111]">{qrBooking.slotName || 'Sport Session'}</p>
              <p className="text-sm font-medium text-[#666] flex items-center gap-1 mt-1"><Clock size={14}/> {qrBooking.startTime} - {qrBooking.endTime}</p>
            </div>

            <button 
              onClick={() => setQrBooking(null)}
              className="btn-ghost w-full py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
            >
              Close Pass
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
