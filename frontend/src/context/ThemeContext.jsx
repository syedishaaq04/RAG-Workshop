import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('campus_nexus_theme') || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('campus_nexus_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const applyTheme = (targetResolved) => {
    const root = document.documentElement;
    if (targetResolved === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    setResolvedTheme(targetResolved);
  };

  const setTheme = (newTheme) => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const nextResolved = newTheme === 'system' ? (media.matches ? 'dark' : 'light') : newTheme;

    localStorage.setItem('campus_nexus_theme', newTheme);
    setThemeState(newTheme);

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        applyTheme(nextResolved);
      });
    } else {
      applyTheme(nextResolved);
    }
  };

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      const currentChoice = localStorage.getItem('campus_nexus_theme') || 'system';
      const effective = currentChoice === 'system' ? (media.matches ? 'dark' : 'light') : currentChoice;
      applyTheme(effective);
    };

    updateTheme();

    const listener = () => {
      if ((localStorage.getItem('campus_nexus_theme') || 'system') === 'system') {
        updateTheme();
      }
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
