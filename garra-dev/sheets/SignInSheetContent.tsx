import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useSendCode, useVerifyCode } from '@/hooks/useSignIn';
import { useAppTheme } from '@/theme/useAppTheme';

// Not designed (rules/01 §9). Extends the log-sheet shell, same as the rescope sheet in Phase 6.
//
// Deliberately the OS keyboard, not the custom numpad. The numpad exists to keep the log path
// under ten seconds (rules/01 §7); this is not the log path, and the OS keyboard is *better*
// here — `textContentType="oneTimeCode"` lets iOS autofill the code straight from the email,
// which no custom numpad can do.
export function SignInSheetContent({ onDone }: { onDone: () => void }) {
  const { tokens } = useAppTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  // Inline, never a toast — rules/02 §5: a toast for validation is wrong.
  const [error, setError] = useState<string | null>(null);

  const sendCode = useSendCode();
  const verifyCode = useVerifyCode();

  const inputClass = 'text-[17px] text-text-primary dark:text-text-primary-dark';
  const inputStyle = {
    height: 54,
    borderRadius: 28,
    paddingHorizontal: 20,
    backgroundColor: tokens.fill,
  } as const;

  const onSend = async () => {
    setError(null);
    if (!email.includes('@')) {
      setError('Enter an email address.');
      return;
    }
    try {
      await sendCode.mutateAsync(email);
      setStage('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code.');
    }
  };

  const onVerify = async () => {
    setError(null);
    if (code.trim().length < 6) {
      setError('Enter the six-digit code.');
      return;
    }
    try {
      await verifyCode.mutateAsync({ email, code });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code did not work.');
    }
  };

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
          {stage === 'email' ? 'SIGN IN' : 'CHECK YOUR EMAIL'}
        </Text>
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.6 }}
        >
          {stage === 'email' ? 'Keep this arc safe.' : `Code sent to ${email}`}
        </Text>
      </View>

      {stage === 'email' ? (
        <>
          <TextInput
            className={inputClass}
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={tokens.textQuaternary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoFocus
            onSubmitEditing={onSend}
          />
          <Button
            title={sendCode.isPending ? 'Sending…' : 'Send code'}
            onPress={onSend}
            disabled={sendCode.isPending}
          />
        </>
      ) : (
        <>
          <TextInput
            className={inputClass}
            style={[inputStyle, { letterSpacing: 6, fontVariant: ['tabular-nums'] }]}
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            placeholderTextColor={tokens.textQuaternary}
            keyboardType="number-pad"
            // Lets iOS pull the code out of the email without leaving the app.
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
            onSubmitEditing={onVerify}
          />
          <Button
            title={verifyCode.isPending ? 'Signing in…' : 'Sign in'}
            onPress={onVerify}
            disabled={verifyCode.isPending}
          />
          <Pressable onPress={() => setStage('email')} hitSlop={8}>
            <Text className="text-center text-[15px] text-text-tertiary dark:text-text-tertiary-dark">
              Use a different email
            </Text>
          </Pressable>
        </>
      )}

      {error ? (
        <Text className="text-[14px] text-text-secondary dark:text-text-secondary-dark">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
