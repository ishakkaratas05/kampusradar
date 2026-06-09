import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  // Redirect based on role
  if (profile?.role === 'organizer') {
    return <Redirect href={"/(organizer)" as any} />;
  }

  // Default for students or any other role
  return <Redirect href={"/(student)" as any} />;
}
