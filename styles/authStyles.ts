import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from './globalStyles';

const { width } = Dimensions.get('window');

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  headerSection: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  // Input Group
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F3F3',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    fontSize: 16,
    color: COLORS.textMain,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  // Role Selector (The Toggle)
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F3F3',
    borderRadius: 12,
    padding: 5,
    marginBottom: 30,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeRole: {
    backgroundColor: COLORS.primary,
    elevation: 3,
  },
  roleText: {
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeRoleText: {
    color: '#FFF',
  },
  // Footer
  footerLink: {
    marginTop: 25,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  link: {
    color: COLORS.primary,
    fontWeight: 'bold',
  }
});