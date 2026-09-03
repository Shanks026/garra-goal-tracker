import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { copy } from '@/lib/copy';
import { useLocalProfileName } from '@/hooks/useArcBuilder';
import { useLogIn, useSignUp, MIN_PASSWORD_LENGTH } from '@/hooks/useSignIn';
import { useAndroidBack } from '@/hooks/useAndroidBack';
import { safeBack } from '@/lib/navigation';
import { Button } from '@/components/ui/Button';
import { fontFor } from '@/theme/fonts';
import { layout, radii } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';

// Email + password, in one screen with two modes.
//
// This replaced a bottom sheet. A sheet is for quick, single-purpose input dismissed in seconds
// (rules/02 §3); sign-up is four fields, two modes and a set of inline errors, which is a
// pushed screen by that same rule.
//
// Not designed — rules/01 §9. Built from the arc-creation screen's structure, which is itself
// the goal form's (screen 08): header → labelled fields → footer primary button + text link.
// Fields use the same filled-rounded treatment as `arc-new`, so the two read as one family.
//
// `mode` comes in as a param so Settings can open it straight into log-in while onboarding
// opens it into sign-up, without a second route.

export default function Auth() {
  const router = useRouter();
  const { tokens } = useAppTheme();
  const { mode } = useLocalSearchParams<{ mode?: 'login' | 'signup' }>();

  const [isLogIn, setIsLogIn] = useState(mode === 'login');

  // Prefilled from onboarding — the user already told us their name, and asking twice reads as
  // the app not paying attention.
  const savedName = useLocalProfileName().data;
  const [name, setName] = useState(savedName ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const signUp = useSignUp();
  const logIn = useLogIn();
  const busy = signUp.isPending || logIn.isPending;

  useAndroidBack(() => safeBack(router, '/signup'));

  const fieldStyle = {
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: tokens.fill,
  } as const;

  const submit = async () => {
    setError(null);

    // Deliberately no email-format check (user decision): Supabase rejects a malformed address
    // itself, and the message surfaces inline below.
    if (!email.trim()) return setError(copy.auth.errNoEmail);
    if (!password) return setError(copy.auth.errNoPassword);
    if (password.length < MIN_PASSWORD_LENGTH) return setError(copy.auth.errShortPassword);

    if (!isLogIn) {
      if (!name.trim()) return setError(copy.auth.errNoName);
      if (password !== confirm) return setError(copy.auth.errMismatch);
    }

    try {
      if (isLogIn) await logIn.mutateAsync({ email, password });
      else await signUp.mutateAsync({ email, password, name });
      // Straight to the tabs, not via `/` — the cold-start router re-derives from cached
      // queries and would bounce back into the builder. See signup.tsx's `goHome`.
      router.navigate('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work. Try again.');
    }
  };

  const swapMode = () => {
    setIsLogIn((v) => !v);
    setError(null);
    setConfirm('');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 28,
          paddingTop: layout.screenTop,
          paddingBottom: layout.contentBottom,
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3">
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{
              fontSize: 38,
              fontFamily: fontFor(600, 'display'),
              fontWeight: '600',
              letterSpacing: -1.33,
              lineHeight: 42,
            }}
          >
            {isLogIn ? copy.auth.logInTitle : copy.auth.signUpTitle}
          </Text>
          <Text className="font-body text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark">
            {isLogIn ? copy.auth.logInBody : copy.auth.signUpBody}
          </Text>
        </View>

        {/* Name only on sign-up — logging in already knows who you are. */}
        {!isLogIn ? (
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
              {copy.auth.nameLabel}
            </Text>
            <TextInput
              className="font-body text-[17px] text-text-primary dark:text-text-primary-dark"
              style={fieldStyle}
              value={name}
              onChangeText={setName}
              placeholder={copy.auth.namePlaceholder}
              placeholderTextColor={tokens.textQuaternary}
              autoCapitalize="words"
              maxLength={40}
            />
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {copy.auth.emailLabel}
          </Text>
          <TextInput
            className="font-body text-[17px] text-text-primary dark:text-text-primary-dark"
            style={fieldStyle}
            value={email}
            onChangeText={setEmail}
            placeholder={copy.auth.emailPlaceholder}
            placeholderTextColor={tokens.textQuaternary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </View>

        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {copy.auth.passwordLabel}
          </Text>
          <TextInput
            className="font-body text-[17px] text-text-primary dark:text-text-primary-dark"
            style={fieldStyle}
            value={password}
            onChangeText={setPassword}
            placeholder={copy.auth.passwordPlaceholder}
            placeholderTextColor={tokens.textQuaternary}
            secureTextEntry
            autoCapitalize="none"
            // `newPassword` on sign-up lets the OS offer to generate and save one; `password`
            // on log-in lets it autofill an existing entry.
            textContentType={isLogIn ? 'password' : 'newPassword'}
          />
        </View>

        {!isLogIn ? (
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
              {copy.auth.confirmLabel}
            </Text>
            <TextInput
              className="font-body text-[17px] text-text-primary dark:text-text-primary-dark"
              style={fieldStyle}
              value={confirm}
              onChangeText={setConfirm}
              placeholder={copy.auth.passwordPlaceholder}
              placeholderTextColor={tokens.textQuaternary}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
            />
          </View>
        ) : null}

        {/* Inline, never a toast — rules/02 §5. */}
        {error ? (
          <Text className="font-body text-[14px] leading-5 text-text-secondary dark:text-text-secondary-dark">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View className="items-center gap-4 px-7 pb-screen-bottom">
        <Button
          title={busy ? 'Working…' : isLogIn ? copy.auth.logInCta : copy.auth.createCta}
          onPress={() => void submit()}
          disabled={busy}
          style={{ width: '100%' }}
        />
        <Pressable onPress={swapMode} hitSlop={8} disabled={busy}>
          <Text className="font-body text-[15px] text-text-tertiary dark:text-text-tertiary-dark">
            {isLogIn ? copy.auth.toSignUp : copy.auth.toLogIn}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
