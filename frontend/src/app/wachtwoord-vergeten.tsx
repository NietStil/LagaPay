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
import { router, useLocalSearchParams } from 'expo-router';

import { foutmelding, wachtwoordVergeten } from '@/lib/api/lagapay';

/**
 * Wachtwoord vergeten: asks the backend to mail a reset link. The new wachtwoord is set on the website
 * (the link opens the browser), after which the user logs in here again.
 */
export default function WachtwoordVergetenScreen() {
  // The login screen passes on what was already typed there.
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [verstuurdNaar, setVerstuurdNaar] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const terugNaarLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  const handleVersturen = async () => {
    const adres = email.trim();
    if (!adres) {
      setError('Vul je e-mailadres in.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      setMelding(await wachtwoordVergeten(adres));
      setVerstuurdNaar(adres);
    } catch (err: any) {
      setError(
        err?.response?.status === 429
          ? 'Te veel pogingen. Wacht een minuut en probeer het opnieuw.'
          : foutmelding(err, 'Versturen mislukt. Probeer het opnieuw.'),
      );
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
          <SafeAreaView edges={['top', 'left', 'right']} className="w-full max-w-md mx-auto items-center my-auto">

            {/* Header */}
            <View className="items-center mb-8">
              <Text className="text-3xl font-bold text-white tracking-tight text-center">
                Wachtwoord Vergeten
              </Text>
              <Text className="text-zinc-400 mt-2 text-base text-center">
                Vul je e-mailadres in en we sturen je een link om een nieuw wachtwoord in te stellen
              </Text>
            </View>

            {/* Card Container */}
            <View className="w-full bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-xl">

              {verstuurdNaar ? (
                <View className="items-center">
                  <View className="w-14 h-14 rounded-full bg-purple-950/50 border border-purple-800/50 items-center justify-center mb-4">
                    <Text className="text-purple-300 text-2xl font-bold">✓</Text>
                  </View>
                  <Text className="text-white text-lg font-semibold text-center">Controleer je inbox</Text>
                  <Text className="text-zinc-400 text-base text-center mt-2">{melding}</Text>
                  <Text className="text-zinc-500 text-sm text-center mt-3">
                    Verstuurd naar <Text className="text-zinc-300 font-medium">{verstuurdNaar}</Text>. Open de link,
                    kies een nieuw wachtwoord en log daarna hier in.
                  </Text>

                  <TouchableOpacity
                    onPress={terugNaarLogin}
                    className="w-full mt-6 py-4 px-4 bg-purple-700 active:bg-purple-800 rounded-2xl items-center justify-center"
                  >
                    <Text className="text-white font-bold text-base">Terug naar inloggen</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setVerstuurdNaar(null)} className="mt-4 p-2">
                    <Text className="text-purple-400 font-semibold text-base">Ander e-mailadres gebruiken</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="space-y-5">
                  {/* Validation Errors */}
                  {error && (
                    <View className="mb-2 p-4 rounded-xl bg-rose-950/40 border border-rose-800/50">
                      <Text className="text-rose-300 text-sm font-medium">{error}</Text>
                    </View>
                  )}

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
                      returnKeyType="send"
                      onSubmitEditing={handleVersturen}
                    />
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    onPress={handleVersturen}
                    disabled={isSubmitting}
                    className="w-full mt-2 py-4 px-4 bg-purple-700 active:bg-purple-800 rounded-2xl items-center justify-center flex-row opacity-100 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text className="text-white font-bold text-base">Herstellink versturen</Text>
                    )}
                  </TouchableOpacity>

                  {/* Back to login */}
                  <View className="flex-row justify-center items-center mt-6 pt-4 border-t border-zinc-800">
                    <Text className="text-zinc-400 text-base">Weet je je wachtwoord weer? </Text>
                    <TouchableOpacity onPress={terugNaarLogin}>
                      <Text className="text-purple-400 font-semibold text-base">Inloggen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </SafeAreaView>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
