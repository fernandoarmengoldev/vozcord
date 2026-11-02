import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#0f0f13', '#18181d']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <BlurView
        intensity={45}
        tint="dark"
        style={{ paddingTop: insets.top }}
        className="border-b border-dark-border-default"
      >
        {children}
      </BlurView>
    </LinearGradient>
  );
}