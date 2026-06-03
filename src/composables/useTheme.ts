import { computed, ref } from 'vue';

export type ThemeName = 'dark' | 'light';

export const useTheme = () => {
  const theme = ref<ThemeName>('dark');
  const themeIcon = computed(() => (theme.value === 'dark' ? '☾' : '☀'));

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };

  return {
    theme,
    themeIcon,
    toggleTheme,
  };
};
