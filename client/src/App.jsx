import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import useAuthStore from './store/authStore';
import ErrorBoundary from './components/shared/ErrorBoundary';
import RouteLoader from './components/shared/RouteLoader';

// Layouts (loaded eagerly — they're the app shell)
import AdminLayout from './components/layout/AdminLayout';
import UserLayout from './components/layout/UserLayout';
import RestaurantLayout from './components/layout/RestaurantLayout';
import ReceptionLayout from './components/layout/ReceptionLayout';

// Auth (loaded eagerly — it's the entry point)
import Auth from './pages/auth/Auth';
import Home from './pages/Home';

// ── Lazy-loaded Pages ──────────────────────────────────────────────
// Admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const Admissions = lazy(() => import('./pages/admin/Admissions'));
const MembershipPlans = lazy(() => import('./pages/admin/MembershipPlans'));
const StudentMemberships = lazy(() => import('./pages/admin/StudentMemberships'));
const OneTimePlay = lazy(() => import('./pages/admin/OneTimePlay'));
const Slots = lazy(() => import('./pages/admin/Slots'));
const Payments = lazy(() => import('./pages/admin/Payments'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const UsersRoles = lazy(() => import('./pages/admin/UsersRoles'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const OperationalDashboard = lazy(() => import('./pages/admin/OperationalDashboard'));
const AttendanceDesk = lazy(() => import('./pages/admin/AttendanceDesk'));
const ManageServices = lazy(() => import('./pages/admin/ManageServices'));
const ManageBookings = lazy(() => import('./pages/admin/ManageBookings'));
const QRCheckIn = lazy(() => import('./pages/admin/QRCheckIn'));
const ScheduleBlocking = lazy(() => import('./pages/admin/ScheduleBlocking'));

// User
const UserDashboard = lazy(() => import('./pages/user/Dashboard'));
const UserMembership = lazy(() => import('./pages/user/Membership'));
const BookSlots = lazy(() => import('./pages/BookSlots'));
const FoodOrdering = lazy(() => import('./pages/user/FoodOrdering'));
const OrderHistory = lazy(() => import('./pages/user/OrderHistory'));
const Profile = lazy(() => import('./pages/user/Profile'));

// Restaurant
const RestaurantDashboard = lazy(() => import('./pages/restaurant/Dashboard'));
const LiveOrders = lazy(() => import('./pages/restaurant/Orders'));
const RestaurantOrderHistory = lazy(() => import('./pages/restaurant/RestaurantOrders'));
const RestaurantMenu = lazy(() => import('./pages/restaurant/Menu'));
const RestaurantTables = lazy(() => import('./pages/restaurant/Tables'));

// Reception
const ReceptionDashboard = lazy(() => import('./pages/reception/Dashboard'));

// Public
const TableOrder = lazy(() => import('./pages/table/TableOrder'));
const TablePortal = lazy(() => import('./pages/table/TablePortal'));

// ── Auth Guard ─────────────────────────────────────────────────────
function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  if (isLoading) return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#EAEAEA] border-t-[#111111] rounded-full animate-spin" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/login" />;
  return children;
}

// ── App ────────────────────────────────────────────────────────────
export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Auth />} />
              <Route path="/table-portal" element={<TablePortal />} />
              <Route path="/table/:tableId" element={<TableOrder />} />

              {/* Admin Panel */}
              <Route path="/admin" element={
                <ProtectedRoute roles={['superadmin', 'admin']}><AdminLayout /></ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="admissions" element={<Admissions />} />
                <Route path="memberships" element={<StudentMemberships />} />
                <Route path="plans" element={<MembershipPlans />} />
                <Route path="one-time-play" element={<OneTimePlay />} />
                <Route path="slots" element={<Slots />} />
                <Route path="payments" element={<Payments />} />
                <Route path="restaurant" element={<LiveOrders />} />
                <Route path="history" element={<RestaurantOrderHistory />} />
                <Route path="tables" element={<RestaurantTables />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="operations" element={<OperationalDashboard />} />
                <Route path="attendance-desk" element={<AttendanceDesk />} />
                <Route path="users" element={<UsersRoles />} />
                <Route path="settings" element={<Settings />} />
                <Route path="manage-services" element={<ManageServices />} />
                <Route path="manage-bookings" element={<ManageBookings />} />
                <Route path="qr-checkin" element={<QRCheckIn />} />
                <Route path="schedule-blocking" element={<ScheduleBlocking />} />
              </Route>

              {/* User/Student Panel */}
              <Route path="/user" element={
                <ProtectedRoute roles={['student', 'customer']}><UserLayout /></ProtectedRoute>
              }>
                <Route index element={<UserDashboard />} />
                <Route path="membership" element={<UserMembership />} />
                <Route path="book-slots" element={<BookSlots />} />
                <Route path="food" element={<FoodOrdering />} />
                <Route path="orders" element={<OrderHistory />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Restaurant Manager Panel */}
              <Route path="/restaurant" element={
                <ProtectedRoute roles={['manager', 'superadmin', 'admin']}><RestaurantLayout /></ProtectedRoute>
              }>
                <Route index element={<RestaurantDashboard />} />
                <Route path="orders" element={<LiveOrders />} />
                <Route path="history" element={<RestaurantOrderHistory />} />
                <Route path="menu" element={<RestaurantMenu />} />
                <Route path="tables" element={<RestaurantTables />} />
              </Route>

              {/* Reception Panel */}
              <Route path="/reception" element={
                <ProtectedRoute roles={['receptionist', 'superadmin', 'admin']}><ReceptionLayout /></ProtectedRoute>
              }>
                <Route index element={<ReceptionDashboard />} />
                <Route path="admissions" element={<Admissions />} />
                <Route path="memberships" element={<StudentMemberships />} />
                <Route path="one-time-play" element={<OneTimePlay />} />
                <Route path="book-slots" element={<BookSlots />} />
                <Route path="operations" element={<OperationalDashboard />} />
                <Route path="attendance-desk" element={<AttendanceDesk />} />
                <Route path="payments" element={<Payments />} />
                <Route path="manage-bookings" element={<ManageBookings />} />
                <Route path="qr-checkin" element={<QRCheckIn />} />
                <Route path="schedule-blocking" element={<ScheduleBlocking />} />
              </Route>

              {/* Redirect root */}
              <Route path="/" element={<Home />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            border: '1px solid #EAEAEA',
            color: '#111111',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
