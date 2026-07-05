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
            contentContainerStyle={styles.scrollContainer}
          >
            <View style={{ height: 150 }} />

            <View style={styles.header}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter the email associated with your account. We'll send reset instructions.</Text>
              <View style={styles.brandLine} />
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput 
                  style={styles.cleanInput} 
                  placeholder="you@example.com" 
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
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.submitBtnText}>{loading ? 'SENDING...' : 'SEND RESET EMAIL'}</Text>
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
  }
});
