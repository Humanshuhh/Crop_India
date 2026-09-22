import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop - resets window scroll to top on every pathname change.
 * This component should be rendered inside the BrowserRouter hierarchy.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Scroll instantly to top. No smooth behavior to avoid interfering with Fixed Navbar/BottomNav.
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

