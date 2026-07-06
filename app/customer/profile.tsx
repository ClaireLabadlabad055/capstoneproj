import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  ScrollView, TextInput, Alert, Switch, StatusBar, Image, Platform, ActivityIndicator 
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabaseClient';

export default function Profile() {
  const router = useRouter();
  const { userProfile, setUserProfile } = useCart();
  const [view, setView] = useState<'menu' | 'address' | 'settings'>('menu');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [tempAddress, setTempAddress] = useState({
    name: userProfile?.name || "Claire Dela Cruz",
    phone: "0912 345 6789",
    details: "Poblacion, Toledo City, Cebu",
    landmark: "Near Toledo City Science High School"
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfileImage(data.avatar_url);
      setTempAddress(prev => ({ ...prev, name: data.name || prev.name }));
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadAvatar(result.assets[0].uri);
    }
  };

const uploadAvatar = async (uri: string) => {
    setLoading(true);
    try {
      // 1. Use getSession() to check if a user is actually logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        // Debugging log to see what's happening
        console.log("No session found. Current session:", session);
        Alert.alert("Error", "Your session has expired. Please log out and log in again.");
        return;
      }

      const userId = session.user.id;
      const response = await fetch(uri);
      const blob = await response.blob();
      const filePath = `${userId}/avatar.jpg`;

      // 2. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // 4. Update Database
      await supabase.from('profiles').upsert({ id: userId, avatar_url: data.publicUrl });
      
      setProfileImage(data.publicUrl);
      Alert.alert("Success", "Photo updated!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Could not upload photo. Check your connection.");
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      Alert.alert("Error", "Session expired. Please login again.");
      return;
    }
    await supabase.from('profiles').upsert({ id: session.user.id, name: tempAddress.name });
    setUserProfile({ ...userProfile, name: tempAddress.name });
    Alert.alert("Success", "Profile updated successfully!");
    setView('menu');
  };

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
                {loading ? <ActivityIndicator /> : profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={50} color="#D2B48C" />
                  </View>
                )}
                <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                  <Feather name="camera" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.userName}>{tempAddress.name}</Text>
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

              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/customer/orders')}>
                <View style={[styles.iconBg, {backgroundColor: '#F5F5F5'}]}><Feather name="shopping-bag" size={20} color="#4A342E" /></View>
                <View style={styles.menuTextContent}>
                  <Text style={styles.menuLabel}>My Orders</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setView('settings')}>
                <View style={[styles.iconBg, {backgroundColor: '#FAF9F6'}]}><Feather name="settings" size={20} color="#708090" /></View>
                <View style={styles.menuTextContent}>
                  <Text style={styles.menuLabel}>Account Settings</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/login')}>
              <Feather name="log-out" size={18} color="#FF3B30" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {view === 'address' && (
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput style={styles.input} value={tempAddress.name} onChangeText={(t) => setTempAddress({...tempAddress, name: t})} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveBtnText}>Save Changes</Text></TouchableOpacity>
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