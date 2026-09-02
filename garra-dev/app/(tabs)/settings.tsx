import { useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Sheet, type SheetRef } from '@/sheets/Sheet';
import { SignInSheetContent } from '@/sheets/SignInSheetContent';
import { useAuth } from '@/hooks/useAuth';
import { useSignOut } from '@/hooks/useSignIn';
import { useLocalProfileName } from '@/hooks/useArcBuilder';
import { useSyncStatus } from '@/hooks/useSyncStatus';

// Settings is not designed (rules/01 §9) — a standard inset grouped list. Phase 12 builds the
// rest of it; Phase 8 adds only the account group, because sync state has to live somewhere and
// rules/03 §7 says that somewhere is Settings and nowhere else.
export default function SettingsTab() {
  const { session, email } = useAuth();
  const signOut = useSignOut();
  const profileName = useLocalProfileName().data;
  const signedIn = !!session;
  const syncStatus = useSyncStatus(signedIn);
  const sheetRef = useRef<SheetRef>(null);
  const [sheetMounted, setSheetMounted] = useState(false);

  const openSignIn = () => {
    setSheetMounted(true);
    // The modal has to exist before it can be presented; mounting and presenting in the same
    // frame leaves the ref null.
    requestAnimationFrame(() => sheetRef.current?.present());
  };

  const confirmSignOut = () => {
    // rules/02 §5: Alert with a destructive button, and only for genuinely destructive actions.
    // Signing out isn't destructive here — every row stays on the device — so the copy says so
    // rather than implying data loss.
    Alert.alert('Sign out?', 'Your arc stays on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut.mutateAsync() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.84, marginTop: 8 }}
        >
          Settings
        </Text>

        <View style={{ marginTop: 24, gap: 8 }}>
          <SectionLabel label="ACCOUNT" context="detail" />
          <ListGroup>
            {session === undefined ? (
              // Reading the keychain is genuinely async on a cold start. Showing nothing beats
              // flashing "Sign in" at someone who is already signed in.
              <ListRow label="Account" value="…" />
            ) : signedIn ? (
              <>
                <ListRow label="Signed in" value={email ?? '—'} />
                <ListRow
                  label={signOut.isPending ? 'Signing out…' : 'Sign out'}
                  onPress={confirmSignOut}
                  disabled={signOut.isPending}
                />
              </>
            ) : (
              <ListRow label="Sign in" value="Keep this arc safe" onPress={openSignIn} />
            )}
            {/* The quiet indicator. Plain text in the value column — deliberately no dot and no
                color: amber means *slipping*, and dressing "no wifi" as a warning would conflate
                a network condition with being behind on goals (rules/01 §0). */}
            <ListRow label="Sync" value={syncStatus.data?.label ?? '—'} />
          </ListGroup>
          {profileName ? (
            <Text className="px-4 text-[13px] text-text-quaternary dark:text-text-quaternary-dark">
              Signed up as {profileName}
            </Text>
          ) : null}
        </View>

        <View style={{ marginTop: 28, gap: 8 }}>
          <SectionLabel label="ABOUT" context="detail" />
          <ListGroup>
            <ListRow label="More settings" value="Phase 12" />
          </ListGroup>
        </View>
      </ScrollView>

      {sheetMounted ? (
        <Sheet ref={sheetRef} snapPoints={['62%']}>
          <SignInSheetContent onDone={() => sheetRef.current?.dismiss()} />
        </Sheet>
      ) : null}
    </SafeAreaView>
  );
}
