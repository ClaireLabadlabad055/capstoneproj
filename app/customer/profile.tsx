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
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.whiteHeader}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>
            {view === 'menu' ? "My Profile" : view === 'address' ? "Personal Info" : "Account Settings"}
          </Text>
        </View>
        {view !== 'menu' && (
          <TouchableOpacity onPress={() => setView('menu')} style={styles.headerLeftAction}>
            <Feather name="arrow-left" size={24} color="#4A342E" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {view === 'menu' && (
          <View>
            <View style={styles.profileCard}>
              <View style={styles.avatarWrapper}>
                {uploading ? <ActivityIndicator /> : profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}><Ionicons name="person" size={50} color="#D2B48C" /></View>
                )}
                <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                  <Feather name="camera" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.userName}>{userData?.full_name || "User"}</Text>
              {userData?.phone ? <Text style={styles.userPhone}>{userData.phone}</Text> : null}
            </View>

            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => setView('address')}>
                <View style={[styles.iconBg, {backgroundColor: '#FDF5F2'}]}><Feather name="map-pin" size={20} color="#8D493A" /></View>
                <View style={styles.menuTextContent}>
                  <Text style={styles.menuLabel}>Personal Info</Text>
                  <Text style={styles.menuSubLabel}>{tempAddress.details}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/customer/history')}>
                <View style={[styles.iconBg, {backgroundColor: '#EFF6FF'}]}><Feather name="clock" size={20} color="#3B82F6" /></View>
                <View style={styles.menuTextContent}>
                  <Text style={styles.menuLabel}>History</Text>
                  <Text style={styles.menuSubLabel}>View past orders and status</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setView('settings')}>
                <View style={[styles.iconBg, {backgroundColor: '#FAF9F6'}]}><Feather name="settings" size={20} color="#708090" /></View>
                <View style={styles.menuTextContent}><Text style={styles.menuLabel}>Account Settings</Text></View>
                <Feather name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
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
              <Feather name="log-out" size={18} color="#FF3B30" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {view === 'address' && (
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput style={styles.input} value={tempAddress.name} onChangeText={(t) => setTempAddress({...tempAddress, name: t})} />
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput style={styles.input} value={tempAddress.phone} onChangeText={(t) => setTempAddress({...tempAddress, phone: t})} keyboardType="phone-pad" />
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput style={styles.input} value={tempAddress.details} onChangeText={(t) => setTempAddress({...tempAddress, details: t})} />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={async () => {
                if (!user) return;
                try {
                  const updates = {
                    full_name: tempAddress.name,
                    phone: tempAddress.phone,
                    address: tempAddress.details,
                  };

                  const [{ error: customerUpdateError }, { error: profileUpdateError }] = await Promise.all([
                    supabase.from('customers').update(updates).eq('id', user.id),
                    supabase.from('profiles').update(updates).eq('id', user.id),
                  ]);

                  if (customerUpdateError || profileUpdateError) {
                    const errorMessage = customerUpdateError?.message || profileUpdateError?.message || 'Failed to update profile data in one or more tables.';
                    throw new Error(errorMessage);
                  }

                  if (typeof updateLocalUserData === 'function') {
                    updateLocalUserData(updates);
                  }
                  if (user?.id) await refreshUserData(user.id);
                  Alert.alert('Saved', 'Profile and shipping address updated.');
                  setView('menu');
                } catch (err) {
                  console.error('Update failed', err);
                  Alert.alert('Error', 'Could not save your profile.');
                }
              }}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {view === 'settings' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Account Settings</Text>

            <Text style={[styles.inputLabel, { marginTop: 6 }]}>Change Password</Text>
            <TextInput style={styles.input} placeholder="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            <TextInput style={styles.input} placeholder="Confirm new password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

            <Text style={[styles.inputLabel, { marginTop: 6 }]}>Change Email</Text>
            <TextInput style={styles.input} placeholder="New email address" keyboardType="email-address" autoCapitalize="none" value={newEmail} onChangeText={setNewEmail} />

            <View style={{ height: 10 }} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch value={isNotificationsEnabled} onValueChange={setIsNotificationsEnabled} trackColor={{ true: "#4A342E" }} />
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={async () => {
                try {
                  // 1) Change password if provided
                  if (newPassword) {
                    if (newPassword !== confirmPassword) {
                      Alert.alert('Error', 'Passwords do not match.');
                      return;
                    }
                    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) throw error;
                  }


                  // 2) Change email if provided
                  if (newEmail && newEmail.trim() !== '') {
                    const { data: emailData, error: emailErr } = await supabase.auth.updateUser({ email: newEmail.trim().toLowerCase() });
                    if (emailErr) throw emailErr;
                  }

                  // Refresh local context
                  if (user?.id) await refreshUserData(user.id);
                  setNewPassword(''); setConfirmPassword('');
                  Alert.alert('Saved', 'Account settings updated.');
                  setView('menu');
                } catch (err: any) {
                  console.error('Settings update failed', err);
                  Alert.alert('Error', err?.message || 'Could not save settings.');
                }
              }}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FBFC' },
  whiteHeader: { height: 60, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1, borderColor: '#F0F0F0', marginTop: Platform.OS === 'android' ? 20 : 0 },
  headerTitleContainer: { position: 'absolute', left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  headerTitleText: { fontSize: 18, fontWeight: '800', color: '#4A342E' },
  headerLeftAction: { padding: 8, zIndex: 10 },
  content: { paddingHorizontal: 20, paddingTop: 30 },
  profileCard: { alignItems: 'center', marginBottom: 35 },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  avatarImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#FFF' },
  cameraBtn: { position: 'absolute', bottom: 5, right: 0, backgroundColor: '#4A342E', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  userName: { fontSize: 24, fontWeight: '900', color: '#4A342E' },
  userPhone: { fontSize: 14, color: '#666', marginTop: 6 },
  menuContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 10, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  iconBg: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuTextContent: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '700', color: '#4A342E' },
  menuSubLabel: { fontSize: 12, color: '#AAA', marginTop: 3 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, padding: 10 },
  logoutText: { marginLeft: 8, color: '#FF3B30', fontWeight: '800', fontSize: 16 },
  formCard: { backgroundColor: '#FFF', padding: 25, borderRadius: 25, elevation: 2 },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#4A342E', marginBottom: 10 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#FAF9F6', padding: 16, borderRadius: 15, marginBottom: 18, fontSize: 15, color: '#4A342E', borderWidth: 1, borderColor: '#F0EBE3' },
  saveBtn: { backgroundColor: '#4A342E', padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  settingLabel: { fontWeight: '600', color: '#4A342E', fontSize: 15 },
});