import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'system';

function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>('system');

  return {
    subscribe,
    set: (theme: Theme) => {
      set(theme);
      applyTheme(theme);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('volli-theme', theme);
      }
    },
    toggle: () => {
      update(current => {
        const next = current === 'light' ? 'dark' : 'light';
        applyTheme(next);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('volli-theme', next);
        }
        return next;
      });
    },
    init: () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('volli-theme') as Theme;
        const theme = stored || 'system';
        set(theme);
        applyTheme(theme);
      }
    }
  };
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

export const theme = createThemeStore();

// Auto-init theme on load
if (typeof window !== 'undefined') {
  theme.init();
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (_e) => {
    const currentTheme = localStorage.getItem('volli-theme') as Theme;
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
}