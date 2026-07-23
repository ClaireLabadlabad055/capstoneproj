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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C2410C" />
      
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#C2410C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>Enter the email associated with your account. We'll send reset instructions.</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.cleanInput} 
                  placeholder="you@example.com" 
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  headerContainer: {
    backgroundColor: '#C2410C',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: { 
    backgroundColor: '#FFEDD5', 
    padding: 8, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#FED7AA', 
    marginRight: 14 
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },

  scrollContainer: { 
    paddingHorizontal: 20, 
    paddingTop: 30,
    paddingBottom: 40 
  },
  
  cardHeader: { 
    marginBottom: 24,
    paddingHorizontal: 4
  },
  title: { 
    color: '#1E293B', 
    fontSize: 22, 
    fontWeight: '900', 
    letterSpacing: -0.3,
  },
  subtitle: { 
    color: '#64748B', 
    fontSize: 13, 
    marginTop: 6, 
    lineHeight: 18,
    fontWeight: '600'
  },

  formCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 4
  },
  label: { 
    fontSize: 10, 
    color: '#94A3B8', 
    fontWeight: '800', 
    textTransform: 'uppercase', 
    marginBottom: 6, 
    letterSpacing: 0.3,
    marginLeft: 2
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  cleanInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#C2410C', 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginTop: 20,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  submitBtnText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: '900', 
    letterSpacing: 0.5 
  }
});