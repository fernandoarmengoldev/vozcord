import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSession } from '../../lib/useSession';

export default function Login() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, error, clearError } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si ya está autenticado, redirigir a main
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/main');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogin = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    clearError();

    const success = await login({ email, password });

    if (success) {
      if (Platform.OS === 'web') {
        window.location.href = '/main';
      } else {
        router.replace('/main');
      }
    } else {
      setIsSubmitting(false);
    }
  };

  const canSubmit = Boolean(email.trim()) && Boolean(password.trim()) && !isSubmitting;

  // Mientras verifica la sesión inicial, mostrar loading
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-dark-bg-primary">
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={['#0f0f13', '#18181d', '#0f0f13']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <SafeAreaView className="flex-1">
          <View className="flex-1 justify-center px-6">
            <BlurView intensity={55} tint="dark" style={[styles.glassCard, styles.glassCardSizing]}>
              <View className="space-y-8">
                <View className="space-y-2">
                  <Text className="text-3xl font-bold text-white">Iniciar sesión</Text>
                  <Text className="text-base text-white">
                    Introduce tu correo y contraseña para continuar.
                  </Text>
                </View>

                <View className="space-y-5">
                  <View className="space-y-1.5">
                    <Text className="text-sm font-semibold text-white">Correo electrónico</Text>
                    <TextInput
                      className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white shadow-lg shadow-blue-900/20 placeholder:text-neutral-400/70"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        clearError();
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      returnKeyType="next"
                      editable={!isSubmitting}
                      selectionColor="#60a5fa"
                      placeholder="tu@email.com"
                      placeholderTextColor="rgba(163,163,163,0.5)"
                    />
                  </View>

                  <View className="space-y-1.5">
                    <Text className="text-sm font-semibold text-white">Contraseña</Text>
                    <TextInput
                      className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white shadow-lg shadow-blue-900/20 placeholder:text-neutral-400/70"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        clearError();
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      editable={!isSubmitting}
                      selectionColor="#60a5fa"
                      placeholder="••••••••"
                      placeholderTextColor="rgba(163,163,163,0.5)"
                    />
                  </View>

                  {error && (
                    <View className="rounded-xl bg-red-500/10 border border-red-400/30 p-3">
                      <Text className="text-sm text-red-400 font-medium text-center">
                        {error}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!canSubmit}
                  onPress={handleLogin}
                  className={`w-full overflow-hidden rounded-2xl shadow-lg shadow-blue-900/30 transition-opacity ${!canSubmit ? 'opacity-60' : 'opacity-100'}`}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#8b5cf6']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.primaryButton}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text className="text-center text-base font-semibold text-white">
                        Iniciar sesión
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.replace('/register')}
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10 active:bg-white/20"
                >
                  <Text className="text-center text-base font-semibold text-white">
                    ¿No tienes cuenta? Regístrate
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  glassCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(53,53,63,0.8)',
    backgroundColor: 'rgba(24,24,29,0.75)',
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    overflow: 'hidden',
    elevation: 16,
  },
  glassCardSizing: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
