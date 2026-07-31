import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { useVendor } from '../../context/VendorContext';

const { width } = Dimensions.get('window');

export default function VendorProfileEdit() {
  const router = useRouter();
  const { vendorProfile, saveVendorProfile, uploadCoverImage, uploadQrImage } = useVendor() as any;

  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [mobile, setMobile] = useState('');
  
  // Available Pick-up Batches / Schedule State (Mock up data included)
  const [pickupBatches, setPickupBatches] = useState<{ batchName: string; timeRange: string }[]>([
    { batchName: 'Batch 1', timeRange: '10:00 AM – 11:00 AM' },
    { batchName: 'Batch 2', timeRange: '3:00 PM – 4:00 PM' }
  ]);
  const [currentBatchName, setCurrentBatchName] = useState('');
  const [currentTimeRange, setCurrentTimeRange] = useState('');

  // Multiple Pickup Landmarks State
  const [pickupLandmarks, setPickupLandmarks] = useState<{ landmark: string; details: string }[]>([]);
  const [currentLandmark, setCurrentLandmark] = useState('');
  const [currentLandmarkDetails, setCurrentLandmarkDetails] = useState('');

  // Payment field states
  const [gcashName, setGcashName] = useState('');
  const [gcashNumber, setGcashNumber] = useState('');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);

  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);

  useEffect(() => {
    if (vendorProfile) {
      setVendorName(vendorProfile.name || vendorProfile.business_name || '');
      setDescription(vendorProfile.description || vendorProfile.delicacy_type || '');
      setLocation(vendorProfile.location || vendorProfile.barangay || '');
      setMobile(vendorProfile.mobile || vendorProfile.phone || '');
      
      // Load pick-up batches if available from backend profile
      const rawBatches = vendorProfile.pickupBatches || vendorProfile.pickup_batches || vendorProfile.batches;
      if (rawBatches) {
        let parsedBatches = rawBatches;
        if (typeof rawBatches === 'string') {
          try {
            parsedBatches = JSON.parse(rawBatches);
          } catch (e) {
            parsedBatches = [];
          }
        }
        if (Array.isArray(parsedBatches) && parsedBatches.length > 0) {
          const formattedBatches = parsedBatches.map((item: any) => ({
            batchName: String(item?.batchName || item?.name || 'Batch').trim(),
            timeRange: String(item?.timeRange || item?.time || '').trim()
          })).filter(b => b.timeRange !== '');
          if (formattedBatches.length > 0) {
            setPickupBatches(formattedBatches);
          }
        }
      }

      // Load multiple pickup options properly, handling JSON array columns from Supabase
      const rawLandmarks = vendorProfile.pickupLandmarks || vendorProfile.pickup_landmarks;
      if (rawLandmarks) {
        let parsed = rawLandmarks;
        if (typeof rawLandmarks === 'string') {
          try {
            parsed = JSON.parse(rawLandmarks);
          } catch (e) {
            parsed = [rawLandmarks];
          }
        }

        if (Array.isArray(parsed)) {
          const formatted = parsed.map((item: any) => {
            if (typeof item === 'string') {
              return { landmark: item, details: '' };
            }
            return {
              landmark: String(item?.landmark || item?.name || '').trim(),
              details: String(item?.details || item?.description || '').trim()
            };
          }).filter(opt => opt.landmark !== '');
          setPickupLandmarks(formatted);
        }
      } 
      
      // Fallback if array is empty but legacy fields exist
      if (pickupLandmarks.length === 0 && (vendorProfile.pickup_landmark || vendorProfile.meetupPoint)) {
        setPickupLandmarks([{
          landmark: String(vendorProfile.pickup_landmark || vendorProfile.meetupPoint || '').trim(),
          details: String(vendorProfile.pickup_details || vendorProfile.landmark_details || vendorProfile.meetupDetails || '').trim()
        }]);
      }

      // Load payment details if available
      setGcashName(vendorProfile.gcashName || vendorProfile.gcash_name || '');
      setGcashNumber(vendorProfile.gcashNumber || vendorProfile.gcash_number || '');

      if (typeof vendorProfile.coverImage === 'string' || typeof vendorProfile.cover_image === 'string') {
        setCoverImage(vendorProfile.coverImage || vendorProfile.cover_image);
      }
      if (typeof vendorProfile.qrImage === 'string' || typeof vendorProfile.qr_code_url === 'string') {
        setQrImage(vendorProfile.qrImage || vendorProfile.qr_code_url);
      }
    }
  }, [vendorProfile]);

  // Add Pick-up Batch Option
  const handleAddBatch = () => {
    if (!currentTimeRange.trim()) {
      Alert.alert('Error', 'Please enter a valid pick-up time range.');
      return;
    }
    const batchLabel = currentBatchName.trim() || `Batch ${pickupBatches.length + 1}`;
    setPickupBatches([
      ...pickupBatches,
      { batchName: batchLabel, timeRange: currentTimeRange.trim() }
    ]);
    setCurrentBatchName('');
    setCurrentTimeRange('');
  };

  // Remove Pick-up Batch Option
  const handleRemoveBatch = (index: number) => {
    const updated = pickupBatches.filter((_, i) => i !== index);
    setPickupBatches(updated);
  };

  // Add Pickup Landmark Option
  const handleAddLandmark = () => {
    if (!currentLandmark.trim()) {
      Alert.alert('Error', 'Please enter a pickup landmark name.');
      return;
    }
    setPickupLandmarks([
      ...pickupLandmarks,
      { landmark: currentLandmark.trim(), details: currentLandmarkDetails.trim() }
    ]);
    setCurrentLandmark('');
    setCurrentLandmarkDetails('');
  };

  // Remove Pickup Landmark Option
  const handleRemoveLandmark = (index: number) => {
    const updated = pickupLandmarks.filter((_, i) => i !== index);
    setPickupLandmarks(updated);
  };

  // Cover Photo Selection
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

  // QR Code Selection
  const pickQrCodePhoto = useCallback(async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setQrImage(asset.uri);
      setQrBase64(asset.base64 || null);
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

    if (qrImage && qrImage.startsWith('file://') && uploadQrImage) {
      const qrUploadResult = await uploadQrImage({ uri: qrImage, base64: qrBase64 || undefined });
      if (!qrUploadResult?.success) {
        Alert.alert('QR Code upload failed', 'Your payment QR code could not be uploaded right now.');
        return;
      }
    }

    const result = await saveVendorProfile({
      name: vendorName,
      business_name: vendorName,
      description,
      delicacy_type: description,
      location,
      barangay: location,
      pickupBatches: pickupBatches,
      pickup_batches: pickupBatches,
      pickupLandmarks: pickupLandmarks, 
      pickup_landmarks: pickupLandmarks, 
      mobile,
      phone: mobile,
      gcashName,
      gcash_name: gcashName,
      gcashNumber,
      gcash_number: gcashNumber,
      qrImage: qrImage && !qrImage.startsWith('file://') ? qrImage : undefined,
      qr_code_url: qrImage && !qrImage.startsWith('file://') ? qrImage : undefined
    });

    if (!result.success) {
      Alert.alert('Update Failed', 'Your profile could not be synced right now.');
      return;
    }

    Alert.alert('Success', 'Your shop profile, pick-up schedules, and payment details have been updated.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  }, [vendorName, location, coverImage, coverBase64, qrImage, qrBase64, description, pickupBatches, pickupLandmarks, mobile, gcashName, gcashNumber, uploadCoverImage, uploadQrImage, saveVendorProfile, router]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#C2410C" />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
          
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

          {/* --- FORM CONTAINER --- */}
          <View style={styles.formContainer}>
            
            {/* CARD 1: SHOP BRANDING */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Feather name="shopping-bag" size={18} color="#C2410C" />
                <Text style={styles.cardTitle}>Shop Branding</Text>
              </View>

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

              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
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
            </View>

            {/* CARD 2: AVAILABLE PICK-UP BATCHES / SCHEDULE */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Feather name="clock" size={18} color="#C2410C" />
                <Text style={styles.cardTitle}>Available Pick-up Batches / Schedule</Text>
              </View>
              <Text style={styles.cardSubText}>Set the pick-up time windows available for customers when placing orders.</Text>

              {/* Added Batches List */}
              {pickupBatches.map((item, index) => (
                <View key={index} style={styles.landmarkCard}>
                  <View style={styles.landmarkCardHeader}>
                    <View style={styles.batchBadge}>
                      <Text style={styles.batchBadgeText}>{item.batchName}</Text>
                    </View>
                    <Text style={styles.landmarkCardTitle}>{item.timeRange}</Text>
                    <TouchableOpacity onPress={() => handleRemoveBatch(index)} activeOpacity={0.7}>
                      <Feather name="trash-2" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Inputs to Add New Batch */}
              <View style={styles.addLandmarkContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Batch Label (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={currentBatchName}
                    onChangeText={setCurrentBatchName}
                    placeholder="e.g. Batch 3"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={[styles.inputGroup, { marginBottom: 14 }]}>
                  <Text style={styles.fieldLabel}>Time Range</Text>
                  <TextInput
                    style={styles.input}
                    value={currentTimeRange}
                    onChangeText={setCurrentTimeRange}
                    placeholder="e.g. 5:00 PM – 6:00 PM"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <TouchableOpacity style={styles.addLandmarkBtn} onPress={handleAddBatch} activeOpacity={0.8}>
                  <Feather name="plus" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.addLandmarkBtnText}>Add Pick-up Batch</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CARD 3: PICKUP LANDMARK OPTIONS */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="map" size={18} color="#C2410C" />
                <Text style={styles.cardTitle}>Pickup Landmark Options</Text>
              </View>
              <Text style={styles.cardSubText}>Add multiple meetup locations/landmarks so customers can select their preferred spot during checkout.</Text>

              {/* Added Landmarks List */}
              {pickupLandmarks.map((item, index) => (
                <View key={index} style={styles.landmarkCard}>
                  <View style={styles.landmarkCardHeader}>
                    <Text style={styles.landmarkCardTitle}>{index + 1}. {item.landmark}</Text>
                    <TouchableOpacity onPress={() => handleRemoveLandmark(index)} activeOpacity={0.7}>
                      <Feather name="trash-2" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                  {item.details ? (
                    <Text style={styles.landmarkCardDetails}>{item.details}</Text>
                  ) : null}
                </View>
              ))}

              {/* Inputs to Add New Landmark */}
              <View style={styles.addLandmarkContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Landmark / Spot Name</Text>
                  <TextInput
                    style={styles.input}
                    value={currentLandmark}
                    onChangeText={setCurrentLandmark}
                    placeholder="e.g. Toledo Public Market Entrance"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={[styles.inputGroup, { marginBottom: 14 }]}>
                  <Text style={styles.fieldLabel}>Pickup Instructions / Details</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={currentLandmarkDetails}
                    onChangeText={setCurrentLandmarkDetails}
                    multiline
                    numberOfLines={2}
                    placeholder="e.g. Wait near the fruit stalls, look for the red umbrella"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <TouchableOpacity style={styles.addLandmarkBtn} onPress={handleAddLandmark} activeOpacity={0.8}>
                  <Feather name="plus" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.addLandmarkBtnText}>Add Pickup Option</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
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
            </View>

            {/* CARD 4: ONLINE PAYMENT SETTINGS */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <MaterialCommunityIcons name="qrcode-scan" size={18} color="#C2410C" />
                <Text style={styles.cardTitle}>Online Payment Settings</Text>
              </View>
              <Text style={styles.cardSubText}>Customers will see this QR code and account details during checkout for e-wallet payments.</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>GCash / E-Wallet Account Name</Text>
                <TextInput
                  style={styles.input}
                  value={gcashName}
                  onChangeText={setGcashName}
                  placeholder="e.g. Juan Dela Cruz"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>GCash / E-Wallet Mobile Number</Text>
                <TextInput
                  style={styles.input}
                  value={gcashNumber}
                  onChangeText={setGcashNumber}
                  keyboardType="phone-pad"
                  placeholder="e.g. 09123456789"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                <Text style={styles.fieldLabel}>Payment QR Code Image</Text>
                <View style={styles.qrContainer}>
                  {qrImage ? (
                    <View style={styles.qrPreviewWrapper}>
                      <Image source={{ uri: qrImage }} style={styles.qrPreviewImg} />
                      <TouchableOpacity style={styles.changeQrBtn} onPress={pickQrCodePhoto} activeOpacity={0.8}>
                        <Feather name="refresh-cw" size={14} color="#FFF" />
                        <Text style={styles.changeQrText}>Change QR</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.uploadQrPlaceholder} onPress={pickQrCodePhoto} activeOpacity={0.8}>
                      <MaterialCommunityIcons name="qrcode-plus" size={32} color="#C2410C" />
                      <Text style={styles.uploadQrText}>Upload GCash / QR Code Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* SUBMIT BUTTON */}
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
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContainer: { paddingBottom: 40 },
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
    padding: 16, 
    backgroundColor: 'transparent',
    marginTop: -30,
  },
  
  /* CARD WRAPPER STYLING */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  cardSubText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 16,
  },

  inputGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1.5 },
  input: { 
    fontSize: 15, 
    color: '#1E293B', 
    fontWeight: '700', 
    paddingVertical: 10, 
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
    height: 90, 
    textAlignVertical: 'top', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 14, 
    paddingHorizontal: 14, 
    paddingTop: 12, 
    marginTop: 4, 
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    fontWeight: '700' 
  },
  
  landmarkCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  landmarkCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  batchBadgeText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '900',
  },
  landmarkCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
  },
  landmarkCardDetails: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    lineHeight: 16,
  },
  addLandmarkContainer: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addLandmarkBtn: {
    backgroundColor: '#C2410C',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLandmarkBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
  },

  qrContainer: {
    marginTop: 6,
    alignItems: 'center',
  },
  uploadQrPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadQrText: {
    marginTop: 8,
    color: '#C2410C',
    fontWeight: '800',
    fontSize: 13,
  },
  qrPreviewWrapper: {
    width: '100%',
    height: 180,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  qrPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  changeQrBtn: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  changeQrText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 6,
  },

  saveButton: { 
    backgroundColor: '#C2410C', 
    padding: 18, 
    borderRadius: 18, 
    alignItems: 'center', 
    marginTop: 8,
    shadowColor: '#C2410C',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
  },
  saveButtonText: { color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.8 },
  infoNote: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 16, fontStyle: 'italic', fontWeight: '700' }
});