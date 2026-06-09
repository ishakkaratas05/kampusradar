import React, { useState, useEffect, useRef } from 'react';
import { Slot } from 'expo-router';
import { ActivityIndicator, View, StatusBar } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { RegisterScreen } from '@/components/auth/RegisterScreen';

function MainNavigation() {
  const { user, loading, guestMode, setGuestMode } = useAuth();
  const [authScreen, setAuthScreen] = useState<'landing' | 'login' | 'register'>('landing');

  const prevGuestMode = useRef(guestMode);

  useEffect(() => {
    if (prevGuestMode.current === true && guestMode === false) {
      setAuthScreen('login');
    }
    prevGuestMode.current = guestMode;
  }, [guestMode]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!user && !guestMode) {
    if (authScreen === 'landing') {
      return (
        <WelcomeScreen 
          onNavigateToLogin={() => setAuthScreen('login')}
          onNavigateToRegister={() => setAuthScreen('register')}
          onContinueAsGuest={() => setGuestMode?.(true)}
        />
      );
    } else if (authScreen === 'login') {
      // NOTE: Passing onBack prop in case we want to add a back button to LoginScreen later
      return <LoginScreen onNavigateToRegister={() => setAuthScreen('register')} onBack={() => setAuthScreen('landing')} />;
    } else {
      return <RegisterScreen onNavigateToLogin={() => setAuthScreen('login')} onBack={() => setAuthScreen('landing')} />;
    }
  }

  // Once authenticated or in guest mode, render the child routes (which include (tabs))
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <AnimatedSplashOverlay />
        <MainNavigation />
      </ThemeProvider>
    </AuthProvider>
  );
}
