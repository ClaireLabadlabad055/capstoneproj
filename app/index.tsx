import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function LandingPage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Status bar matching the rich warm brown/orange market theme */}
      <StatusBar barStyle="light-content" backgroundColor="#451A03" />
      
      {/* Dynamic Warm Gradient Background matching brown and orange tones */}
      <LinearGradient
        colors={['#451A03', '#7C2D12', '#C2410C']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Modern Glowing Backdrop Elements */}
        <View style={styles.glowCircleTop} />
        <View style={styles.glowCircleBottom} />

        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.contentWrapper}>
            
            {/* Top Glassmorphic Badge Header */}
            <View style={styles.topHeader}>
              <View style={styles.glassBadge}>
                <View style={styles.badgePulse} />
                <Text style={styles.badgeText}>Toledo City's Official Market</Text>
              </View>
            </View>

            {/* 🎯 CENTERED HERO SECTION */}
            <View style={styles.centerContent}>
              
              {/* Extra Layered Glass Logo Card */}
              <View style={styles.logoOuterGlow}>
                <View style={styles.logoWrapper}>
                  <Image 
                    source={require('../assets/images/logo.png')} 
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <Text style={styles.appName}>ToledoGo</Text>

              <Text style={styles.tagline}>Fresh Market Delivery</Text>

              <Text style={styles.description}>
                Connecting you directly with trusted local vendors — fresh catch, crisp harvest, and rapid delivery right to your doorstep.
              </Text>

              {/* Glassmorphic Feature Pills with Icons */}
              <View style={styles.pillContainer}>
                <View style={styles.pill}>
                  <Text style={styles.pillIcon}>🌿</Text>
                  <Text style={styles.pillText}>100% Fresh</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillIcon}>🤝</Text>
                  <Text style={styles.pillText}>Local Vendors</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillIcon}>⚡</Text>
                  <Text style={styles.pillText}>Fast Delivery</Text>
                </View>
              </View>
            </View>

            {/* BOTTOM ACTION SECTION */}
            <View style={styles.footerSection}>
              <View style={styles.actionArea}>
                <TouchableOpacity 
                  style={styles.getStartedBtn} 
                  activeOpacity={0.9}
                  onPress={() => router.push('/register')}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#FFF7ED']}
                    style={styles.btnGradient}
                  >
                    <Text style={styles.btnText}>Get Started</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.loginLink}
                  activeOpacity={0.7}
                  onPress={() => router.push('/login')}
                >
                  <Text style={styles.loginLinkText}>
                    Already have an account? <Text style={styles.signInHighlight}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.footer}>
                © 2026 Toledo City Market • All Rights Reserved
              </Text>
            </View>

          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#451A03'
  },
  glowCircleTop: {
    position: 'absolute',
    top: -width * 0.3,
    right: -width * 0.2,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  glowCircleBottom: {
    position: 'absolute',
    bottom: -width * 0.2,
    left: -width * 0.3,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingVertical: 16
  },
  topHeader: {
    alignItems: 'center',
    paddingTop: 10
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgePulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FDBA74',
    marginRight: 8
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  centerContent: { 
    alignItems: 'center', 
    marginTop: -10
  },
  logoOuterGlow: {
    padding: 6,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoWrapper: { 
    width: 92, 
    height: 92, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  logoImage: {
    width: 52,
    height: 52,
  },
  appName: { 
    fontSize: 42, 
    fontWeight: '900', 
    color: '#FFFFFF', 
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FED7AA',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16
  },
  description: { 
    fontSize: 15, 
    color: '#FFEDD5', 
    textAlign: 'center', 
    lineHeight: 24, 
    paddingHorizontal: 10,
    fontWeight: '400',
    marginBottom: 28
  },
  pillContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    flexWrap: 'wrap',
    gap: 10
  },
  pill: { 
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)', 
    paddingHorizontal: 14, 
    paddingVertical: 9, 
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center'
  },
  pillIcon: {
    fontSize: 13,
    marginRight: 6
  },
  pillText: { 
    color: '#FFFFFF', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  footerSection: { 
    width: '100%',
    paddingBottom: 10
  },
  actionArea: { 
    width: '100%' 
  },
  getStartedBtn: { 
    borderRadius: 18, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6
  },
  btnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnText: { 
    color: '#451A03', 
    fontSize: 17, 
    fontWeight: '800',
    letterSpacing: 0.5
  },
  loginLink: { 
    marginTop: 20, 
    alignItems: 'center',
    paddingVertical: 6
  },
  loginLinkText: { 
    color: '#FFEDD5', 
    fontSize: 15,
    fontWeight: '500'
  },
  signInHighlight: {
    fontWeight: '800', 
    color: '#FFFFFF',
    textDecorationLine: 'underline'
  },
  footer: {
    color: 'rgba(255, 255, 255, 0.6)', 
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '500',
    letterSpacing: 0.5
  }
});