// styles/globalStyles.ts
import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#B87333',   // Toledo Copper
  secondary: '#4A2C2A', // Deep Brown (Sikwate)
  background: '#FFFDFB', // Creamy White
  textMain: '#2D1E1E',
  textSecondary: '#8D7B70',
  error: '#D32F2F',
  success: '#388E3C',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
});
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
};
