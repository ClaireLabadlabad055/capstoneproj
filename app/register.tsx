import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { LinearGradient } from 'expo-linear-gradient';
import { sendPasswordResetEmail } from '../lib/supabaseClient'; // Import the function

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    const sanitized = email.toLowerCase().trim();
    setLoading(true);
    try {
      await sendPasswordResetEmail(sanitized);
      Alert.alert('Success', 'Password reset email sent. Check your inbox.');
      router.back();
    } catch (err: any) {
      const message = err?.message || 'Unable to send reset email.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#451A03" />

      {/* Dynamic Warm Gradient Background matching Register Screen */}
      <LinearGradient
        colors={['#451A03', '#7C2D12', '#C2410C']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.headerBar}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.floatingBackBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#451A03" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              <View style={styles.centerContainer}>
                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.subtitle}>Enter the email associated with your account. We'll send reset instructions.</Text>
                <View style={styles.brandLine} />
              </View>

              <View style={styles.card}>
                <View style={styles.formContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.labelField}>Email Address</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. claire@gmail.com" 
                      placeholderTextColor="#A0AEC0"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]} 
                    onPress={handleReset}
                    activeOpacity={0.9}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={['#C2410C', '#9A3412']}
                      style={styles.btnGradient}
                    >
                      <Text style={styles.submitText}>{loading ? 'SENDING...' : 'SEND RESET EMAIL'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
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
  headerBar: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 24 : 20,
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
  scroll: { 
    flexGrow: 1, 
    justifyContent: 'flex-start', // Changed from 'center' to pull content up
    paddingHorizontal: 24, 
    paddingTop: 10, // Adjust this value lower if you want it even higher up
    paddingBottom: 50, 
    alignItems: 'center' 
  },
  centerContainer: { 
    alignItems: 'flex-start', 
    marginBottom: 24, 
    marginTop: 10, // You can also reduce this margin if needed
    width: '100%',
    maxWidth: 520
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  subtitle: {
    color: '#FFEDD5',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20
  },
  brandLine: { 
    width: 45, 
    height: 3.5, 
    backgroundColor: '#C2410C', 
    borderRadius: 2, 
    marginTop: 12,
    alignSelf: 'flex-start' 
  },
  formContainer: { width: '100%' },
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
    elevation: 10, 
    marginBottom: 12 
  },
  inputGroup: {
    marginBottom: 14,
    width: '100%'
  },
  labelField: {
    color: '#2D3748',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    padding: 15, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    color: '#1A202C', 
    fontSize: 15,
    width: '100%' 
  },
  submitBtn: { 
    borderRadius: 18, 
    overflow: 'hidden', 
    marginTop: 18, 
    width: '100%',
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
  submitText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }
});