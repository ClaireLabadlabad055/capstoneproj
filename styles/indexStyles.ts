import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const indexStyles = StyleSheet.create({
  // The main wrapper for the landing screen
  wrapper: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.1, // Responsive padding (10% of screen height)
  },

  // Logo and Branding section
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#B87333', // Toledo Copper
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  
  // Text Styles
  brandName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#4A2C2A', // Deep Brown
    marginTop: 20,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#8D7B70',
    textAlign: 'center',
    paddingHorizontal: 50,
    marginTop: 10,
    lineHeight: 24,
  },

  // Bottom Button Section
  actionArea: {
    width: '100%',
    paddingHorizontal: 30,
  },
  getStartedBtn: {
    backgroundColor: '#B87333',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#B87333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#B87333',
    fontWeight: '600',
    fontSize: 16,
  },

  // Small Footer
  footer: {
    fontSize: 12,
    color: '#C0C0C0',
    fontWeight: '500',
  }
});