import {
  Bike,
  BookOpen,
  Dumbbell,
  Languages,
  Moon,
  Music,
  PenLine,
  Rocket,
  Scale,
  Smartphone,
  type LucideIcon,
} from 'lucide-react-native';

// Goals reference a curated icon key, not a component (02-ui-components.md §6) — this is the
// key -> Lucide-component map, and the only place that imports these icons ad hoc.
export const GOAL_ICON_KEYS = [
  'bike',
  'music',
  'pen-line',
  'languages',
  'dumbbell',
  'book-open',
  'rocket',
  'moon',
  'smartphone',
  'scale',
] as const;

export type GoalIconKey = (typeof GOAL_ICON_KEYS)[number];

export const ICONS_BY_KEY: Record<GoalIconKey, LucideIcon> = {
  bike: Bike,
  music: Music,
  'pen-line': PenLine,
  languages: Languages,
  dumbbell: Dumbbell,
  'book-open': BookOpen,
  rocket: Rocket,
  moon: Moon,
  smartphone: Smartphone,
  scale: Scale,
};

export type GoalIconProps = {
  icon: string;
  size?: number;
  color: string;
};

export function GoalIcon({ icon, size = 20, color }: GoalIconProps) {
  const Icon = ICONS_BY_KEY[icon as GoalIconKey] ?? Bike;
  return <Icon size={size} color={color} />;
}
