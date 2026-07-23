import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getRedirectRouteForRole } from './_utils/roleRouting';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { recentLoginStatus, login } = useAuth();
  const pendingApprovalNotice = params?.pendingApproval === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [greetName, setGreetName] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const profile = await login(email.toLowerCase().trim(), password);
      const role = profile?.role || 'customer';
      router.replace(getRedirectRouteForRole(role));
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const tryPrefill = async () => {
      const seedEmail = (recentLoginStatus && recentLoginStatus.email) || (params?.email as string | undefined) || undefined;
      if (seedEmail) {
        setEmail(seedEmail);
        try {
          const { data } = await supabase.from('customers').select('full_name').eq('email', seedEmail).maybeSingle();
          if (data && data.full_name) {
            setGreetName(data.full_name.split(' ')[0]);
          }
        } catch (e) {
          console.error('Error fetching name for login header', e);
        }
      }
    };
    tryPrefill();
  }, [params.email, recentLoginStatus]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#451A03" />
      
      {/* Dynamic Warm Gradient Background matching your landing page theme */}
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
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            {/* Safe Back Button Placement Header with extra top padding to push it safely below status bar/time */}
            <View style={styles.headerBar}>
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={styles.floatingBackBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color="#451A03" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.title}>{greetName ? `Welcome back, ${greetName}` : 'Welcome Back'}</Text>
                  <Text style={styles.subtitle}>Login to access your dashboard and explore Toledo.</Text>
                  <View style={styles.brandLine} />
                </View>

                {pendingApprovalNotice && (
                  <View style={styles.noticeBanner}>
                    <Text style={styles.noticeText}>Your registration was submitted successfully. Please wait for the admin to approve it before signing in.</Text>
                  </View>
                )}

                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput 
                      style={styles.cleanInput} 
                      placeholder="e.g. claire@gmail.com" 
                      placeholderTextColor="#A0AEC0"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput 
                      style={styles.cleanInput} 
                      placeholder="••••••••" 
                      placeholderTextColor="#A0AEC0"
                      secureTextEntry 
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>

                  <TouchableOpacity 
                    style={styles.forgotBtn}
                    onPress={() => router.push('/forgot-password')}
                  >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.submitBtn} 
                    onPress={handleLogin}
                    activeOpacity={0.9}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={['#C2410C', '#9A3412']}
                      style={styles.btnGradient}
                    >
                      <Text style={styles.submitBtnText}>
                        {loading ? "LOGGING IN..." : "LOG IN"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={styles.link}>Register Here</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#451A03' },
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
  headerBar: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 24 : 40, // Lowered down further to stay clear of the device status time display
    zIndex: 99,
  },
  floatingBackBtn: {
    alignSelf: 'flex-start',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 10,
    paddingBottom: 40 
  },
  card: { 
    backgroundColor: '#FFFFFF', 
    padding: 26, 
    borderRadius: 24, 
    width: '100%', 
    maxWidth: 520, 
    alignSelf: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 12 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 20, 
    elevation: 10 
  },
  header: { 
    marginBottom: 24,
    alignItems: 'flex-start' 
  },
  title: { 
    color: '#1A202C', 
    fontSize: 28, 
    fontWeight: '800', 
    letterSpacing: -0.5,
    textAlign: 'left'
  },
  subtitle: { 
    color: '#718096', 
    fontSize: 14, 
    marginTop: 6, 
    lineHeight: 20,
    textAlign: 'left'
  },
  brandLine: { 
    width: 45, 
    height: 3.5, 
    backgroundColor: '#C2410C', 
    borderRadius: 2, 
    marginTop: 12,
    alignSelf: 'flex-start' 
  },
  form: { width: '100%' },
  noticeBanner: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  noticeText: { color: '#9A2C00', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  inputGroup: {
    marginBottom: 16
  },
  label: { 
    color: '#2D3748', 
    fontSize: 14, 
    fontWeight: '700', 
    marginBottom: 6,
    marginLeft: 2
  },
  cleanInput: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 16,
    color: '#1A202C',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 8 },
  forgotText: { color: '#C2410C', fontWeight: '700', fontSize: 14 },
  submitBtn: {
    borderRadius: 18, 
    overflow: 'hidden',
    marginTop: 18,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '800', 
    letterSpacing: 0.5 
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 24 
  },
  footerText: { color: '#FFEDD5', fontSize: 14, fontWeight: '500' },
  link: { 
    color: '#FFFFFF', 
    fontWeight: '800', 
    fontSize: 14,
    textDecorationLine: 'underline'
  }
});