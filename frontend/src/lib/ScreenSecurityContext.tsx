'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';

interface ScreenSecurityContextType {
  isSecurityEnabled: boolean;
  setIsSecurityEnabled: (enabled: boolean) => void;
}

const ScreenSecurityContext = createContext<ScreenSecurityContextType | undefined>(undefined);

export function ScreenSecurityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSecurityEnabled, setIsSecurityEnabled] = useState<boolean>(false);
  const [isAppHidden, setIsAppHidden] = useState<boolean>(false);

  // Load from local storage when user changes
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`signal_screen_security_${user.id}`);
      if (stored) {
        setIsSecurityEnabled(stored === 'true');
      } else {
        setIsSecurityEnabled(false);
      }
    } else {
      setIsSecurityEnabled(false);
    }
  }, [user]);

  // Save to local storage when state changes
  const handleSetSecurityEnabled = (enabled: boolean) => {
    setIsSecurityEnabled(enabled);
    if (user) {
      localStorage.setItem(`signal_screen_security_${user.id}`, enabled.toString());
    }
  };

  // Visibility and focus tracking
  useEffect(() => {
    if (!isSecurityEnabled) {
      setIsAppHidden(false);
      document.body.classList.remove('screen-security-active');
      document.body.classList.remove('screen-security-enabled');
      return;
    }

    document.body.classList.add('screen-security-enabled');

    const handleVisibilityChange = () => {
      setIsAppHidden(document.hidden);
    };

    const handleBlur = () => {
      setIsAppHidden(true);
    };

    const handleFocus = () => {
      setIsAppHidden(false);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Check initial state
    setIsAppHidden(document.hidden || !document.hasFocus());

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.body.classList.remove('screen-security-enabled');
      document.body.classList.remove('screen-security-active');
    };
  }, [isSecurityEnabled]);

  // Apply visual class to body when hidden
  useEffect(() => {
    if (isSecurityEnabled && isAppHidden) {
      document.body.classList.add('screen-security-active');
    } else {
      document.body.classList.remove('screen-security-active');
    }
  }, [isSecurityEnabled, isAppHidden]);

  return (
    <ScreenSecurityContext.Provider
      value={{
        isSecurityEnabled,
        setIsSecurityEnabled: handleSetSecurityEnabled,
      }}
    >
      {children}
    </ScreenSecurityContext.Provider>
  );
}

export function useScreenSecurity() {
  const context = useContext(ScreenSecurityContext);
  if (context === undefined) {
    throw new Error('useScreenSecurity must be used within a ScreenSecurityProvider');
  }
  return context;
}
