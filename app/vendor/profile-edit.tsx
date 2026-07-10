import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView, Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { COLORS } from '../../styles/globalStyles';
import { useVendor } from '../../context/VendorContext';

const { width } = Dimensions.get('window');

export default function VendorProfileEdit() {
  const router = useRouter();
  const { vendorProfile, saveVendorProfile } = useVendor();

  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);

  useEffect(() => {
    if (vendorProfile) {
      setVendorName(vendorProfile.name || '');
      setDescription(vendorProfile.description || '');
      setLocation(vendorProfile.location || '');
    }
  }, [vendorProfile]);

  // ✅ LOGIC: Image Selection
  const pickCoverPhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const handleSaveChanges = async () => {
    if (!vendorName || !location) {
      Alert.alert("Error", "Store Name and Location are required.");
      return;
    }

    const result = await saveVendorProfile({
      name: vendorName,
      description,
      location,
    });

    if (!result.success) {
      Alert.alert('Update Failed', 'Your profile could not be synced right now.');
      return;
    }

    Alert.alert('Success', 'Your shop profile has been updated and synced.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          
          {/* --- EDITABLE COVER PHOTO --- */}
          <View style={styles.imageHeader}>
            <Image 
              source={coverImage ? { uri: coverImage } : require('../../assets/images/cstbg.jpg')} 
              style={styles.coverImg} 
            />
            <View style={styles.overlay} />
            
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="x" size={22} color={COLORS.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cameraBtn} onPress={pickCoverPhoto}>
              <MaterialCommunityIcons name="camera-flip" size={24} color="#FFF" />
              <Text style={styles.cameraBtnText}>Change Cover Photo</Text>
            </TouchableOpacity>
          </View>

          {/* --- EDITABLE FIELDS --- */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionLabel}>Shop Branding</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Store Name</Text>
              <TextInput 
                style={styles.input} 
                value={vendorName} 
                onChangeText={setVendorName}
                placeholder="e.g. Takoyaki Corner"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Store Location</Text>
              <View style={styles.locationInputRow}>
                <Ionicons name="location" size={18} color={COLORS.primary} />
                <TextInput 
                  style={[styles.input, { flex: 1, borderBottomWidth: 0, marginTop: 0 }]} 
                  value={location} 
                  onChangeText={setLocation}
                  placeholder="Street, Barangay, City"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Shop Description</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={description} 
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder="Tell customers about your delicacies..."
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
              <Text style={styles.saveButtonText}>Update Public Profile</Text>
            </TouchableOpacity>

            <Text style={styles.infoNote}>
              Note: These changes will be visible to all customers on the ToledoGo app.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFB' },
  imageHeader: { height: 250, width: '100%', position: 'relative' },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: '#FFF', padding: 10, borderRadius: 15, elevation: 5 },
  
  cameraBtn: { 
    position: 'absolute', 
    bottom: 20, 
    alignSelf: 'center', 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  cameraBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 13 },

  formContainer: { 
    padding: 25, 
    backgroundColor: '#FBFBFB', 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35, 
    marginTop: -30 
  },
  sectionLabel: { fontSize: 18, fontWeight: '800', color: COLORS.secondary, marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#AAA', textTransform: 'uppercase', marginBottom: 8 },
  input: { 
    fontSize: 15, 
    color: COLORS.secondary, 
    fontWeight: '600', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE' 
  },
  locationInputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE',
    gap: 5
  },
  textArea: { height: 100, textAlignVertical: 'top', backgroundColor: '#F0F0F0', borderRadius: 15, paddingHorizontal: 15, marginTop: 10, borderBottomWidth: 0 },
  
  saveButton: { 
    backgroundColor: COLORS.primary, 
    padding: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginTop: 20,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  saveButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  infoNote: { textAlign: 'center', color: '#BBB', fontSize: 11, marginTop: 20, fontStyle: 'italic' }
});