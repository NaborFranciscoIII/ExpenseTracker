import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router';

export function useHardwareBack() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = async () => {
      // If the user is NOT on the home page, just go back one screen safely
      if (location.pathname !== '/') {
        navigate(-1);
        return;
      }

      // If the user IS on the home page, ask for confirmation before closing
      const wantsToExit = window.confirm("Are you sure you want to exit the app?");
      if (wantsToExit) {
        App.exitApp();
      }
    };

    const backListener = App.addListener('backButton', handleBackButton);

    return () => {
      backListener.then(listener => listener.remove());
    };
  }, [location, navigate]);
}