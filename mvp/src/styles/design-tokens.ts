/**
 * Modern Design System Tokens and Utility Classes
 * Professional, clean, and cohesive design system for consistent UI patterns
 */

// Modern Color System - Professional Blue/Indigo Primary with Orange Accents
export const colors = {
  primary: {
    50: 'bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100',
    100: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    200: 'bg-blue-200 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300',
    500: 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white',
    600: 'bg-blue-600 text-white dark:bg-blue-700 dark:text-white',
    700: 'bg-blue-700 text-white dark:bg-blue-800 dark:text-white',
  },
  accent: {
    50: 'bg-orange-50 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100',
    100: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    500: 'bg-orange-500 text-white dark:bg-orange-600 dark:text-white',
    600: 'bg-orange-600 text-white dark:bg-orange-700 dark:text-white',
  },
  success: {
    50: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100',
    100: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    500: 'bg-emerald-500 text-white dark:bg-emerald-600 dark:text-white',
    600: 'bg-emerald-600 text-white dark:bg-emerald-700 dark:text-white',
  },
  warning: {
    50: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
    100: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    500: 'bg-amber-500 text-white dark:bg-amber-600 dark:text-white',
    600: 'bg-amber-600 text-white dark:bg-amber-700 dark:text-white',
  },
  error: {
    50: 'bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100',
    100: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    500: 'bg-red-500 text-white dark:bg-red-600 dark:text-white',
    600: 'bg-red-600 text-white dark:bg-red-700 dark:text-white',
  },
  neutral: {
    card: 'bg-white dark:bg-slate-900',
    surface: 'bg-slate-50 dark:bg-slate-800/50',
    elevated: 'bg-white dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    text: {
      primary: 'text-slate-900 dark:text-slate-100',
      secondary: 'text-slate-600 dark:text-slate-300',
      muted: 'text-slate-500 dark:text-slate-400',
      inverse: 'text-white dark:text-slate-900',
    },
  },
} as const;

// Enhanced Spacing System
export const spacing = {
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
  '2xl': 'p-12',
  '3xl': 'p-16',
} as const;

// Modern Border Radius System
export const radius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
} as const;

// Enhanced Shadow System
export const shadows = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',
  glow: 'shadow-lg shadow-blue-500/25',
  glowAccent: 'shadow-lg shadow-orange-500/25',
} as const;

