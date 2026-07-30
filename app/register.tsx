import { Ionicons } from '@expo/vector-icons';
import { toByteArray } from 'base64-js';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
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
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { getRedirectRouteForRole } from './_utils/roleRouting';
import { CUSTOMER_HOME_CATEGORIES } from './_utils/vendorCategories';

const { width } = Dimensions.get('window');
const DELICACY_TYPES = [...CUSTOMER_HOME_CATEGORIES];

const isMissingColumnError = (error: any) => {
  const message = error?.message || '';
  return message.includes('Could not find the') || message.includes('column') || message.includes('schema cache');
};

const upsertWithFallback = async (table: string, payload: any, fallbackPayload: any) => {
  const { error } = await supabase.from(table).upsert([payload], { onConflict: 'id' });
  if (!error) return;
  if (!isMissingColumnError(error)) throw error;

  const { error: fallbackError } = await supabase.from(table).upsert([fallbackPayload], { onConflict: 'id' });
  if (fallbackError) throw fallbackError;
};

const ensureAuthenticated = async (email: string, password: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error('Unable to authenticate the new account for approval registration. Please check your Supabase auth setup.');
  }
};

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<'customer' | 'merchant'>('customer');
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedDelicacy, setSelectedDelicacy] = useState('');
  const [barangay, setBarangay] = useState('');
  const [pickupLandmark, setPickupLandmark] = useState('');
  const [pickupDetails, setPickupDetails] = useState('');
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

      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email: normalizedEmail, 
        password 
      });

      if (authError) {
        const message = authError.message || '';
        const normalizedMessage = message.toLowerCase();
        if (normalizedMessage.includes('already registered') || normalizedMessage.includes('user already')) {
          Alert.alert(
            'Registration Pending',
            'This account already exists or is already being reviewed. Please wait for admin approval before signing in.'
          );
          router.replace({
            pathname: '/login',
            params: { email: normalizedEmail, pendingApproval: 'true' }
          });
          return;
        }
        throw authError;
      }

      if (!authData.user) throw new Error("No user created");

      await ensureAuthenticated(normalizedEmail, password);

      const pendingApprovalStatus = 'pending';

      const profilePayload = {
        id: authData.user.id,
        full_name: fullName,
        role: role,
        phone: phone,
        address: address,
        approval_status: pendingApprovalStatus,
      };
      const profileFallbackPayload = {
        id: authData.user.id,
        full_name: fullName,
        role: role,
        phone: phone,
        address: address,
      };
      await upsertWithFallback('profiles', profilePayload, profileFallbackPayload);

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

        const merchantPayload = {
          id: authData.user.id,
          business_name: businessName,
          delicacy_type: selectedDelicacy,
          barangay: barangay,
          pickup_landmark: pickupLandmark,
          pickup_details: pickupDetails,
          verification_doc_url: finalDocPath,
          approval_status: pendingApprovalStatus,
          status: 'Pending',
        };
        const merchantFallbackPayload = {
          id: authData.user.id,
          business_name: businessName,
          delicacy_type: selectedDelicacy,
          barangay: barangay,
          pickup_landmark: pickupLandmark,
          pickup_details: pickupDetails,
          verification_doc_url: finalDocPath,
          status: 'Pending',
        };
        await upsertWithFallback('merchants', merchantPayload, merchantFallbackPayload);

        const customerPayload = {
          id: authData.user.id,
          full_name: fullName,
          phone,
          address,
          role,
          approval_status: pendingApprovalStatus,
          status: 'Pending',
        };
        const customerFallbackPayload = {
          id: authData.user.id,
          full_name: fullName,
          phone,
          address,
          role,
          status: 'Pending',
        };
        await upsertWithFallback('customers', customerPayload, customerFallbackPayload);
      } else {
        const customerPayload = {
          id: authData.user.id,
          full_name: fullName,
          phone,
          address,
          role,
          approval_status: pendingApprovalStatus,
          status: 'Pending',
        };
        const customerFallbackPayload = {
          id: authData.user.id,
          full_name: fullName,
          phone,
          address,
          role,
          status: 'Pending',
        };
        await upsertWithFallback('customers', customerPayload, customerFallbackPayload);
      }

      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn('Sign out after pending registration failed:', signOutError);
      }

      Alert.alert(
        'Registration Submitted',
        'Your account is now pending admin approval. Please wait for the admin to approve it before signing in.'
      );
      router.replace({
        pathname: '/login',
        params: { email: normalizedEmail, pendingApproval: 'true' }
      });
    } catch (e: any) {
      console.error("Registration Error:", e);
      Alert.alert("Registration Error", e.message || 'Unable to complete registration.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#451A03" />

      {/* Dynamic Warm Gradient Background matching Login Screen & Landing Page */}
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
          {/* Safe Back Button Placement Header */}
          <View style={styles.headerBar}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.floatingBackBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#451A03" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.centerContainer}>
              <Text style={styles.title}>{role === 'merchant' ? "Register Home Kitchen" : "Create Account"}</Text>
              <Text style={styles.subtitle}>Join Toledo's premier local delicacy community.</Text>
              <View style={styles.brandLine} />
            </View>

            <View style={styles.card}>
              <View style={styles.roleToggle}>
                <TouchableOpacity 
                  style={[styles.roleTab, role === 'customer' && styles.activeTab]} 
                  onPress={() => setRole('customer')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, role === 'customer' && styles.activeTabText]}>Customer</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.roleTab, role === 'merchant' && styles.activeTab]} 
                  onPress={() => setRole('merchant')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, role === 'merchant' && styles.activeTabText]}>Merchant</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.labelField}>Full Name</Text>
                  <TextInput style={styles.input} placeholder="e.g. Claire Reyes" value={fullName} onChangeText={setFullName} placeholderTextColor="#A0AEC0" />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.labelField}>Email Address</Text>
                  <TextInput style={styles.input} placeholder="e.g. claire@gmail.com" value={email} onChangeText={setEmail} placeholderTextColor="#A0AEC0" keyboardType="email-address" autoCapitalize="none" />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.labelField}>Phone Number</Text>
                  <TextInput style={styles.input} placeholder="e.g. 09123456789" value={phone} onChangeText={setPhone} placeholderTextColor="#A0AEC0" keyboardType="phone-pad" />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.labelField}>Password</Text>
                  <TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} placeholderTextColor="#A0AEC0" />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.labelField}>Delivery Address</Text>
                  <TextInput style={styles.input} placeholder="e.g. Brgy. Poblacion, Toledo City" value={address} onChangeText={setAddress} placeholderTextColor="#A0AEC0" />
                </View>

                {role === 'merchant' && (
                  <View style={{ width: '100%' }}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.labelField}>Business Name</Text>
                      <TextInput style={styles.input} placeholder="e.g. Aling Nena's Kitchen" value={businessName} onChangeText={setBusinessName} placeholderTextColor="#A0AEC0" />
                    </View>

                    <Text style={styles.label}>Specialized Delicacy Type</Text>
                    <View style={styles.categoryGrid}>
                      {DELICACY_TYPES.map((type) => (
                        <TouchableOpacity 
                          key={type} 
                          style={[styles.catBtn, selectedDelicacy === type && styles.activeCatBtn]} 
                          onPress={() => setSelectedDelicacy(type)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.catText, selectedDelicacy === type && styles.activeCatText]}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.labelField}>Barangay</Text>
                      <TextInput style={styles.input} placeholder="e.g. Don Andres Soriano" value={barangay} onChangeText={setBarangay} placeholderTextColor="#A0AEC0" />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.labelField}>Pickup Landmark</Text>
                      <TextInput style={styles.input} placeholder="e.g. Near the Barangay Hall" value={pickupLandmark} onChangeText={setPickupLandmark} placeholderTextColor="#A0AEC0" />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.labelField}>Pickup Details</Text>
                      <TextInput style={styles.input} placeholder="e.g. Blue gate, ring doorbell" value={pickupDetails} onChangeText={setPickupDetails} placeholderTextColor="#A0AEC0" />
                    </View>

                    <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument} activeOpacity={0.8}>
                      <Ionicons name="cloud-upload-outline" size={20} color="#C2410C" style={{ marginBottom: 4 }} />
                      <Text style={styles.uploadText}>{verificationDoc ? "Document Attached Successfully" : "Upload Proof of Residency"}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} activeOpacity={0.9}>
                  <LinearGradient
                    colors={['#C2410C', '#9A3412']}
                    style={styles.btnGradient}
                  >
                    <Text style={styles.submitText}>REGISTER SECURELY</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? 24 : 20, // Lowered cleanly to avoid clock/status overlap
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
    justifyContent: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 10, 
    paddingBottom: 50, 
    alignItems: 'center' 
  },
  centerContainer: { 
    alignItems: 'flex-start', 
    marginBottom: 24, 
    marginTop: 10,
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
  roleToggle: { 
    flexDirection: 'row', 
    backgroundColor: '#F1F5F9', 
    padding: 4, 
    borderRadius: 16, 
    marginBottom: 24, 
    width: '100%' 
  },
  roleTab: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  activeTab: { 
    backgroundColor: '#FFFFFF', 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 6, 
    elevation: 3 
  },
  tabText: { fontWeight: '600', color: '#718096' },
  activeTabText: { color: '#C2410C', fontWeight: '700' },
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
  label: { fontSize: 14, fontWeight: '700', color: '#2D3748', marginBottom: 10, textAlign: 'left', marginLeft: 2 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8, marginBottom: 16 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  activeCatBtn: { backgroundColor: '#C2410C', borderColor: '#C2410C' },
  catText: { fontSize: 12, color: '#4A5568', fontWeight: '500' },
  activeCatText: { color: '#FFF', fontWeight: '700' },
  uploadBtn: { padding: 16, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#CBD5E0', borderRadius: 16, alignItems: 'center', marginBottom: 16, width: '100%', backgroundColor: '#F8FAFC' },
  uploadText: { color: '#C2410C', fontSize: 14, fontWeight: '600' },
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