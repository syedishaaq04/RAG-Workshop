import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '', showLabel = false }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        id="theme-toggle-btn"
        onClick={toggleTheme}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Current: ${resolvedTheme === 'dark' ? 'Dark' : 'Light'} (Click to toggle)`}
        className="group flex items-center gap-2 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
      >
        <div className="relative w-4 h-4 flex items-center justify-center">
          <Sun
            className={`w-4 h-4 text-amber-500 transition-all duration-300 absolute transform ${
              resolvedTheme === 'dark'
                ? 'rotate-90 scale-0 opacity-0'
                : 'rotate-0 scale-100 opacity-100'
            }`}
          />
          <Moon
            className={`w-4 h-4 text-blue-400 transition-all duration-300 absolute transform ${
              resolvedTheme === 'dark'
                ? 'rotate-0 scale-100 opacity-100'
                : '-rotate-90 scale-0 opacity-0'
            }`}
          />
        </div>
        {showLabel && (
          <span className="text-xs font-medium capitalize">
            {resolvedTheme}
          </span>
        )}
      </button>
    </div>
  );
}
