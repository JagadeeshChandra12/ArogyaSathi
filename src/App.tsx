import React, { useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import AboutSection from './components/AboutSection';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';

// Lazy load pages for better performance
const HealthPage = React.lazy(() => import('./pages/HealthPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const SathiPage = React.lazy(() => import('./pages/SathiPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const SignInPage = React.lazy(() => import('./pages/SignInPage'));
const SignUpPage = React.lazy(() => import('./pages/SignUpPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const VideoSession = React.lazy(() => import('./pages/VideoSession'));

// Hospital pages
const HospitalSignIn = React.lazy(() => import('./pages/hospital/HospitalSignIn'));
const HospitalSignUp = React.lazy(() => import('./pages/hospital/HospitalSignUp'));
const HospitalDashboard = React.lazy(() => import('./pages/hospital/HospitalDashboard'));
const HospitalFiles = React.lazy(() => import('./pages/hospital/HospitalFiles'));
const HospitalAppointments = React.lazy(() => import('./pages/hospital/HospitalAppointments'));
const HospitalVideo = React.lazy(() => import('./pages/hospital/HospitalVideo'));
const ScanIdentity = React.lazy(() => import('./pages/hospital/ScanIdentity'));
const PatientRecords = React.lazy(() => import('./pages/hospital/PatientRecords'));
const HealthPassport = React.lazy(() => import('./pages/HealthPassport'));


// Loading component
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-gray-500 font-medium">Loading Sathi...</p>
  </div>
);

// Protected Route Component (patient accounts only — hospital staff are redirected)
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, staff, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  if (staff) {
    return <Navigate to="/hospital" replace />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

const HospitalProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { staff, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  if (!staff) {
    return <Navigate to="/hospital/signin" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-white text-black">
        <Header 
          isMobileMenuOpen={isMobileMenuOpen} 
          setIsMobileMenuOpen={setIsMobileMenuOpen} 
        />
        
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <>
                <HeroSection />
                <FeaturesSection />
                <HowItWorksSection />
                <AboutSection />
              </>
            } />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/hospital/signin" element={<HospitalSignIn />} />
            <Route path="/hospital/signup" element={<HospitalSignUp />} />
            <Route path="/contact" element={<ContactPage />} />
            
            {/* Protected Routes */}
            <Route path="/health" element={
              <ProtectedRoute>
                <HealthPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/sathi" element={
              <ProtectedRoute>
                <SathiPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/video-session" element={
              <ProtectedRoute>
                <VideoSession />
              </ProtectedRoute>
            } />
  
            <Route path="/hospital" element={
              <HospitalProtectedRoute>
                <HospitalDashboard />
              </HospitalProtectedRoute>
            } />
            <Route path="/hospital/patients" element={
              <HospitalProtectedRoute>
                <PatientRecords />
              </HospitalProtectedRoute>
            } />
            <Route path="/hospital/files" element={
              <HospitalProtectedRoute>
                <HospitalFiles />
              </HospitalProtectedRoute>
            } />
            <Route path="/hospital/appointments" element={
              <HospitalProtectedRoute>
                <HospitalAppointments />
              </HospitalProtectedRoute>
            } />
            <Route path="/hospital/video" element={
              <HospitalProtectedRoute>
                <HospitalVideo />
              </HospitalProtectedRoute>
            } />
            <Route path="/scan/:patentId" element={
              <HospitalProtectedRoute>
                <ScanIdentity />
              </HospitalProtectedRoute>
            } />
            <Route path="/health-passport/:patientId" element={
               <HealthPassport />
            } />

            
            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        
        <Footer />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;