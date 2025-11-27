'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

// 테마 변경 이벤트를 위한 커스텀 이벤트
const THEME_CHANGE_EVENT = 'theme-change';

function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribe(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
}

export function useTheme() {
  const [mounted, setMounted] = useState(false);

  const theme = useSyncExternalStore(
    subscribe,
    getTheme,
    () => 'dark' // SSR fallback
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('theme', newTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return { theme, toggleTheme, mounted };
}
