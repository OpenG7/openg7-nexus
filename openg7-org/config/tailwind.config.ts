import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{html,ts}', '../packages/admin-quality/src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: 'var(--og7-color-page)',
        surface: 'var(--og7-color-surface)',
        'surface-muted': 'var(--og7-color-surface-muted)',
        card: 'var(--og7-color-card)',
        title: 'var(--og7-color-title)',
        body: 'var(--og7-color-body)',
        subtle: 'var(--og7-color-subtle)',
        primary: 'var(--og7-color-primary)',
        'on-primary': 'var(--og7-color-on-primary)',
        tertiary: 'var(--og7-color-tertiary)',
        'on-tertiary': 'var(--og7-color-on-tertiary)',
        success: 'var(--og7-color-success)',
        warning: 'var(--og7-color-warning)',
        error: 'var(--og7-color-error)',
        national: 'var(--og7-color-national)',
      },
      boxShadow: {
        e1: 'var(--og7-shadow-e1)',
        card: 'var(--og7-shadow-card)',
      },
      ringColor: {
        card: 'var(--og7-ring-color)',
      },
      fontFamily: {
        sans: ['var(--og7-font-family-base)'],
      },
    },
  },
  plugins: [],
};

export default config;
