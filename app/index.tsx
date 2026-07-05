import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../styles/globalStyles';

const { height } = Dimensions.get('window');

export default function LandingPage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F9FB" />
      
      {/* Integrated the subtle desaturated pattern asset */}
      <ImageBackground
        source={require('../assets/images/clean-pattern.jpg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      >
        {/* Soft layout mask tint to keep text highly legible */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(249, 249, 251, 0.88)' }]} />

        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.contentWrapper}>
            
            {/* 🎯 CENTERED HERO SECTION */}
            <View style={styles.centerContent}>
              <View style={styles.logoIcon}>
                <Feather name="shopping-bag" size={45} color="#FFF" />
              </View>
              
              <Text style={styles.appName}>ToGo</Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.description}>
                Connecting you to the best local vendors in Toledo City. 
                Fresh, fast, and right at your fingertips.
              </Text>

              {/* Minimalist Feature Pills */}
              <View style={styles.pillContainer}>
                <View style={styles.pill}><Text style={styles.pillText}>✓ Fresh</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>✓ Local</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>✓ Trusted</Text></View>
              </View>
            </View>

            {/* BOTTOM ACTION SECTION */}
            <View style={styles.footerSection}>
              <View style={styles.actionArea}>
                <TouchableOpacity 
                  style={[styles.getStartedBtn, { elevation: 4 }]} 
                  activeOpacity={0.85}
                  onPress={() => router.push('/register')}
                >
                  <Text style={styles.btnText}>Get Started</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.loginLink}
                  activeOpacity={0.6}
                  onPress={() => router.push('/login')}
                >
                  <Text style={styles.loginLinkText}>
                    Already have an account? <Text style={styles.signInHighlight}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.footer}>
                © 2026 Toledo City Market
              </Text>
            </View>

          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#F9F9FB'
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 30
  },
  centerContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: height * 0.05
  },
  logoIcon: { 
    width: 90, 
    height: 90, 
    backgroundColor: COLORS.primary || '#3182CE', 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: COLORS.primary || '#3182CE',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8
  },
  appName: { 
    fontSize: 52, 
    fontWeight: '900', 
    color: '#1A202C', 
    letterSpacing: -2,
    textAlign: 'center'
  },
  divider: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.primary || '#3182CE',
    borderRadius: 2,
    marginVertical: 15
  },
  description: { 
    fontSize: 18, 
    color: '#4A5568', 
    textAlign: 'center', 
    lineHeight: 28, 
    paddingHorizontal: 15,
    fontWeight: '500'
  },
  pillContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 8, 
    marginTop: 25 
  },
  pill: { 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  pillText: { 
    color: '#4A5568', 
    fontSize: 13, 
    fontWeight: '700' 
  },
  footerSection: { 
    marginBottom: 30 
  },
  actionArea: { 
    width: '100%' 
  },
  getStartedBtn: { 
    backgroundColor: COLORS.primary || '#3182CE', 
    paddingVertical: 18, 
    borderRadius: 22, 
    alignItems: 'center',
    shadowColor: COLORS.primary || '#3182CE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10
  },
  btnText: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: '800' 
  },
  loginLink: { 
    marginTop: 20, 
    alignItems: 'center',
    paddingBottom: 10 
  },
  loginLinkText: { 
    color: '#4A5568', 
    fontSize: 16,
    fontWeight: '500'
  },
  signInHighlight: {
    fontWeight: '700', 
    color: COLORS.primary || '#3182CE'
  },
  footer: {
    color: '#A0AEC0', 
    fontSize: 12,
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '600',
    letterSpacing: 0.5
  }
});