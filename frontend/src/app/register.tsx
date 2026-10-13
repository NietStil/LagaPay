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

export default function RegisterScreen() {
  const [voornaam, setVoornaam] = useState('');
  const [tussenvoegsels, setTussenvoegsels] = useState('');
  const [achternaam, setAchternaam] = useState('');
  const [email, setEmail] = useState('');
  const [wachtwoord, setWachtwoord] = useState('');
  const [wachtwoordConfirmation, setWachtwoordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();

  const handleRegister = async () => {
    if (!voornaam || !achternaam || !email || !wachtwoord || !wachtwoordConfirmation) {
      setError('Vul a.u.b. alle verplichte velden in.');
      return;
    }

    if (wachtwoord !== wachtwoordConfirmation) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }

    if (wachtwoord.length < 8) {
      setError('Het wachtwoord moet minimaal 8 tekens bevatten.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        voornaam,
        tussenvoegsels: tussenvoegsels || undefined,
        achternaam,
        email,
        wachtwoord,
      });
      // Navigation happens in the auth guard (src/app/_layout.tsx), which also continues a pending deep link.
    } catch (err: any) {
      console.log('Register error details:', err.response?.data || err.message);

      const responseData = err.response?.data;
      let serverMessage = 'Registreren mislukt. Controleer je gegevens.';

      if (responseData?.errors) {
        const firstErrorKey = Object.keys(responseData.errors)[0];
        if (firstErrorKey && responseData.errors[firstErrorKey][0]) {
          serverMessage = responseData.errors[firstErrorKey][0];
        }
      } else if (responseData?.message) {
        serverMessage = responseData.message;
      }

      setError(serverMessage);
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
                Account Aanmaken
              </Text>
              <Text className="text-zinc-400 mt-2 text-base text-center">
                Vul je gegevens in om je te registreren bij LagaPay
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
                {/* Voornaam Field */}
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5">
                    Voornaam *
                  </Text>
                  <TextInput
                    className="w-full px-4 py-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 text-base"
                    placeholder="Voornaam"
                    placeholderTextColor="#71717a"
                    value={voornaam}
                    onChangeText={setVoornaam}
                    autoComplete="name"
                  />
                </View>

                {/* Tussenvoegsel Field */}
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5">
                    Tussenvoegsel
                  </Text>
                  <TextInput
                    className="w-full px-4 py-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 text-base"
                    placeholder="Tussenvoegsel (bijv. van, de)"
                    placeholderTextColor="#71717a"
                    value={tussenvoegsels}
                    onChangeText={setTussenvoegsels}
                  />
                </View>

                {/* Achternaam Field */}
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5">
                    Achternaam *
                  </Text>
                  <TextInput
                    className="w-full px-4 py-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 text-base"
                    placeholder="Achternaam"
                    placeholderTextColor="#71717a"
                    value={achternaam}
                    onChangeText={setAchternaam}
                    autoComplete="family-name"
                  />
                </View>

                {/* Email Field */}
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5">
                    E-mailadres *
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
                    Wachtwoord *
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

                {/* Bevestig Wachtwoord Field */}
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5">
                    Bevestig Wachtwoord *
                  </Text>
                  <TextInput
                    className="w-full px-4 py-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 text-base"
                    placeholder="••••••••"
                    placeholderTextColor="#71717a"
                    value={wachtwoordConfirmation}
                    onChangeText={setWachtwoordConfirmation}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={isSubmitting}
                  className="w-full mt-2 py-4 px-4 bg-purple-700 active:bg-purple-800 rounded-2xl items-center justify-center flex-row opacity-100 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-base">Account Aanmaken</Text>
                  )}
                </TouchableOpacity>

                {/* Footer Link to Login */}
                <View className="flex-row justify-center items-center mt-6 pt-4 border-t border-zinc-800">
                  <Text className="text-zinc-400 text-base">Al een account? </Text>
                  <TouchableOpacity onPress={() => router.push('/login')}>
                    <Text className="text-purple-400 font-semibold text-base">Inloggen</Text>
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