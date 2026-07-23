import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
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
  const { vendorProfile, saveVendorProfile, uploadCoverImage } = useVendor();

  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetupPoint, setMeetupPoint] = useState('');
  const [meetupDetails, setMeetupDetails] = useState('');
  const [mobile, setMobile] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);

  useEffect(() => {
    if (vendorProfile) {
      setVendorName(vendorProfile.name || '');
      setDescription(vendorProfile.description || '');
      setLocation(vendorProfile.location || '');
      setMeetupPoint(vendorProfile.meetupPoint || '');
      setMeetupDetails(vendorProfile.meetupDetails || '');
      setMobile(vendorProfile.mobile || '');
      if (typeof vendorProfile.coverImage === 'string') {
        setCoverImage(vendorProfile.coverImage);
      }
    }
  }, [vendorProfile]);

  // ✅ LOGIC: Image Selection
  const pickCoverPhoto = useCallback(async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setCoverImage(asset.uri);
      setCoverBase64(asset.base64 || null);
    }
  }, []);

  const handleSaveChanges = useCallback(async () => {
    if (!vendorName || !location) {
      Alert.alert("Error", "Store Name and Location are required.");
      return;
    }

    if (coverImage && coverImage.startsWith('file://')) {
      const uploadResult = await uploadCoverImage({ uri: coverImage, base64: coverBase64 || undefined });
      if (!uploadResult?.success) {
        Alert.alert('Cover photo update failed', 'Your shop photo could not be uploaded right now.');
        return;
      }
    }

    const result = await saveVendorProfile({
      name: vendorName,
      description,
      location,
      meetupPoint,
      meetupDetails,
      mobile,
    });

    if (!result.success) {
      Alert.alert('Update Failed', 'Your profile could not be synced right now.');
      return;
    }

    Alert.alert('Success', 'Your shop profile has been updated and synced.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  }, [vendorName, location, coverImage, coverBase64, description, meetupPoint, meetupDetails, mobile, uploadCoverImage, saveVendorProfile, router]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#C2410C" />

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
            
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
              <Feather name="arrow-left" size={20} color="#C2410C" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cameraBtn} onPress={pickCoverPhoto} activeOpacity={0.8}>
              <MaterialCommunityIcons name="camera-flip" size={20} color="#FFF" />
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
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Store Location</Text>
              <View style={styles.locationInputRow}>
                <Ionicons name="location" size={18} color="#C2410C" />
                <TextInput 
                  style={[styles.input, { flex: 1, borderBottomWidth: 0, marginTop: 0 }]} 
                  value={location} 
                  onChangeText={setLocation}
                  placeholder="Street, Barangay, City"
                  placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Pickup Landmark</Text>
              <TextInput
                style={styles.input}
                value={meetupPoint}
                onChangeText={setMeetupPoint}
                placeholder="e.g. Near the market"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Pickup Details</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={meetupDetails}
                onChangeText={setMeetupDetails}
                multiline
                numberOfLines={3}
                placeholder="Tell customers where to meet or how to receive the order"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                placeholder="e.g. 09123456789"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} activeOpacity={0.9}>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  imageHeader: { height: 260, width: '100%', position: 'relative' },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA' },
  
  cameraBtn: { 
    position: 'absolute', 
    bottom: 20, 
    alignSelf: 'center', 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(15, 23, 42, 0.75)', 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  cameraBtnText: { color: '#FFF', fontWeight: '800', marginLeft: 8, fontSize: 13, letterSpacing: -0.2 },

  formContainer: { 
    padding: 24, 
    backgroundColor: '#F8FAFC', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    marginTop: -30,
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  sectionLabel: { fontSize: 20, fontWeight: '900', color: '#1E293B', marginBottom: 20, letterSpacing: -0.3 },
  inputGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1.5 },
  input: { 
    fontSize: 15, 
    color: '#1E293B', 
    fontWeight: '700', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0',
    letterSpacing: -0.3
  },
  locationInputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0',
    gap: 8
  },
  textArea: { 
    height: 100, 
    textAlignVertical: 'top', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    paddingTop: 14, 
    marginTop: 6, 
    borderBottomWidth: 0, 
    fontWeight: '700' 
  },
  
  saveButton: { 
    backgroundColor: '#C2410C', 
    padding: 18, 
    borderRadius: 18, 
    alignItems: 'center', 
    marginTop: 24,
    shadowColor: '#C2410C',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
  },
  saveButtonText: { color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.8 },
  infoNote: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 20, fontStyle: 'italic', fontWeight: '700' }
});