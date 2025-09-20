import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Menu, X, User, LogOut } from 'lucide-react';
import { userStorageService } from '../services/userStorage';

interface HeaderProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export default function Header({ isMobileMenuOpen, setIsMobileMenuOpen }: HeaderProps) {
  const location = useLocation();
  const currentUser = userStorageService.getCurrentUser();
  const isSignedIn = userStorageService.isSignedIn();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = () => {
    userStorageService.signOutUser();
    // Force a page reload to update the header state
    window.location.reload();
  };

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
          
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                isActive('/') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              Home
            </Link>
            <Link
              to={isSignedIn ? "/health" : "/signin"}
              className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                isActive('/health') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              My Health
            </Link>
            <Link
              to={isSignedIn ? "/reports" : "/signin"}
              className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                isActive('/reports') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              My Reports
            </Link>
            <Link
              to={isSignedIn ? "/sathi" : "/signin"}
              className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                isActive('/sathi') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              My Sathi
            </Link>
          </div>

          {/* Authentication Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isSignedIn ? (
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
              <Link
                to={isSignedIn ? "/health" : "/signin"}
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isActive('/health') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                My Health
              </Link>
              <Link
                to={isSignedIn ? "/reports" : "/signin"}
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isActive('/reports') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                My Reports
              </Link>
              <Link
                to={isSignedIn ? "/sathi" : "/signin"}
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isActive('/sathi') ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                My Sathi
              </Link>
              
              {/* Mobile Authentication Buttons */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                {isSignedIn ? (
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