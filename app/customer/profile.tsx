import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert, 
  Switch, 
  StatusBar, 
  Image,
  Platform 
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext';

export default function Profile() {
  const router = useRouter();
  const { userProfile, setUserProfile } = useCart();
  const [view, setView] = useState<'menu' | 'address' | 'settings'>('menu');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // ✅ New States for Settings
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [tempAddress, setTempAddress] = useState({
    name: userProfile?.name || "Claire Dela Cruz",
    phone: "0912 345 6789",
    details: "Poblacion, Toledo City, Cebu",
    landmark: "Near Toledo City Science High School"
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Allow gallery access to change your photo.");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    setUserProfile({ ...userProfile, name: tempAddress.name });
    Alert.alert("Success", "Profile updated successfully!");
    setView('menu');
  };

  const renderHeader = (title: string, canGoBack: boolean) => (
    <View style={styles.whiteHeader}>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitleText}>{title}</Text>
      </View>
      {canGoBack ? (
        <TouchableOpacity onPress={() => setView('menu')} style={styles.headerLeftAction}>
          <Feather name="arrow-left" size={24} color="#4A342E" />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {view === 'menu' ? renderHeader("My Profile", false) : null}
      {view === 'address' ? renderHeader("Shipping Address", true) : null}
      {view === 'settings' ? renderHeader("Account Settings", true) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {view === 'menu' && (
          <View>
            <View style={styles.profileCard}>
              <View style={styles.avatarWrapper}>
                {profileImage ? (
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
              <Text style={styles.userName}>{userProfile?.name || tempAddress.name}</Text>
              <Text style={styles.userEmail}>claire.it@cctc.edu.ph</Text>
            </View>

            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => setView('address')}>
                <View style={[styles.iconBg, {backgroundColor: '#FDF5F2'}]}>
                  <Feather name="map-pin" size={20} color="#8D493A" />
                </View>
                <View style={styles.menuTextContent}>
                  <Text style={styles.menuLabel}>Shipping Address</Text>
                  <Text style={styles.menuSubLabel} numberOfLines={1}>{tempAddress.details}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/customer/orders')}>
                <View style={[styles.iconBg, {backgroundColor: '#F5F5F5'}]}>
                  <Feather name="shopping-bag" size={20} color="#4A342E" />
                </View>
                <View style={styles.menuTextContent}>
                  <Text style={styles.menuLabel}>My Orders</Text>
                  <Text style={styles.menuSubLabel}>History & Active Orders</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setView('settings')}>
                <View style={[styles.iconBg, {backgroundColor: '#FAF9F6'}]}>
                  <Feather name="settings" size={20} color="#708090" />
                </View>
                <View style={styles.menuTextContent}>
                  <Text style={styles.menuLabel}>Account Settings</Text>
                  <Text style={styles.menuSubLabel}>Security & Preferences</Text>
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
            <Text style={styles.inputLabel}>Contact Number</Text>
            <TextInput style={styles.input} value={tempAddress.phone} keyboardType="phone-pad" onChangeText={(t) => setTempAddress({...tempAddress, phone: t})} />
            <Text style={styles.inputLabel}>Delivery Address</Text>
            <TextInput style={styles.input} value={tempAddress.details} onChangeText={(t) => setTempAddress({...tempAddress, details: t})} />
            <Text style={styles.inputLabel}>Landmark</Text>
            <TextInput style={styles.input} value={tempAddress.landmark} onChangeText={(t) => setTempAddress({...tempAddress, landmark: t})} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {view === 'settings' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Preferences</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch 
                value={isNotificationsEnabled} 
                onValueChange={setIsNotificationsEnabled}
                trackColor={{ false: "#E0E0E0", true: "#4A342E" }} 
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Dark Mode (Beta)</Text>
              <Switch 
                value={isDarkMode} 
                onValueChange={setIsDarkMode}
                trackColor={{ false: "#E0E0E0", true: "#4A342E" }} 
              />
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.formTitle}>Security</Text>
            <TouchableOpacity style={styles.passwordBtn} onPress={() => Alert.alert("Sent", "Reset link sent to your email!")}>
              <Text style={styles.passwordBtnText}>Change Password</Text>
              <Feather name="chevron-right" size={16} color="#4A342E" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={() => setView('menu')}>
              <Text style={styles.saveBtnText}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBFC' },
  whiteHeader: {
    height: 60,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginTop: Platform.OS === 'android' ? 20 : 0,
    position: 'relative',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#4A342E',
  },
  headerLeftAction: { 
    padding: 8,
    zIndex: 10,
  },
  content: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
  profileCard: { alignItems: 'center', marginBottom: 35 },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatarPlaceholder: { 
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFF', 
    justifyContent: 'center', alignItems: 'center', elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 
  },
  avatarImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#FFF' },
  cameraBtn: { 
    position: 'absolute', bottom: 5, right: 0, backgroundColor: '#4A342E', 
    width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', 
    elevation: 5, borderWidth: 2, borderColor: '#FFF' 
  },
  userName: { fontSize: 24, fontWeight: '900', color: '#4A342E' },
  userEmail: { fontSize: 14, color: '#999', marginTop: 4 },
  menuContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 10, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  iconBg: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuTextContent: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '700', color: '#4A342E' },
  menuSubLabel: { fontSize: 12, color: '#AAA', marginTop: 3 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, padding: 10 },
  logoutText: { marginLeft: 8, color: '#FF3B30', fontWeight: '800', fontSize: 16 },
  formCard: { backgroundColor: '#FFF', padding: 25, borderRadius: 25, elevation: 2 },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#4A342E', marginBottom: 10, marginTop: 5 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#FAF9F6', padding: 16, borderRadius: 15, marginBottom: 18, fontSize: 15, color: '#4A342E', borderWidth: 1, borderColor: '#F0EBE3' },
  saveBtn: { backgroundColor: '#4A342E', padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  passwordBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, marginBottom: 10 },
  passwordBtnText: { color: '#4A342E', fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 15 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  settingLabel: { fontWeight: '600', color: '#4A342E', fontSize: 15 },
});