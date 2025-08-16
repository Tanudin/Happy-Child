/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#7AB87A';
const tintColorDark = '#90C695';

export const Colors = {
  light: {
    text: '#333',
    background: '#E8F5E8', // Light green background
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    primary: '#7AB87A', // Main app color
    secondary: '#90C695', // Secondary green
    textSecondary: '#666',
    textLight: '#999',
    accent: '#FF6B6B',
    cardBackground: '#fff',
    inputBackground: '#F5F5F5',
    buttonBackground: '#7AB87A',
    buttonText: '#fff',
    calendarSelectedText: '#fff',
    border: '#ddd',
    // Social login specific colors
    googleButton: '#fff',
    appleButton: '#000',
    facebookButton: '#1877F2',
  },
  dark: {
    text: '#ECEDEE',
    background: '#1A2A1A', // Dark green background
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: '#7AB87A',
    secondary: '#90C695',
    textSecondary: '#9BA1A6',
    textLight: '#687076',
    accent: '#FF8A8A',
    cardBackground: '#2A2A2A',
    inputBackground: '#3A3A3A',
    buttonBackground: '#7AB87A',
    buttonText: '#fff',
    calendarSelectedText: '#151718',
    border: '#4A4A4A',
    // Social login specific colors
    googleButton: '#3A3A3A',
    appleButton: '#000',
    facebookButton: '#1877F2',
  },
};
