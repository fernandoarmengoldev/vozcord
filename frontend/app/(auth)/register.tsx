import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSession } from '../../lib/useSession';

// Expresión regular para validar email
const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function Register() {
  const router = useRouter();
  const { register, isLoading, isAuthenticated, error, clearError } = useSession();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Si ya está autenticado, redirigir a main
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/main');
    }
  }, [isLoading, isAuthenticated, router]);

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue.trim()) {
      setEmailError('El correo electrónico es requerido');
      return false;
    }

    if (!EMAIL_REGEX.test(emailValue)) {
      setEmailError('Por favor, introduce un correo electrónico válido');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleRegister = async () => {
    if (isSubmitting) return;

    // Validar email antes de enviar
    if (!validateEmail(email)) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    const success = await register({ email, name, password });

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

  const canSubmit = Boolean(email.trim()) && Boolean(name.trim()) && Boolean(password.trim()) && !isSubmitting && !emailError;

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
              <View className="gap-10">
                <View className="gap-2">
                  <Text className="text-3xl font-semibold text-white">Crear una cuenta</Text>
                  <Text className="text-base text-neutral-200/70">
                    Introduce tu correo, nombre y contraseña para continuar.
                  </Text>
                </View>

                <View className="gap-6">
                  <View className="gap-2">
                    <Text className="text-sm font-bold text-neutral-100">Correo electrónico</Text>
                    <TextInput
                      className={`w-full rounded-2xl border ${emailError ? 'border-red-400/50' : 'border-white/15'} bg-white/10 px-4 py-3 text-base text-white shadow-lg shadow-blue-900/20`}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setEmailError('');
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
                    {emailError && (
                      <Text className="text-sm text-red-400 font-medium">
                        {emailError}
                      </Text>
                    )}
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-bold text-neutral-100">Nombre</Text>
                    <TextInput
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white shadow-lg shadow-blue-900/20"
                      value={name}
                      onChangeText={(text) => {
                        setName(text);
                        clearError();
                      }}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                      editable={!isSubmitting}
                      selectionColor="#60a5fa"
                      placeholder="Tu nombre"
                      placeholderTextColor="rgba(163,163,163,0.5)"
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-medium text-neutral-100">Contraseña</Text>
                    <TextInput
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white shadow-lg shadow-blue-900/20"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        clearError();
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
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
                  onPress={handleRegister}
                  className={`w-full overflow-hidden rounded-2xl shadow-lg shadow-blue-900/30 ${!canSubmit ? 'opacity-60' : ''}`}
                >
                  <LinearGradient
                    colors={['#2563eb', '#7c3aed']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.primaryButton}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text className="text-center text-base font-semibold text-white">
                        Crear cuenta
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.replace('/login')}
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
                >
                  <Text className="text-center text-base font-semibold text-white">
                    ¿Ya tienes cuenta? Inicia sesión
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
