import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    const lowerEmail = email.toLowerCase().trim();

    // --- MULTI-ROLE NAVIGATION LOGIC ---
    if (lowerEmail.includes('admin')) {
      router.replace('/admin/home'); 
    } 
    else if (lowerEmail.includes('vendor')) {
      router.replace('/vendor/home'); 
    } 
    else {
      router.replace('/customer/home'); 
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F9FB" />
      
      {/* 🏹 FLOATING BACK BUTTON Bubble */}
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
            {/* Spacer ensuring clear separation below the floating button layer */}
            <View style={{ height: 170 }} />
              
            {/* Left-Aligned Header Section to match Register exactly */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Login to access your dashboard and explore Toledo.</Text>
              <View style={styles.brandLine} />
            </View>

            {/* --- FORM SECTION --- */}
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

              {/* Primary brand brown submit button */}
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                <Text style={styles.submitBtnText}>LOG IN</Text>
              </TouchableOpacity>
            </View>

            {/* Footer Section */}
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
  header: { 
    marginBottom: 24,
    alignItems: 'flex-start' // Aligns text entirely to the left
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
    alignSelf: 'flex-start' // Aligns the indicator bar to the left edge
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