import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../firebase/config';
import { userStorageService } from '../services/userStorage';

interface HeaderProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export default function Header({ isMobileMenuOpen, setIsMobileMenuOpen }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser, staff, loading, signOutApp } = useAuth();
  const patientSignedIn = !loading && currentUser !== null;
  const staffSignedIn = !loading && staff !== null;

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const [offlineUsers, setOfflineUsers] = useState<any[]>([]);
  useEffect(() => {
     if (!isFirebaseConfigured()) {
        setOfflineUsers(userStorageService.getAllUsers());
     }
  }, []);

  const handleSwitchUser = async (email: string) => {
     // Check if they selected the demo staff
     if (email === 'nabi@gmail.com') {
        userStorageService.forceSignInStaff(email);
        window.location.href = '/hospital';
     } else {
        userStorageService.forceSignInUser(email);
        // Stay on current page so they can see profile updates instantly, unless they are in hospital routes
        if (location.pathname.startsWith('/hospital')) {
           window.location.href = '/health';
        } else {
           window.location.reload();
        }
     }
  };

  const handleSignOut = async () => {
    await signOutApp();
    navigate('/');
  };

  const offlineSwitcher = !isFirebaseConfigured() ? (
    <div className="relative group mr-4">
       <button className="flex items-center space-x-1 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-300">
          <span>Switch Profile</span>
          <ChevronDown className="w-3 h-3" />
       </button>
       <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div className="px-3 py-1 text-[10px] uppercase text-gray-400 font-bold tracking-wider">Patients</div>
          {offlineUsers.map((u) => (
             <button key={u.id} onClick={() => handleSwitchUser(u.email)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                {u.firstName} {u.lastName}
             </button>
          ))}
          <div className="border-t border-gray-100 my-1"></div>
          <div className="px-3 py-1 text-[10px] uppercase text-gray-400 font-bold tracking-wider">Staff</div>
          <button onClick={() => handleSwitchUser('nabi@gmail.com')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
             Dr. Nabi
          </button>
       </div>
    </div>
  ) : null;


  return (
    <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2 group">
            <Heart className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
              Arogya<span className="text-blue-600">Sathi</span>
            </span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1 flex-wrap gap-y-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                isActive('/') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              Home
            </Link>
            {staffSignedIn ? (
              <>
                <Link
                  to="/hospital"
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    isActive('/hospital') ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Hospital
                </Link>
                <Link
                  to="/hospital/files"
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    location.pathname.startsWith('/hospital/files') ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Patient files
                </Link>
                <Link
                  to="/hospital/appointments"
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    location.pathname.startsWith('/hospital/appointments') ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Appointments
                </Link>
                <Link
                  to="/hospital/video"
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    location.pathname.startsWith('/hospital/video') ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Video
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={patientSignedIn ? "/health" : "/signin"}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    isActive('/health') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  My Health
                </Link>
                <Link
                  to={patientSignedIn ? "/reports" : "/signin"}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    isActive('/reports') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  My Reports
                </Link>
                <Link
                  to={patientSignedIn ? "/sathi" : "/signin"}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    isActive('/sathi') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  My Sathi
                </Link>
                <Link
                  to={patientSignedIn ? "/video-session" : "/signin"}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    isActive('/video-session') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Video Call
                </Link>
                <Link
                  to="/hospital/signin"
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    location.pathname.startsWith('/hospital') ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-700 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  Hospital staff
                </Link>
              </>
            )}
          </div>

          {/* Authentication Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {offlineSwitcher}
            {staffSignedIn ? (
              <>
                <span className="flex items-center space-x-2 px-4 py-2 rounded-full font-medium text-gray-700">
                  <User className="h-4 w-4" />
                  <span className="max-w-[10rem] truncate">{staff?.fullName}</span>
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : patientSignedIn ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 px-4 py-2 rounded-full font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300"
                >
                  <User className="h-4 w-4" />
                  <span>{currentUser?.firstName || 'Profile'}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="px-4 py-2 rounded-full font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-full font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-all duration-300"
                >
                  Sign Up
                </Link>
                <Link
                  to="/hospital/signin"
                  className="px-4 py-2 rounded-full font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all duration-300"
                >
                  Hospital
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden text-gray-800 hover:text-blue-600 transition-colors duration-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 animate-fade-in">
            <div className="flex flex-col space-y-2">
              <Link
                to="/"
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isActive('/') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              {staffSignedIn ? (
                <>
                  <Link
                    to="/hospital"
                    className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isActive('/hospital') ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Hospital
                  </Link>
                  <Link
                    to="/hospital/files"
                    className="px-4 py-3 rounded-xl font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Patient files
                  </Link>
                  <Link
                    to="/hospital/appointments"
                    className="px-4 py-3 rounded-xl font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Appointments
                  </Link>
                  <Link
                    to="/hospital/video"
                    className="px-4 py-3 rounded-xl font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Video
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={patientSignedIn ? "/health" : "/signin"}
                    className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isActive('/health') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Health
                  </Link>
                  <Link
                    to={patientSignedIn ? "/reports" : "/signin"}
                    className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isActive('/reports') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Reports
                  </Link>
                  <Link
                    to={patientSignedIn ? "/sathi" : "/signin"}
                    className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isActive('/sathi') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Sathi
                  </Link>
                  <Link
                    to={patientSignedIn ? "/video-session" : "/signin"}
                    className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isActive('/video-session') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Video Call
                  </Link>
                  <Link
                    to="/hospital/signin"
                    className="px-4 py-3 rounded-xl font-medium text-gray-700 hover:text-slate-900 hover:bg-slate-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Hospital staff
                  </Link>
                </>
              )}
              
              {/* Mobile Authentication Buttons */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                {staffSignedIn ? (
                  <>
                    <div className="flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-gray-700">
                      <User className="h-4 w-4" />
                      <span>{staff?.fullName}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-3 rounded-xl font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : patientSignedIn ? (
                  <>
                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>{currentUser?.firstName || 'Profile'}</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-3 rounded-xl font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/signin"
                      className="block px-4 py-3 rounded-xl font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="block px-4 py-3 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-all duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                    <Link
                      to="/hospital/signin"
                      className="block px-4 py-3 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-all duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Hospital sign-in
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}