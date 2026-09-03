import {
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Camera,
  ChefHat,
  Code,
  Drum,
  Dumbbell,
  Footprints,
  GraduationCap,
  Languages,
  Mic,
  Moon,
  Mountain,
  Music,
  Palette,
  PenLine,
  PersonStanding,
  Piano,
  Puzzle,
  Rocket,
  Scale,
  Smartphone,
  Sprout,
  Video,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';

// Goals reference a curated icon key, not a component (02-ui-components.md §6) — this is the
// key -> Lucide-component map, and the only place that imports these icons ad hoc.
// The first ten are the canvas's own set (rules/02 §6). The rest were added when the intent
// catalog was broadened past the canvas's seven examples — same library, same curated-key
// discipline: a goal still references a key, never a component.
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
  'footprints',
  'waves',
  'brain',
  'person-standing',
  'code',
  'palette',
  'camera',
  'piano',
  'mic',
  'chef-hat',
  'graduation-cap',
  'video',
  'sprout',
  'briefcase',
  'puzzle',
  'mountain',
  'drum',
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
  footprints: Footprints,
  waves: Waves,
  brain: Brain,
  'person-standing': PersonStanding,
  code: Code,
  palette: Palette,
  camera: Camera,
  piano: Piano,
  mic: Mic,
  'chef-hat': ChefHat,
  'graduation-cap': GraduationCap,
  video: Video,
  sprout: Sprout,
  briefcase: Briefcase,
  puzzle: Puzzle,
  mountain: Mountain,
  drum: Drum,
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