// Modern Component Base Classes
export const components = {
  // Form Elements
  input: [
    'w-full',
    'border',
    colors.neutral.border,
    colors.neutral.card,
    colors.neutral.text.primary,
    radius.md,
    shadows.sm,
    'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'transition-all duration-300',
    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
  ].join(' '),

  label: [
    'block', 
    'text-sm', 
    'font-semibold', 
    colors.neutral.text.secondary, 
    'mb-2',
    'tracking-wide'
  ].join(' '),

  button: {
    primary: [
      'px-6',
      'py-3',
      'rounded-xl',
      'font-semibold',
      'text-sm',
      'transition-all',
      'duration-300',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'focus:ring-blue-500',
      colors.primary[500],
      'hover:shadow-lg hover:shadow-blue-500/25',
      'hover:scale-105',
      'active:scale-95',
    ].join(' '),

    secondary: [
      'px-6',
      'py-3',
      'rounded-xl',
      'font-semibold',
      'text-sm',
      'transition-all',
      'duration-300',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'focus:ring-slate-500',
      'bg-slate-100 dark:bg-slate-700',
      'text-slate-700 dark:text-slate-200',
      'hover:bg-slate-200 dark:hover:bg-slate-600',
      'hover:shadow-md',
      'active:scale-95',
    ].join(' '),

    accent: [
      'px-6',
      'py-3',
      'rounded-xl',
      'font-semibold',
      'text-sm',
      'transition-all',
      'duration-300',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'focus:ring-orange-500',
      colors.accent[500],
      'hover:shadow-lg hover:shadow-orange-500/25',
      'hover:scale-105',
      'active:scale-95',
    ].join(' '),

    icon: [
      'p-2.5',
      'rounded-xl',
      'transition-all',
      'duration-300',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'focus:ring-blue-500',
      'hover:shadow-md',
      'active:scale-95',
    ].join(' '),
  },

  // Modern Card Components
  card: [
    colors.neutral.card, 
    radius.xl, 
    shadows.lg, 
    spacing.lg,
    'border',
    colors.neutral.border,
    'backdrop-blur-sm',
    'transition-all duration-300',
    'hover:shadow-xl',
  ].join(' '),

  cardElevated: [
    colors.neutral.elevated, 
    radius['2xl'], 
    shadows.xl, 
    spacing.xl,
    'border',
    colors.neutral.border,
    'backdrop-blur-xl',
    'transition-all duration-300',
    'hover:shadow-2xl',
  ].join(' '),

  // Modern Modal Components
  modal: {
    overlay: [
      'fixed',
      'inset-0',
      'bg-black/60',
      'backdrop-blur-sm',
      'flex',
      'items-center',
      'justify-center',
      'z-50',
      'p-4',
      'transition-all duration-300',
    ].join(' '),

    content: [
      colors.neutral.card,
      radius['2xl'],
      shadows['2xl'],
      spacing.xl,
      'w-full',
      'max-w-2xl',
      'text-right',
      'border',
      colors.neutral.border,
      'backdrop-blur-xl',
      'transform transition-all duration-300',
    ].join(' '),
  },

  // Modern Table Components
  table: {
    container: [
      colors.neutral.card, 
      radius.xl, 
      shadows.lg, 
      'overflow-hidden',
      'border',
      colors.neutral.border,
    ].join(' '),

    header: [
      'bg-slate-50 dark:bg-slate-800/50',
      'border-b',
      colors.neutral.border,
    ].join(' '),

    cell: [
      'px-6', 
      'py-4', 
      'whitespace-nowrap', 
      'text-sm',
      'font-medium',
      colors.neutral.text.primary,
    ].join(' '),

    row: [
      'divide-y', 
      'divide-slate-200 dark:divide-slate-700',
      'transition-colors duration-200',
      'hover:bg-slate-50 dark:hover:bg-slate-800/30',
    ].join(' '),
  },

  // Modern Status Badges
  status: {
    active: [
      'px-3',
      'py-1.5',
      'inline-flex',
      'text-xs',
      'leading-5',
      'font-semibold',
      'tracking-wide',
      radius.full,
      colors.success[100],
      'border',
      'border-emerald-200 dark:border-emerald-800',
    ].join(' '),

    inactive: [
      'px-3',
      'py-1.5',
      'inline-flex',
      'text-xs',
      'leading-5',
      'font-semibold',
      'tracking-wide',
      radius.full,
      colors.error[100],
      'border',
      'border-red-200 dark:border-red-800',
    ].join(' '),

    pending: [
      'px-3',
      'py-1.5',
      'inline-flex',
      'text-xs',
      'leading-5',
      'font-semibold',
      'tracking-wide',
      radius.full,
      colors.warning[100],
      'border',
      'border-amber-200 dark:border-amber-800',
    ].join(' '),
  },

  // Modern Form Layout
  form: {
    grid: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    section: 'space-y-6',
    field: 'space-y-2',
    error: 'text-red-500 text-sm mt-1 font-medium',
    success: 'text-emerald-500 text-sm mt-1 font-medium',
  },
} as const;

// Modern Animation Classes
export const animations = {
  transition: 'transition-all duration-300 ease-out',
  transitionFast: 'transition-all duration-200 ease-out',
  transitionSlow: 'transition-all duration-500 ease-out',
  hover: 'hover:opacity-90 hover:scale-105',
  hoverSubtle: 'hover:scale-102',
  focus: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
  focusAccent: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin',
  fadeIn: 'animate-in fade-in duration-300',
  slideIn: 'animate-in slide-in-from-bottom-4 duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-300',
} as const;

// Modern Typography System
export const typography = {
  heading: {
    h1: 'text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl lg:text-6xl',
    h2: 'text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl',
    h3: 'text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl',
    h4: 'text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl',
    h5: 'text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100',
    h6: 'text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100',
  },
  body: {
    primary: 'text-base text-slate-900 dark:text-slate-100 leading-relaxed',
    secondary: 'text-sm text-slate-600 dark:text-slate-300 leading-relaxed',
    muted: 'text-sm text-slate-500 dark:text-slate-400 leading-relaxed',
    small: 'text-xs text-slate-500 dark:text-slate-400 leading-relaxed',
  },
  display: {
    large: 'text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-7xl lg:text-8xl',
    medium: 'text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl lg:text-6xl',
    small: 'text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl',
  },
} as const;
