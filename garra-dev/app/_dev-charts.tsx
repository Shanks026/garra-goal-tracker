// Dev-only kitchen-sink route — Phase 2.6. NOT deleted at the end of this phase; it's kept as
// a living reference for however long the design system keeps evolving (leading underscore
// signals "not a real screen," per the file's own purpose).
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import { ACCENTS } from '@/theme/tokens';
import { PaceRing } from '@/components/charts/PaceRing';
import { ArcSweep } from '@/components/charts/ArcSweep';
import { Mosaic } from '@/components/charts/Mosaic';
import { WeekBars } from '@/components/charts/WeekBars';
import { WindowTicks } from '@/components/charts/WindowTicks';
import { BurnUp } from '@/components/charts/BurnUp';
import { Momentum } from '@/components/charts/Momentum';
import { LoadDonut } from '@/components/charts/LoadDonut';
import { CheckpointSpine } from '@/components/charts/CheckpointSpine';
import {
  fixtureBurnUpPoints,
  fixtureCheckpoints,
  fixtureLoadShares,
  fixtureMomentumPoints,
  fixtureMosaicCells,
  fixtureWeekBars,
} from '@/components/charts/__fixtures__/chartFixtures';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';
import { StatusPill } from '@/components/ui/StatusPill';
import { Checkbox } from '@/components/ui/Checkbox';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { NumPad } from '@/components/ui/NumPad';
import { Sheet, type SheetRef } from '@/sheets/Sheet';
import { fontFor } from '@/theme/fonts';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 40, gap: 12 }}>
      <SectionLabel label={title} />
      {children}
    </View>
  );
}

export default function DevCharts() {
  const { colorScheme, setColorScheme } = useAppTheme();
  const [checked, setChecked] = useState(false);
  const [numPadValue, setNumPadValue] = useState('');
  const sheetRef = useRef<SheetRef>(null);

  const day = 34;
  const total = 122;

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 28, fontFamily: fontFor(600, 'display'), fontWeight: '600', letterSpacing: -0.03 * 28 }}
          >
            Chart & UI kitchen sink
          </Text>
          <Button
            title={colorScheme === 'dark' ? 'Light' : 'Dark'}
            variant="outline"
            onPress={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
          />
        </View>

        <Section title="PaceRing">
          <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
            <PaceRing
              p={0.41}
              t={0.28}
              accent={ACCENTS.coral}
              accessibilityLabel="Demo, ahead of pace"
            />
            <PaceRing
              p={0.235}
              t={0.28}
              accent={ACCENTS.teal}
              accessibilityLabel="Demo, behind pace"
            />
            <PaceRing
              p={0.28}
              t={0.28}
              accent={ACCENTS.sky}
              accessibilityLabel="Demo, exactly on pace"
            />
            <PaceRing
              p={0.235}
              t={0.28}
              accent={ACCENTS.teal}
              size="row"
              accessibilityLabel="Demo row ring, behind pace"
            />
          </View>
        </Section>

        <Section title="ArcSweep">
          <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
            <ArcSweep p={day / total} size="home" />
            <ArcSweep p={day / total} size="onboarding" />
            <ArcSweep p={day / total} size="builder" />
          </View>
        </Section>

        <Section title="Mosaic">
          <Mosaic
            cells={fixtureMosaicCells(122, day, 3)}
            accent={ACCENTS.indigo}
            columns={14}
            width={342}
          />
          <Mosaic
            cells={fixtureMosaicCells(122, day, 9)}
            accent={ACCENTS.teal}
            columns={20}
            width={342}
          />
          <Mosaic
            cells={fixtureMosaicCells(7, 5, 5)}
            accent={ACCENTS.indigo}
            columns={7}
            width={200}
          />
        </Section>

        <Section title="WeekBars">
          <WeekBars bars={fixtureWeekBars} accent={ACCENTS.teal} />
        </Section>

        <Section title="WindowTicks">
          <WindowTicks totalDays={122} width={342} startDate="2026-09-01" />
        </Section>

        <Section title="BurnUp — behind pace">
          <BurnUp
            points={fixtureBurnUpPoints(day, 188, 342, 112, 40)}
            win={40}
            day={day}
            accent={ACCENTS.teal}
          />
        </Section>

        <Section title="BurnUp — ahead of pace">
          {/* Expected-by-day-34 is ~223 (800 * 34/122); the window's own y-ceiling is ~262
              (800 * 40/122) — 245 is genuinely ahead without clipping off the visible chart,
              unlike the 620 this briefly had (a fixture-data bug, not a component bug). */}
          <BurnUp
            points={fixtureBurnUpPoints(day, 245, 342, 112, 40)}
            win={40}
            day={day}
            accent={ACCENTS.violet}
          />
        </Section>

        <Section title="Momentum">
          <Momentum points={fixtureMomentumPoints()} />
        </Section>

        <Section title="LoadDonut">
          <LoadDonut segments={fixtureLoadShares} totalLabel="19h 15m" />
        </Section>

        <Section title="CheckpointSpine">
          <CheckpointSpine checkpoints={fixtureCheckpoints} accent={ACCENTS.violet} />
        </Section>

        <Section title="Button">
          <View style={{ gap: 8 }}>
            <Button title="Primary" variant="primary" onPress={() => {}} />
            <Button title="Secondary" variant="secondary" onPress={() => {}} />
            <Button title="Outline" variant="outline" onPress={() => {}} />
          </View>
        </Section>

        <Section title="Chip">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Filter" onPress={() => {}} />
            <Chip label="Selected" selected onPress={() => {}} />
            <Chip label="Intent" variant="intent" onPress={() => {}} />
          </View>
        </Section>

        <Section title="ListGroup / ListRow">
          <ListGroup>
            <ListRow label="Cycling" value="800 km" onPress={() => {}} />
            <ListRow label="Writing" value="daily" onPress={() => {}} />
            <ListRow label="Strength" onPress={() => {}} />
          </ListGroup>
        </Section>

        <Section title="StatusPill">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatusPill label="Locked in" status="neutral" />
            <StatusPill label="Slipping" status="slipping" />
          </View>
        </Section>

        <Section title="Checkbox">
          <Checkbox checked={checked} onToggle={setChecked} accent={ACCENTS.coral} />
        </Section>

        <Section title="NumPad">
          <Text className="font-body text-text-secondary dark:text-text-secondary-dark">
            {numPadValue || '0'}
          </Text>
          <NumPad
            onKeyPress={(key) => {
              if (key === '⌫') setNumPadValue((v) => v.slice(0, -1));
              else setNumPadValue((v) => v + key);
            }}
          />
        </Section>

        <Section title="Sheet">
          <Button title="Open sheet" onPress={() => sheetRef.current?.present()} />
        </Section>
      </ScrollView>

      <Sheet ref={sheetRef}>
        <Text className="font-body text-text-primary dark:text-text-primary-dark">
          Press the Android back button — this should close the sheet, not exit the app.
        </Text>
      </Sheet>
    </View>
  );
}
