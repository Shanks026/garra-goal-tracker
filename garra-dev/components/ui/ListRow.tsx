import { Pressable, Text, View, type PressableProps } from 'react-native';

export type ListRowProps = PressableProps & {
  label: string;
  value?: string;
  /** Goal form group (h56) by default, or the date-group variant (h58). */
  variant?: 'default' | 'alt';
};

export function ListRow({ label, value, variant = 'default', ...props }: ListRowProps) {
  const height = variant === 'default' ? 'h-list-row-h' : 'h-list-row-h-alt';

  return (
    <Pressable
      className={`${height} flex-row items-center justify-between bg-surface px-4 dark:bg-surface-dark`}
      {...props}
    >
      <Text className="text-[16px] text-text-primary dark:text-text-primary-dark">{label}</Text>
      {value !== undefined && (
        <View>
          <Text className="text-[16px] font-semibold text-text-secondary dark:text-text-secondary-dark">
            {value}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
