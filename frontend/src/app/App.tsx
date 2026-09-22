import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { VoiceProvider } from '../context/VoiceContext';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { BottomNav } from '../components/layout/BottomNav';
import { ScrollToTop } from '../components/utility/ScrollToTop';
import { ResultCacheProvider } from '../context/ResultCacheContext';

// Pages
import { Home } from '../pages/Home';
import { KhetSwasthya } from '../pages/KhetSwasthya';
import { FasalRogPehchan } from '../pages/FasalRogPehchan';
import { KisaanTelemetry } from '../pages/KisaanTelemetry';
import { DataSources } from '../pages/DataSources';
import { Login } from '../pages/Login';
import { Signup } from '../pages/Signup';
import { Profile } from '../pages/Profile';
import { FarmerAssistant } from '../pages/FarmerAssistant';
import { History } from '../pages/History';
import { Welcome } from '../pages/Welcome';
import { AdminDashboard } from '../pages/AdminDashboard';
import { RequireRole } from '../components/RequireRole';

const ONBOARDING_KEY = 'kisan_onboarding_done';

/**
 * Gates the Home route: first-time visitors are redirected to /welcome.
 * After onboarding is marked done, subsequent visits load Home directly.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const HomeOrWelcome: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const onboardingDone = localStorage.getItem(ONBOARDING_KEY) === 'true';
    if (!onboardingDone) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);
  const onboardingDone = localStorage.getItem(ONBOARDING_KEY) === 'true';
  return onboardingDone ? <Home /> : null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <LanguageProvider>
          <VoiceProvider>
            <ResultCacheProvider>
              <div className="flex flex-col min-h-screen bg-stone-50 text-stone-900">
                <Navbar />
                <main className="flex-1 pb-20 lg:pb-0">
                  <Routes>
                    <Route path="/" element={<HomeOrWelcome />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/khet-swasthya" element={<KhetSwasthya />} />
                    <Route path="/fasal-rog-pehchan" element={<FasalRogPehchan />} />
                    <Route path="/assistant" element={<FarmerAssistant />} />
                    <Route path="/kisaan-telemetry" element={<KisaanTelemetry />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/data-sources" element={<DataSources />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route
                      path="/admin"
                      element={
                        <RequireRole requiredRole="admin">
                          <AdminDashboard />
                        </RequireRole>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
                <Footer />
                <BottomNav />
              </div>
            </ResultCacheProvider>
          </VoiceProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

