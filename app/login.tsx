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
  View
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getRedirectRouteForRole } from './_utils/roleRouting';

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
      // if recentLoginStatus is present, prefer its email
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
      <StatusBar barStyle="dark-content" backgroundColor="#F9F9FB" />
      
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={styles.floatingBackBtn}
        activeOpacity={0.6}
      >
        <Ionicons name="arrow-back" size={24} color="#1A202C" />
      </TouchableOpacity>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
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
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.submitBtnText}>
                  {loading ? "LOGGING IN..." : "LOG IN"}
                </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9FB' },
  floatingBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 40,
    left: 16,
    zIndex: 9999,
    elevation: 99,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  scrollContainer: { 
    paddingHorizontal: 24, 
    paddingBottom: 30 
  },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 30 },
  card: { backgroundColor: '#FFFFFF', padding: 22, borderRadius: 16, width: '100%', maxWidth: 520, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 6 },
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
    backgroundColor: '#A05C2C', 
    borderRadius: 2, 
    marginTop: 12,
    alignSelf: 'flex-start' 
  },
  form: { width: '100%' },
  noticeBanner: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  noticeText: { color: '#9A2C00', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  inputGroup: {
    marginBottom: 14
  },
  label: { 
    color: '#2D3748', 
    fontSize: 14, 
    fontWeight: '700', 
    marginBottom: 6,
    marginLeft: 2
  },
  cleanInput: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 16,
    color: '#1A202C',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 4 },
  forgotText: { color: '#A05C2C', fontWeight: '700', fontSize: 14 },
  submitBtn: {
    backgroundColor: '#A05C2C', 
    paddingVertical: 16, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginTop: 24,
    shadowColor: '#A05C2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
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
  footerText: { color: '#4A5568', fontSize: 14 },
  link: { 
    color: '#A05C2C', 
    fontWeight: '700', 
    fontSize: 14 
  }
});
