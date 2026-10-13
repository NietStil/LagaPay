import React, { useState } from 'react';
import {
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [wachtwoord, setWachtwoord] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, loginWithGoogle } = useAuth();

  const handleLogin = async () => {
    if (!email || !wachtwoord) {
      setError('Vul a.u.b. alle velden in.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, wachtwoord);
      // Navigation happens in the auth guard (src/app/_layout.tsx), which also continues a pending deep link.
    } catch (err: any) {
      console.error('Login error:', err);
      const serverMessage =
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.message ||
        err.message ||
        'Inloggen mislukt. Controleer je gegevens.';
      setError(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
      // Navigation happens in the auth guard (src/app/_layout.tsx).
    } catch (err: any) {
      console.error('Google Login error:', err);
      setError(err.message || 'Inloggen met Google mislukt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-zinc-950"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24, paddingHorizontal: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SafeAreaView className="w-full max-w-md mx-auto items-center my-auto">

            {/* Brand Header */}
            <View className="items-center mb-8">
              <Text className="text-3xl font-bold text-white tracking-tight text-center">
                Welkom Terug
              </Text>
              <Text className="text-zinc-400 mt-2 text-base text-center">
                Vul je gegevens in om in te loggen op LagaPay
              </Text>
            </View>

            {/* Card Container */}
            <View className="w-full bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-xl">

              {/* Validation Errors */}
              {error && (
                <View className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/50">
                  <Text className="text-rose-300 text-sm font-medium">{error}</Text>
                </View>
              )}

              <View className="space-y-5">
                {/* Email Field */}
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5">
                    E-mailadres
                  </Text>
                  <TextInput
                    className="w-full px-4 py-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 text-base"
                    placeholder="naam@voorbeeld.nl"
                    placeholderTextColor="#71717a"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </View>

                {/* Wachtwoord Field */}
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5">
                    Wachtwoord
                  </Text>
                  <View className="relative justify-center">
                    <TextInput
                      className="w-full px-4 pr-16 py-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 text-base"
                      placeholder="••••••••"
                      placeholderTextColor="#71717a"
                      value={wachtwoord}
                      onChangeText={setWachtwoord}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-4 p-2"
                    >
                      <Text className="text-zinc-400 text-xs font-medium">
                        {showPassword ? 'Verberg' : 'Toon'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Remember Me Checkbox */}
                <View className="flex-row items-center justify-between pt-1">
                  <TouchableOpacity
                    onPress={() => setRememberMe(!rememberMe)}
                    className="flex-row items-center space-x-3"
                  >
                    <View
                      className={`w-6 h-6 rounded-lg border items-center justify-center ${
                        rememberMe
                          ? 'bg-purple-700 border-purple-700'
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                    />
                    <Text className="text-base font-medium text-zinc-300 ml-2">Onthoud mij</Text>
                  </TouchableOpacity>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isSubmitting}
                  className="w-full mt-2 py-4 px-4 bg-purple-700 active:bg-purple-800 rounded-2xl items-center justify-center flex-row opacity-100 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-base">Inloggen</Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View className="flex-row items-center my-4">
                  <View className="flex-1 h-[1px] bg-zinc-800" />
                  <Text className="mx-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Of ga verder met
                  </Text>
                  <View className="flex-1 h-[1px] bg-zinc-800" />
                </View>

                {/* Google Login Button */}
                <TouchableOpacity
                  onPress={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full flex-row items-center justify-center gap-3 py-4 px-4 bg-zinc-950 active:bg-zinc-800 border border-zinc-800 rounded-2xl"
                >
                  <Text className="text-zinc-200 font-semibold text-base">
                    Inloggen met Google
                  </Text>
                </TouchableOpacity>

                {/* Footer Link to Register */}
                <View className="flex-row justify-center items-center mt-6 pt-4 border-t border-zinc-800">
                  <Text className="text-zinc-400 text-base">Nog geen account? </Text>
                  <TouchableOpacity onPress={() => router.push('/register')}>
                    <Text className="text-purple-400 font-semibold text-base">Registreren</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          </SafeAreaView>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
