import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Themed } from './components/primitives/index.jsx';
import { useAuth } from './AuthContext.jsx';
import { FONTS } from './tokens.js';
import { supabase } from './supabase.js';

// Redirect mobile visitors from a desktop route to its /mobile counterpart.
// Only routes that have a mobile version are listed here.
const MOBILE_ROUTES = {
  '/browse': '/browse/mobile',
  '/dashboard': '/dashboard/mobile',
  '/messages': '/messages/mobile',
  '/tutor-dashboard': '/tutor-dashboard/mobile',
  '/home': '/home',        // StudentHome is already responsive — no redirect needed
  '/mobile': '/mobile',   // already mobile landing
};

const MobileRedirect = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) return;
    const base = location.pathname;
    // Don't redirect if already on a /mobile route
    if (base.endsWith('/mobile')) return;
    const mobilePath = MOBILE_ROUTES[base];
    if (mobilePath && mobilePath !== base) {
      navigate(mobilePath + location.search, { replace: true });
    }
  }, [location.pathname]);
  return children;
};

const NotFoundScreen = () => {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontFamily: FONTS.serif, fontSize: 96, fontWeight: 400, color: 'var(--border)', lineHeight: 1, marginBottom: 8 }}>404</div>
      <h1 style={{ fontFamily: FONTS.serif, fontSize: 32, fontWeight: 400, margin: '0 0 12px', letterSpacing: -0.5 }}>Page not found</h1>
      <p style={{ fontSize: 15, color: 'var(--ink-3)', margin: '0 0 32px', maxWidth: 340, lineHeight: 1.55 }}>
        The page you're looking for doesn't exist or may have moved.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
          Go back
        </button>
        <button onClick={() => navigate('/')} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', cursor: 'pointer', fontSize: 14, color: 'var(--surface)', fontWeight: 500 }}>
          Home
        </button>
      </div>
    </div>
  );
};

const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
    <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ProtectedRoute = ({ element }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/signin" replace />;
  return element;
};

// Pending approval screen shown to tutors whose application hasn't been approved yet
const PendingApprovalScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#FEF3C7',
        border: '3px solid #F59E0B', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 32, marginBottom: 24 }}>⏳</div>
      <h1 style={{ fontFamily: FONTS.serif, fontSize: 36, fontWeight: 400, margin: '0 0 12px', letterSpacing: -0.5 }}>
        Application under review
      </h1>
      <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 420, lineHeight: 1.65, margin: '0 0 8px' }}>
        Thanks for applying, <strong>{user?.user_metadata?.full_name?.split(' ')[0] || 'there'}</strong>. Our team reviews applications within 24–48 hours.
      </p>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', maxWidth: 380, lineHeight: 1.6, margin: '0 0 36px' }}>
        You'll receive an email at <strong>{user?.email}</strong> once you're approved and live on the platform.
      </p>
      <button onClick={handleLogout} style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid var(--border)',
        background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--ink-3)', fontFamily: FONTS.sans }}>
        Sign out
      </button>
    </div>
  );
};

// Only tutors may access tutor-specific routes — blocks unapproved applications
const TutorOnlyRoute = ({ element }) => {
  const { user, loading } = useAuth();
  const [appStatus, setAppStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!user) { setStatusLoading(false); return; }
    if (user.user_metadata?.role !== 'tutor') { setStatusLoading(false); return; }
    // Check metadata first (set by approve-tutor function), fall back to DB
    if (user.user_metadata?.application_status === 'approved') {
      setAppStatus('approved'); setStatusLoading(false); return;
    }
    supabase.from('tutor_profiles').select('application_status').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setAppStatus(data?.application_status || 'pending_review'); setStatusLoading(false); });
  }, [user]);

  if (loading || statusLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/signin" replace />;
  if (user.user_metadata?.role !== 'tutor') return <Navigate to="/home" replace />;
  if (appStatus !== 'approved') return <PendingApprovalScreen />;
  return element;
};

// Only students (non-tutors) may access student-specific routes
const StudentOnlyRoute = ({ element }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/signin" replace />;
  if (user.user_metadata?.role === 'tutor') return <Navigate to="/tutor-dashboard" replace />;
  return element;
};

const RootRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && user.user_metadata?.role !== 'tutor') return <Navigate to="/home" replace />;
  if (user && user.user_metadata?.role === 'tutor') return <Navigate to="/tutor-dashboard" replace />;
  return <LandingDesktop />;
};

// Landing
import LandingDesktop from './screens/landing/LandingDesktop.jsx';
import LandingMobile from './screens/landing/LandingMobile.jsx';

// Browse
import BrowseDesktop from './screens/browse/BrowseDesktop.jsx';
import BrowseMobile from './screens/browse/BrowseMobile.jsx';
import { ClassDetailDesktop, ClassDetailMobile } from './screens/browse/ClassDetail.jsx';
import { TutorProfileDesktop, TutorProfileMobile } from './screens/browse/TutorProfile.jsx';

// Flow
import BookingDesktop from './screens/flow/BookingDesktop.jsx';
import DashboardDesktop from './screens/flow/DashboardDesktop.jsx';
import MessagesDesktop from './screens/flow/MessagesDesktop.jsx';
import StudentHome from './screens/flow/StudentHome.jsx';

