/**
 * Theme constants for the AI Bot Dashboard
 * Centralized color palette for consistent styling
 */
export const THEME = {
  colors: {
    // Primary teal
    primary: {
      light: '#2dd4bf',
      DEFAULT: '#14b8a6',
      dark: '#0d9488',
    },
    // Secondary purple
    secondary: {
      light: '#a78bfa',
      DEFAULT: '#8b5cf6',
      dark: '#7c3aed',
    },
    // Accent magenta
    accent: {
      light: '#f0abfc',
      DEFAULT: '#d946ef',
      dark: '#c026d3',
    },
    // Status colors
    success: '#39FF14',
    warning: '#fbbf24',
    danger: '#ef4444',
    info: '#00FFFF',
  },
  
  // Chart color palette
  chart: {
    primary: '#14b8a6',
    secondary: '#8b5cf6',
    accent: '#d946ef',
    success: '#39FF14',
    warning: '#fbbf24',
    danger: '#ef4444',
  },
  
  // Gradient definitions
  gradients: {
    primary: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    secondary: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    accent: 'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)',
    cyber: 'linear-gradient(135deg, #14b8a6 0%, #8b5cf6 50%, #d946ef 100%)',
    bar: 'linear-gradient(180deg, #14b8a6 0%, #8b5cf6 100%)',
    line: 'linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%)',
  },
}

// Tailwind CSS class names for theme colors
export const THEME_CLASSES = {
  textPrimary: 'text-primary-500',
  textSecondary: 'text-cyber-500',
  textAccent: 'text-accent-500',
  textSuccess: 'text-green-400',
  textWarning: 'text-yellow-400',
  textDanger: 'text-red-400',
  bgPrimary: 'bg-primary-500',
  bgSecondary: 'bg-cyber-500',
  bgAccent: 'bg-accent-500',
}

export default THEME
