import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { initFirebaseAnalytics, isFirebaseConfigured } from './firebase/config';
import { completeGoogleRedirectSignIn } from './services/firebaseUserData';
import './index.css';

/**
 * Finish Google OAuth redirect *before* React mounts. If getRedirectResult runs too late
 * (e.g. after onAuthStateChanged), the session is never applied and you land on login signed out.
 */
async function bootstrap() {
  void initFirebaseAnalytics();

  if (isFirebaseConfigured()) {
    // Don't block React mount for this. It will trigger onAuthStateChanged naturally.
    completeGoogleRedirectSignIn().catch(console.error);
  } else {
    // Force a one-time re-seed of mock files if they use old placeholders or are missing
    const filesKey = 'arogya_sathi_hospital_files';
    const existingFiles = localStorage.getItem(filesKey);
    if (!existingFiles || existingFiles.includes('"fileUrl":"#"')) {
       localStorage.removeItem(filesKey);
       localStorage.removeItem('arogya_sathi_users');
       localStorage.removeItem('arogya_sathi_health_data');
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
