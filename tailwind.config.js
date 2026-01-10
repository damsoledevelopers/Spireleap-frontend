/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Logo Colors - Maroons and Reds
        primary: {
          50: '#fef2f2',   // Lightest red tint
          100: '#fee2e2',  // Very light red
          200: '#fecaca',   // Light red
          300: '#fca5a5',   // Medium light red
          400: '#A36562',   // Soft Muted Red (163, 101, 98)
          500: '#741512',   // Slightly Lighter Dark Red (116, 21, 18)
          600: '#721110',   // Dark Red (114, 17, 16) - Main
          700: '#6B100E',   // Dark Brick Red (107, 16, 14)
          800: '#700E08',   // Deep Maroon (112, 14, 8)
          900: '#5a0b06',   // Darkest maroon
        },
        // Logo Gold/Yellow Colors
        gold: {
          50: '#fef9e7',   // Lightest gold tint
          100: '#fef3c7',  // Very light gold
          200: '#fde68a',  // Light gold
          300: '#fcd34d',  // Medium light gold
          400: '#CF9F5A',   // Soft Gold / Golden Brown (207, 159, 90)
          500: '#DCAC2F',  // Bright Gold (220, 172, 47) - Main
          600: '#c99a28',  // Darker gold
          700: '#b68923',  // Dark gold
          800: '#9a721e',  // Darker gold
          900: '#7d5b18',  // Darkest gold
        },
        // Logo color palette - Full set
        logo: {
          // Maroons/Reds
          maroonDeep: '#700E08',      // Deep Maroon (112, 14, 8)
          maroonBrick: '#6B100E',     // Dark Brick Red (107, 16, 14)
          redDark: '#721110',         // Dark Red (114, 17, 16)
          redLighter: '#741512',      // Slightly Lighter Dark Red (116, 21, 18)
          redMuted: '#A36562',        // Soft Muted Red (163, 101, 98)
          // Golds/Yellows
          goldBright: '#DCAC2F',      // Bright Gold (220, 172, 47)
          goldSoft: '#CF9F5A',        // Soft Gold / Golden Brown (207, 159, 90)
          // Black
          black: '#000000',           // Black (0, 0, 0)
          // Neutrals (keeping for backgrounds)
          white: '#fefffe',           // White / Near-white
          whiteAlt: '#fefefe',        // White
          offWhite: '#fdfefd',         // Off-white
          cream: '#fcfbf8',           // Cream / Light beige
          beige: '#f6f1ed',           // Soft beige
        },
        secondary: {
          50: '#fefefe',   // White
          100: '#fdfefd',  // Off-white
          200: '#fcfbf8',  // Cream
          300: '#f6f1ed',  // Soft beige
          400: '#A36562',  // Soft Muted Red
          500: '#CF9F5A',  // Soft Gold
          600: '#721110',  // Dark Red
          700: '#700E08',  // Deep Maroon
          800: '#5a0b06',  // Darkest maroon
          900: '#3d0704',  // Very dark maroon
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'hard': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
