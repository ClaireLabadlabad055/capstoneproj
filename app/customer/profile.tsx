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
  const { user, userData, loading: authLoading, logout } = useAuth();
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [view, setView] = useState<'menu' | 'address' | 'settings'>('menu');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  const [tempAddress, setTempAddress] = useState({
    name: userData?.name || "Claire Dela Cruz",
    details: "Poblacion, Toledo City, Cebu",
  });

  useEffect(() => {
    const getActiveUser = async () => {
      if (user?.id) {
        setActiveUserId(user.id);
        return;
      }

      if (userData?.uid) {
        setActiveUserId(userData.uid);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setActiveUserId(session.user.id);
        return;
      }

      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (!userError && authUser?.id) {
        setActiveUserId(authUser.id);
      }
    };

    getActiveUser();

    if (userData?.avatar_url) {
      setProfileImage(`${userData.avatar_url}?t=${new Date().getTime()}`);
    }
  }, [user, userData]);

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
    setUploading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        throw new Error('You need to be signed in to upload a profile photo.');
      }

      const currentUserId = session.user.id;
      setActiveUserId(currentUserId);

      const filePath = `${currentUserId}/${Date.now()}.jpg`;
      const fileBuffer = decode(base64);
      const buckets = ['avatars', 'avatar', 'profile-images', 'images'];

      let uploadedUrl: string | null = null;
      let lastError: Error | null = null;

      for (const bucketName of buckets) {
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          lastError = uploadError as Error;
          continue;
        }

        const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        if (publicData?.publicUrl) {
          uploadedUrl = publicData.publicUrl;
          break;
        }

        try {
          const { data: signedData } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 60 * 60 * 24);
          if (signedData?.signedUrl) {
            uploadedUrl = signedData.signedUrl;
            break;
          }
        } catch (signedError) {
          console.warn('Signed URL fallback failed', signedError);
        }
      }

      if (!uploadedUrl) {
        const message = lastError instanceof Error ? lastError.message : 'Unable to upload image to storage.';
        throw new Error(message);
      }

      setProfileImage(`${uploadedUrl}?t=${new Date().getTime()}`);
      Alert.alert('Success', 'Photo updated!');
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Photo upload failed. Please check the storage bucket and database permissions.';
      Alert.alert('Error', message);
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
            {view === 'menu' ? "My Profile" : view === 'address' ? "Shipping Address" : "Account Settings"}
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
              <Text style={styles.userName}>{userData?.name || "User"}</Text>
            </View>

            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => setView('address')}>
                <View style={[styles.iconBg, {backgroundColor: '#FDF5F2'}]}><Feather name="map-pin" size={20} color="#8D493A" /></View>
                <View style={styles.menuTextContent}>
                  <Text style={styles.menuLabel}>Shipping Address</Text>
                  <Text style={styles.menuSubLabel}>{tempAddress.details}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setView('settings')}>
                <View style={[styles.iconBg, {backgroundColor: '#FAF9F6'}]}><Feather name="settings" size={20} color="#708090" /></View>
                <View style={styles.menuTextContent}><Text style={styles.menuLabel}>Account Settings</Text></View>
                <Feather name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Feather name="log-out" size={18} color="#FF3B30" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {view === 'address' && (
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput style={styles.input} value={tempAddress.name} onChangeText={(t) => setTempAddress({...tempAddress, name: t})} />
            <TouchableOpacity style={styles.saveBtn} onPress={() => setView('menu')}><Text style={styles.saveBtnText}>Save Changes</Text></TouchableOpacity>
          </View>
        )}

        {view === 'settings' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Preferences</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch value={isNotificationsEnabled} onValueChange={setIsNotificationsEnabled} trackColor={{ true: "#4A342E" }} />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={() => setView('menu')}><Text style={styles.saveBtnText}>Back to Profile</Text></TouchableOpacity>
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