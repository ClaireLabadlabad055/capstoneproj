import { Feather, Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image, Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';

export default function Profile() {
  const router = useRouter();
  const { user, userData, loading: authLoading, logout, refreshUserData, updateLocalUserData } = useAuth();
  
  const [view, setView] = useState<'menu' | 'address' | 'settings'>('menu');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  const [tempAddress, setTempAddress] = useState({
    name: userData?.full_name || "User",
    details: userData?.address || "",
    phone: userData?.phone || "",
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (userData) {
      setTempAddress({
        name: userData.full_name || "User",
        details: userData.address || "",
        phone: userData.phone || "",
      });
    }
  }, [userData]);

  useEffect(() => {
    if (userData?.avatar_url) {
      setProfileImage(`${userData.avatar_url}?t=${new Date().getTime()}`);
    }
  }, [userData]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'The selected image could not be read.');
        return;
      }
      uploadAvatar(asset.base64);
    }
  };

  const uploadAvatar = async (base64: string) => {
    if (!user) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}.jpg`;
      const fileBuffer = decode(base64);

      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatar').getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error('Unable to generate avatar URL.');

      const [{ error: customerUpdateError }, { error: profileUpdateError }] = await Promise.all([
        supabase.from('customers').update({ avatar_url: data.publicUrl }).eq('id', user.id),
        supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id),
      ]);

      if (customerUpdateError || profileUpdateError) {
        const errorMessage = customerUpdateError?.message || profileUpdateError?.message || 'Failed to update avatar in one or more tables.';
        throw new Error(errorMessage);
      }

      if (typeof updateLocalUserData === 'function') {
        updateLocalUserData({ avatar_url: data.publicUrl });
      }
      if (user?.id) await refreshUserData(user.id);
      setProfileImage(`${data.publicUrl}?t=${new Date().getTime()}`);
      Alert.alert('Success', 'Photo updated!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Upload failed. Ensure bucket is public.');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#C2410C" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#451A03" />

      {/* Styled Header matching HomeScreen Warm Gradient Theme */}
      <LinearGradient
        colors={['#451A03', '#7C2D12', '#C2410C']}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {view !== 'menu' ? (
          <TouchableOpacity onPress={() => setView('menu')} style={styles.headerLeftAction} activeOpacity={0.8}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRightSpacer} />
        )}
        <Text style={styles.headerTitleText}>
          {view === 'menu' ? "My Profile" : view === 'address' ? "Personal Info" : "Account Settings"}
        </Text>
        <View style={styles.headerRightSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {view === 'menu' && (
          <View>
            <View style={styles.profileCard}>
              <View style={styles.avatarWrapper}>
                {uploading ? <ActivityIndicator color="#C2410C" /> : profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}><Ionicons name="person" size={50} color="#C2410C" /></View>
                )}
                <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8} onPress={pickImage}>
                  <Feather name="camera" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.userName}>{userData?.full_name || "User"}</Text>
              {userData?.phone ? <Text style={styles.userPhone}>{userData.phone}</Text> : null}
            </View>

            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setView('address')}>
                <View style={[styles.iconBg, {backgroundColor: '#FFF7ED'}]}><Feather name="map-pin" size={20} color="#C2410C" /></View>
                <View style={styles.menuTextContent}>
                  <Text style={styles.menuLabel}>Personal Info</Text>
                  <Text style={styles.menuSubLabel} numberOfLines={1}>{tempAddress.details || 'Tap to add address'}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => router.push('/customer/history')}>
                <View style={[styles.iconBg, {backgroundColor: '#FFF7ED'}]}><Feather name="clock" size={20} color="#C2410C" /></View>
                <View style={styles.menuTextContent}>
                  <Text style={styles.menuLabel}>History</Text>
                  <Text style={styles.menuSubLabel}>View past orders and status</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={() => setView('settings')}>
                <View style={[styles.iconBg, {backgroundColor: '#FFF7ED'}]}><Feather name="settings" size={20} color="#C2410C" /></View>
                <View style={styles.menuTextContent}><Text style={styles.menuLabel}>Account Settings</Text></View>
                <Feather name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  await logout();
                  router.replace('/login');
                } catch (err) {
                  console.error('Logout failed', err);
                  Alert.alert('Logout failed', 'Please try again.');
                }
              }}
            >
              <Feather name="log-out" size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {view === 'address' && (
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput style={styles.input} value={tempAddress.name} onChangeText={(t) => setTempAddress({...tempAddress, name: t})} placeholderTextColor="#94A3B8" />
            
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput style={styles.input} value={tempAddress.phone} onChangeText={(t) => setTempAddress({...tempAddress, phone: t})} keyboardType="phone-pad" placeholderTextColor="#94A3B8" />
            
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput style={styles.input} value={tempAddress.details} onChangeText={(t) => setTempAddress({...tempAddress, details: t})} placeholderTextColor="#94A3B8" />
            
            <TouchableOpacity activeOpacity={0.8} onPress={async () => {
              if (!user) return;
              try {
                const profileUpdates = {
                  full_name: tempAddress.name,
                  phone: tempAddress.phone,
                  address: tempAddress.details,
                };
                const customerUpdates = {
                  address: tempAddress.details,
                };

                const changedFields = [];
                if (userData?.full_name !== tempAddress.name) changedFields.push('name');
                if (userData?.phone !== tempAddress.phone) changedFields.push('phone');
                if (userData?.address !== tempAddress.details) changedFields.push('address');

                const [{ error: customerUpdateError }, { error: profileUpdateError }] = await Promise.all([
                  supabase.from('customers').update(customerUpdates).eq('id', user.id),
                  supabase.from('profiles').update(profileUpdates).eq('id', user.id),
                ]);

                if (customerUpdateError || profileUpdateError) {
                  const errorMessage = customerUpdateError?.message || profileUpdateError?.message || 'Failed to update profile data in one or more tables.';
                  throw new Error(errorMessage);
                }

                if (typeof updateLocalUserData === 'function') {
                  updateLocalUserData(profileUpdates);
                }
                if (user?.id) await refreshUserData(user.id);

                const savedMessage = changedFields.length > 0
                  ? `Updated ${changedFields.join(', ')}.`
                  : 'No changes were detected.';

                Alert.alert('Saved', savedMessage);
                setView('menu');
              } catch (err) {
                console.error('Update failed', err);
                Alert.alert('Error', 'Could not save your profile.');
              }
            }}>
              <LinearGradient
                colors={['#C2410C', '#9A3412']}
                style={styles.saveBtn}
              >
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {view === 'settings' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Account Settings</Text>

            <Text style={[styles.inputLabel, { marginTop: 6 }]}>Change Password</Text>
            <TextInput style={styles.input} placeholder="New password" placeholderTextColor="#94A3B8" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            <TextInput style={styles.input} placeholder="Confirm new password" placeholderTextColor="#94A3B8" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

            <Text style={[styles.inputLabel, { marginTop: 6 }]}>Change Email</Text>
            <TextInput style={styles.input} placeholder="New email address" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" value={newEmail} onChangeText={setNewEmail} />

            <View style={{ height: 10 }} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch 
                value={isNotificationsEnabled} 
                onValueChange={setIsNotificationsEnabled} 
                trackColor={{ true: "#C2410C", false: "#E2E8F0" }} 
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity activeOpacity={0.8} style={{ marginTop: 10 }} onPress={async () => {
              try {
                if (newPassword) {
                  if (newPassword !== confirmPassword) {
                    Alert.alert('Error', 'Passwords do not match.');
                    return;
                  }
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) throw error;
                }

                if (newEmail && newEmail.trim() !== '') {
                  const { error: emailErr } = await supabase.auth.updateUser({ email: newEmail.trim().toLowerCase() });
                  if (emailErr) throw emailErr;
                }

                if (user?.id) await refreshUserData(user.id);
                setNewPassword(''); setConfirmPassword(''); setNewEmail('');
                Alert.alert('Saved', 'Account settings updated.');
                setView('menu');
              } catch (err: any) {
                console.error('Settings update failed', err);
                Alert.alert('Error', err?.message || 'Could not save settings.');
              }
            }}>
              <LinearGradient
                colors={['#C2410C', '#9A3412']}
                style={styles.saveBtn}
              >
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  gradientHeader: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'android' ? 20 : 0,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitleText: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerLeftAction: { 
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerRightSpacer: {
    width: 36,
  },

  content: { padding: 20, paddingBottom: 40 },
  
  profileCard: { 
    alignItems: 'center', 
    marginBottom: 24, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 28, 
    paddingVertical: 24, 
    paddingHorizontal: 20, 
    borderWidth: 1, 
    borderColor: '#F1F5F9', 
    shadowColor: '#C2410C', 
    shadowOpacity: 0.12, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowRadius: 16, 
    elevation: 4 
  },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatarPlaceholder: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    backgroundColor: '#FFF7ED', 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 2, 
    borderWidth: 1, 
    borderColor: '#FFEDD5' 
  },
  avatarImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#FFF' },
  cameraBtn: { 
    position: 'absolute', 
    bottom: 5, 
    right: 0, 
    backgroundColor: '#C2410C', 
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 4,
    shadowColor: '#C2410C',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  userName: { fontSize: 22, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  userPhone: { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '600' },
  
  menuContainer: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 8, 
    elevation: 6, 
    shadowColor: '#C2410C', 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F8FAFC' 
  },
  iconBg: { 
    width: 42, 
    height: 42, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#FFEDD5'
  },
  menuTextContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  menuSubLabel: { fontSize: 12, color: '#64748B', marginTop: 3, fontWeight: '600' },
  
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 24, 
    padding: 14, 
    backgroundColor: '#FEF2F2', 
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FEE2E2'
  },
  logoutText: { marginLeft: 8, color: '#EF4444', fontWeight: '800', fontSize: 15 },
  
  formCard: { 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderRadius: 28, 
    elevation: 12, 
    shadowColor: '#C2410C', 
    shadowOpacity: 0.12, 
    shadowRadius: 16, 
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  formTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 16, letterSpacing: -0.3 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 8, marginLeft: 4 },
  input: { 
    backgroundColor: '#F8FAFC', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 16, 
    fontSize: 15, 
    color: '#1E293B', 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    fontWeight: '600'
  },
  saveBtn: { 
    paddingVertical: 16, 
    borderRadius: 18, 
    alignItems: 'center', 
    marginTop: 8,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  settingLabel: { fontWeight: '800', color: '#1E293B', fontSize: 15 },
});