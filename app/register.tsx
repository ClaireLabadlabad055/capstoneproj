import { Ionicons } from '@expo/vector-icons';
import { toByteArray } from 'base64-js';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { COLORS } from '../styles/globalStyles';

const DELICACY_TYPES = ['Native Delicacies', 'Kakanin', 'Pastries', 'Seafood', 'Others'];

export default function RegisterScreen() {
  const router = useRouter();
  const { refreshUserData } = useAuth();
  const [role, setRole] = useState<'customer' | 'merchant'>('customer');
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedDelicacy, setSelectedDelicacy] = useState('');
  const [barangay, setBarangay] = useState('');
  const [verificationDoc, setVerificationDoc] = useState<string | null>(null);

  const pickDocument = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      allowsEditing: true, 
      quality: 0.7 
    });
    if (!result.canceled) setVerificationDoc(result.assets[0].uri);
  };

  const handleRegister = async () => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email: normalizedEmail, 
        password 
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("No user created");

      // 2. Insert into the base 'profiles' table
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        full_name: fullName,
        email: normalizedEmail,
        role: role,
        phone: phone,
        address: address,
      }]);
      if (profileError) throw profileError;

      // 3. Handle Role-Specific logic
      if (role === 'merchant') {
        let finalDocPath = null;
        
        if (verificationDoc) {
          const fileExt = verificationDoc.split('.').pop() || 'jpg';
          finalDocPath = `${authData.user.id}/proof.${fileExt}`;
          
          const fileContent = await readAsStringAsync(verificationDoc, { 
            encoding: EncodingType.Base64 
          });
        const { error: uploadError } = await supabase.storage
          .from('verifications')
          .upload(finalDocPath, toByteArray(fileContent), { 
          contentType: `image/${fileExt}` 
        });
            
          if (uploadError) throw uploadError;
        }

        const { error: merchantError } = await supabase.from('merchants').insert([{
          id: authData.user.id,
          business_name: businessName,
          delicacy_type: selectedDelicacy,
          barangay: barangay,
          verification_doc_url: finalDocPath,
        }]);
        if (merchantError) throw merchantError;

        const { error: customerError } = await supabase.from('customers').insert([{
          id: authData.user.id,
          full_name: fullName,
          email: normalizedEmail,
          phone,
          address,
          role,
          created_at: new Date().toISOString()
        }]);
        if (customerError) throw customerError;
      } else {
        const { error: customerError } = await supabase.from('customers').insert([{
          id: authData.user.id,
          full_name: fullName,
          email: normalizedEmail,
          phone,
          address,
          role,
          created_at: new Date().toISOString()
        }]);
        if (customerError) throw customerError;
      }

      // Do not auto sign-in; redirect to login and prefill email so user can verify/check email
      router.replace({ pathname: '/login', params: { email: normalizedEmail } });
    } catch (e: any) {
      console.error("Registration Error:", e);
      Alert.alert("Registration Error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity onPress={() => router.back()} style={styles.floatingBackBtn} activeOpacity={0.6}>
        <Ionicons name="chevron-back" size={24} color="#1A202C" />
      </TouchableOpacity>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.centerContainer}>
            <Text style={styles.title}>{role === 'merchant' ? "Register Home Kitchen" : "Create Account"}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.roleToggle}>
            <TouchableOpacity style={[styles.roleTab, role === 'customer' && styles.activeTab]} onPress={() => setRole('customer')}>
              <Text style={[styles.tabText, role === 'customer' && styles.activeTabText]}>Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleTab, role === 'merchant' && styles.activeTab]} onPress={() => setRole('merchant')}>
              <Text style={[styles.tabText, role === 'merchant' && styles.activeTabText]}>Merchant</Text>
            </TouchableOpacity>
          </View>

              <View style={styles.formContainer}>
            <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} placeholderTextColor="#A0AEC0" />
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} placeholderTextColor="#A0AEC0" />
            <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} placeholderTextColor="#A0AEC0" />
            <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} placeholderTextColor="#A0AEC0" />

            {role === 'merchant' && (
              <View style={{ width: '100%' }}>
                <TextInput style={styles.input} placeholder="Business Name" value={businessName} onChangeText={setBusinessName} placeholderTextColor="#A0AEC0" />
                <Text style={styles.label}>Specialized Delicacy Type</Text>
                <View style={styles.categoryGrid}>
                  {DELICACY_TYPES.map((type) => (
                    <TouchableOpacity key={type} style={[styles.catBtn, selectedDelicacy === type && styles.activeCatBtn]} onPress={() => setSelectedDelicacy(type)}>
                      <Text style={[styles.catText, selectedDelicacy === type && styles.activeCatText]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.input} placeholder="Barangay" value={barangay} onChangeText={setBarangay} placeholderTextColor="#A0AEC0" />
                <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                  <Text style={styles.uploadText}>{verificationDoc ? "Document Attached" : "Upload Proof of Residency"}</Text>
                </TouchableOpacity>
              </View>
            )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleRegister}>
                <Text style={styles.submitText}>REGISTER SECURELY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 50, alignItems: 'center' },
  backBtn: { marginTop: Platform.OS === 'ios' ? 30 : 20, marginLeft: 24, alignSelf: 'flex-start', marginBottom: 10 },
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
  centerContainer: { alignItems: 'center', marginBottom: 24, marginTop: Platform.OS === 'ios' ? 70 : 50 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A202C' },
  roleToggle: { flexDirection: 'row', backgroundColor: '#F7FAFC', padding: 4, borderRadius: 14, marginBottom: 24, width: '100%', maxWidth: 400 },
  roleTab: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  activeTab: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontWeight: '600', color: '#718096' },
  activeTabText: { color: COLORS.primary || '#3182CE' },
  formContainer: { width: '100%', maxWidth: 400 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 14, width: '100%', maxWidth: 520, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 6, marginBottom: 12 },
  input: { backgroundColor: '#F7FAFC', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EDF2F7', color: '#2D3748', width: '100%' },
  label: { fontSize: 13, fontWeight: '700', color: '#4A5568', marginBottom: 10, textAlign: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#EDF2F7' },
  activeCatBtn: { backgroundColor: COLORS.primary || '#3182CE', borderColor: COLORS.primary || '#3182CE' },
  catText: { fontSize: 12, color: '#4A5568' },
  activeCatText: { color: '#FFF' },
  uploadBtn: { padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E0', borderRadius: 12, alignItems: 'center', marginBottom: 16, width: '100%' },
  uploadText: { color: '#718096', fontSize: 13 },
  submitBtn: { backgroundColor: COLORS.primary || '#3182CE', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, width: '100%' },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 15 }
});