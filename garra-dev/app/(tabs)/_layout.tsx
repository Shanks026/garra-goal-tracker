import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import { layout } from '@/theme/tokens';
import { Toast } from '@/components/ui/Toast';

// Three tabs: Today · Arc · Settings. Never a fourth (CLAUDE.md's hard constraints).
// Icons are line-drawn glyphs built from Views rather than Lucide imports, matching the canvas's
// own tab bar exactly (a ring, an arc, and three rules — none of which exist in Lucide).

function TodayIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 17, height: 17, borderRadius: 9, borderWidth: 2, borderColor: color }} />
  );
}

function ArcIcon({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 18,
        height: 9,
        borderWidth: 2,
        borderBottomWidth: 0,
        borderColor: color,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
      }}
    />
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 17, gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 2, borderRadius: 2, backgroundColor: color }} />
      ))}
    </View>
  );
}

export default function TabsLayout() {
  const { tokens } = useAppTheme();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: tokens.textPrimary,
          tabBarInactiveTintColor: tokens.tabInactive,
          tabBarStyle: {
            height: layout.tabBarH,
            backgroundColor: tokens.bg,
            borderTopWidth: 1,
            borderTopColor: tokens.border,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
          sceneStyle: { backgroundColor: tokens.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Today', tabBarIcon: ({ color }) => <TodayIcon color={color} /> }}
        />
        <Tabs.Screen
          name="arc"
          options={{ title: 'Arc', tabBarIcon: ({ color }) => <ArcIcon color={color} /> }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Settings', tabBarIcon: ({ color }) => <SettingsIcon color={color} /> }}
        />
      </Tabs>
      {/* Mounted here, not per-screen, so an undo toast survives a tab switch and renders above
          the tab bar. */}
      <Toast />
    </>
  );
}