// Tutor
import { TutorDashboardLayout, TutorDashboardDesktop, ScheduleEditorDesktop, EditTutorProfileDesktop } from './screens/tutor/TutorDashboard.jsx';
import TutorOnboarding from './screens/tutor/TutorOnboarding.jsx';
import AdminDashboard from './screens/admin/AdminDashboard.jsx';
import TutorMessages from './screens/tutor/TutorMessages.jsx';

// Mobile
import {
  DashboardMobile,
  BookingMobile,
  BookingConfirmedMobile,
  MessagesListMobile,
  MessageThreadMobile,
  TutorDashboardMobile,
} from './screens/mobile/MobileScreens.jsx';

// Payments
import {
  AddCardScreen,
  PaymentConfirmation,
  PayoutsScreen,
  ReviewScreen,
  VerifyEmailScreen,
  TutorVerificationScreen,
  StatesShowcase,
} from './screens/payments/PaymentScreens.jsx';

// Basics
import {
  SignUpFlow,
  SignInScreen,
  PasswordResetScreen,
  SettingsScreen,
  HelpScreen,
  LegalScreen,
  AboutScreen,
} from './screens/basics/BasicScreens.jsx';

function App() {
  return (
    <Themed theme="campus">
      <div style={{ minHeight: '100vh', height: '100%' }}>
        <MobileRedirect>
        <Routes>
          {/* Landing / home */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/mobile" element={<LandingMobile />} />
          <Route path="/home" element={<ProtectedRoute element={<StudentHome />} />} />

          {/* Browse */}
          <Route path="/browse" element={<BrowseDesktop />} />
          <Route path="/browse/mobile" element={<BrowseMobile />} />
          <Route path="/class/:code" element={<ClassDetailDesktop />} />
          <Route path="/class/:code/mobile" element={<ClassDetailMobile />} />
          <Route path="/tutor/:id" element={<TutorProfileDesktop />} />
          <Route path="/tutor/:id/mobile" element={<TutorProfileMobile />} />

          {/* Booking flow — student only */}
          <Route path="/book" element={<StudentOnlyRoute element={<BookingDesktop />} />} />
          <Route path="/book/mobile" element={<StudentOnlyRoute element={<BookingMobile />} />} />
          <Route path="/booking-confirmed" element={<StudentOnlyRoute element={<BookingConfirmedMobile />} />} />

          {/* Student dashboard — student only */}
          <Route path="/dashboard" element={<StudentOnlyRoute element={<DashboardDesktop />} />} />
          <Route path="/dashboard/mobile" element={<StudentOnlyRoute element={<DashboardMobile />} />} />

          {/* Messages — student only */}
          <Route path="/messages" element={<StudentOnlyRoute element={<MessagesDesktop />} />} />
          <Route path="/messages/mobile" element={<StudentOnlyRoute element={<MessagesListMobile />} />} />
          <Route path="/messages/:id" element={<StudentOnlyRoute element={<MessageThreadMobile />} />} />

          {/* Tutor dashboard — tutor only, shared layout keeps nav persistent */}
          <Route path="/tutor-dashboard" element={<TutorOnlyRoute element={<TutorDashboardLayout />} />}>
            <Route index element={<TutorDashboardDesktop />} />
            <Route path="schedule" element={<ScheduleEditorDesktop />} />
            <Route path="profile" element={<EditTutorProfileDesktop />} />
          </Route>
          <Route path="/tutor-dashboard/mobile" element={<TutorOnlyRoute element={<TutorDashboardMobile />} />} />
          <Route path="/tutor-messages" element={<TutorOnlyRoute element={<TutorMessages />} />} />

          {/* Payments */}
          <Route path="/add-card" element={<ProtectedRoute element={<AddCardScreen />} />} />
          <Route path="/payment-confirm" element={<ProtectedRoute element={<PaymentConfirmation />} />} />
          <Route path="/payouts" element={<ProtectedRoute element={<PayoutsScreen />} />} />
          <Route path="/review" element={<ProtectedRoute element={<ReviewScreen />} />} />
          <Route path="/verify-email" element={<VerifyEmailScreen />} />
          <Route path="/tutor-verify" element={<TutorVerificationScreen />} />
          <Route path="/tutor-apply" element={<TutorOnboarding />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/states" element={<ProtectedRoute element={<StatesShowcase />} />} />

          {/* Auth & basics */}
          <Route path="/signup" element={<SignUpFlow />} />
          <Route path="/signin" element={<SignInScreen />} />
          <Route path="/forgot-password" element={<PasswordResetScreen />} />
          <Route path="/settings" element={<ProtectedRoute element={<SettingsScreen />} />} />
          <Route path="/help" element={<HelpScreen />} />
          <Route path="/terms" element={<LegalScreen kind="terms" />} />
          <Route path="/privacy" element={<LegalScreen kind="privacy" />} />
          <Route path="/about" element={<AboutScreen />} />

          {/* Fallback */}
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
        </MobileRedirect>
      </div>
    </Themed>
  );
}

export default App;
