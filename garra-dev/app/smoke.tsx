// Phase 0.2 throwaway smoke test — one section per native-dependency check.
// Deleted at the end of Phase 1. See .claude/features/01-project-initialization.md §0.2.2.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Button, ScrollView, Text, View } from 'react-native';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import * as SQLite from 'expo-sqlite';
import { createMMKV } from 'react-native-mmkv';

const db = SQLite.openDatabaseSync('smoke.db');
db.execSync(
  'CREATE TABLE IF NOT EXISTS smoke (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL)',
);

const mmkv = createMMKV();

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 32, gap: 8 }}>
      <Text style={{ fontWeight: '600', fontSize: 15 }}>{title}</Text>
      {children}
    </View>
  );
}

function SkiaCheck() {
  // Same half-sweep, round-cap primitive as ArcSweep (rules/01-design-system.md §4.1).
  const arc = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc({ x: 20, y: 20, width: 80, height: 80 }, 180, 180);
    return path;
  }, []);

  return (
    <Section title="1 & 2 — Skia circle + stroked round-cap arc">
      <Canvas style={{ width: 200, height: 130 }}>
        <Circle cx={60} cy={65} r={36} color="#5B6CFF" />
        <Path
          path={arc}
          style="stroke"
          strokeWidth={14}
          strokeCap="round"
          color="#FFB020"
          transform={[{ translateX: 90 }]}
        />
      </Canvas>
      <Text>Pass: a filled circle and a rounded-cap arc both render, no redbox.</Text>
    </Section>
  );
}

function ReanimatedCheck() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Section title="3 — Reanimated withSpring">
      <Animated.View
        style={[{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#22C7B4' }, style]}
      />
      <Button title="Animate" onPress={() => (x.value = withSpring(x.value === 0 ? 220 : 0))} />
      <Text>Pass: box springs smoothly, no &quot;failed to create a worklet&quot; error.</Text>
    </Section>
  );
}

function GestureCheck() {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const pan = Gesture.Pan().onChange((e) => {
    x.value += e.changeX;
    y.value += e.changeY;
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Section title="4 — Gesture Pan">
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF6B5A' }, style]}
        />
      </GestureDetector>
      <Text>Pass: the circle follows your finger.</Text>
    </Section>
  );
}

function SheetCheck() {
  const ref = useRef<BottomSheetModal>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      ref.current?.dismiss();
      return true;
    });
    return () => sub.remove();
  }, [open]);

  return (
    <Section title="5 — Bottom sheet + Android back">
      <Button title="Open sheet" onPress={() => ref.current?.present()} />
      <Text>
        Pass: opens and closes normally, AND pressing the Android hardware back button while open
        closes the sheet — the app must not exit.
      </Text>
      <BottomSheetModal ref={ref} onChange={(index) => setOpen(index >= 0)}>
        <BottomSheetView style={{ padding: 24 }}>
          <Text>Press the Android back button now.</Text>
        </BottomSheetView>
      </BottomSheetModal>
    </Section>
  );
}

function SqliteCheck() {
  const [rows, setRows] = useState<{ id: number; created_at: string }[]>([]);

  const refresh = useCallback(() => {
    setRows(db.getAllSync('SELECT * FROM smoke ORDER BY id DESC LIMIT 5'));
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <Section title="6 — SQLite persistence">
      <Text>{rows.length} row(s) stored.</Text>
      <Button
        title="Insert row"
        onPress={() => {
          db.runSync('INSERT INTO smoke (created_at) VALUES (?)', new Date().toISOString());
          refresh();
        }}
      />
      {rows.map((r) => (
        <Text key={r.id}>
          #{r.id} — {r.created_at}
        </Text>
      ))}
      <Text>
        Pass: insert a row, then FULLY kill the app (not just background it) and relaunch — the row
        must still be here.
      </Text>
    </Section>
  );
}

function MmkvCheck() {
  const [value, setValue] = useState<string | null>(() => mmkv.getString('smoke_value') ?? null);

  return (
    <Section title="7 — MMKV persistence">
      <Text>Stored value: {value ?? '(none yet)'}</Text>
      <Button
        title="Write timestamp"
        onPress={() => {
          const v = new Date().toISOString();
          mmkv.set('smoke_value', v);
          setValue(v);
        }}
      />
      <Text>
        Pass: write a value, then FULLY kill the app and relaunch — it must still show here before
        you tap Write again.
      </Text>
    </Section>
  );
}

function NativeWindCheck() {
  return (
    <Section title="8 — NativeWind className">
      <View className="rounded-xl bg-indigo-500 p-6">
        <Text className="text-white">Styled via NativeWind</Text>
      </View>
      <Text>Pass: the box above shows an indigo background and visible padding.</Text>
    </Section>
  );
}

export default function Smoke() {
  return (
    <BottomSheetModalProvider>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 24 }}>
          Phase 0.2 — Smoke checks
        </Text>
        <SkiaCheck />
        <ReanimatedCheck />
        <GestureCheck />
        <SheetCheck />
        <SqliteCheck />
        <MmkvCheck />
        <NativeWindCheck />
      </ScrollView>
    </BottomSheetModalProvider>
  );
}
