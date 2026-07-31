import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, StatusBar, Platform, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useCart } from '../../context/CartContext';
import { useVendor } from '../../context/VendorContext';
import { supabase } from '../../lib/supabaseClient';

const PICKUP_BATCHES = [
  { id: '1', label: 'Batch 1', time: '10:00 AM – 11:00 AM', status: 'Available' },
  { id: '2', label: 'Batch 2', time: '1:00 PM – 2:00 PM', status: 'Available' },
  { id: '3', label: 'Batch 3', time: '3:00 PM – 4:00 PM', status: 'Almost Full' },
];

export default function Checkout() {
  const router = useRouter();
  const { cartItems, placeOrder } = useCart();
  const { vendorProfile } = useVendor() as any;

  const [paymentMethod, setPaymentMethod] = useState('COD');
  
  const [pickupLandmarks, setPickupLandmarks] = useState<{ landmark: string; details: string }[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<string>('');
  const [selectedPickupDetails, setSelectedPickupDetails] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [merchantName, setMerchantName] = useState('Toledo Fresh Hub');
  const [gcashName, setGcashName] = useState('');
  const [gcashNumber, setGcashNumber] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  const normalizePickupOptions = (merchant: any): { landmark: string; details: string }[] => {
    const candidates = [
      merchant?.pickup_landmarks,
      merchant?.pickupLandmarks,
      merchant?.pickup_points,
      merchant?.pickupPoints,
      merchant?.pickup_landmark,
      merchant?.pickup_point,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;

      if (Array.isArray(candidate)) {
        const normalized: { landmark: string; details: string }[] = [];

        candidate.forEach((item: any) => {
          if (typeof item === 'string') {
            const trimmed = item.trim();
            if (trimmed) normalized.push({ landmark: trimmed, details: '' });
            return;
          }

          if (item && typeof item === 'object') {
            const landmark = String(item?.landmark || item?.name || item?.place || item?.spot || '').trim();
            const details = String(item?.details || item?.description || item?.instructions || '').trim();
            if (landmark) normalized.push({ landmark, details });
          }
        });

        if (normalized.length > 0) return normalized;
        continue;
      }

      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return normalizePickupOptions({ pickup_landmarks: parsed });
          }
        } catch (e) {
          // fall through
        }

        return [{ landmark: trimmed, details: '' }];
      }
    }

    const singleLandmark = String(merchant?.pickup_landmark || merchant?.pickup_point || '').trim();
    const singleDetails = String(merchant?.landmark_details || merchant?.pickup_details || merchant?.pickup_instructions || '').trim();
    return singleLandmark && singleLandmark !== 'NULL' ? [{ landmark: singleLandmark, details: singleDetails === 'NULL' ? '' : singleDetails }] : [];
  };

  useEffect(() => {
    const fetchMerchantDetails = async () => {
      const firstItem = (cartItems && cartItems.length > 0) ? cartItems[0] as any : null;
      const vendorId = firstItem?.vendorId || firstItem?.vendor_id || null;
      
      if (firstItem?.vendorName && firstItem.vendorName !== 'Independent Vendor') {
        setMerchantName(String(firstItem.vendorName));
      }

      if (!vendorId) return;

      try {
        const { data: merchant, error } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', vendorId)
          .maybeSingle();

        if (error) {
          console.error('Supabase fetch error:', error);
          return;
        }

        if (merchant) {
          const resolvedName = String(
            merchant.business_name ||
            merchant.name || 
            merchant.store_name ||
            vendorProfile?.business_name ||
            vendorProfile?.name ||
            firstItem?.vendorName || 
            'Toledo Fresh Hub'
          );
          setMerchantName(resolvedName);

          const resolvedGcashName = String(
            merchant.gcashName ||
            merchant.gcash_name ||
            merchant.gcash_account_name ||
            vendorProfile?.gcashName ||
            vendorProfile?.gcash_name ||
            ''
          );
          setGcashName(resolvedGcashName);

          const resolvedPhone = String(
            merchant.gcashNumber || 
            merchant.gcash_number || 
            merchant.gcash_phone || 
            merchant.phone || 
            merchant.phone_number || 
            merchant.contact_number ||
            vendorProfile?.gcashNumber ||
            vendorProfile?.gcash_number ||
            ''
          );
          setGcashNumber(resolvedPhone);

          const resolvedQrUrl = String(
            merchant.qrImage ||
            merchant.qr_code_url ||
            merchant.qr_image_url ||
            merchant.gcash_qr ||
            vendorProfile?.qrImage ||
            vendorProfile?.qr_code_url ||
            ''
          );
          setQrImageUrl(resolvedQrUrl || null);

          const options = normalizePickupOptions(merchant);
          const fallbackOptions = vendorProfile?.pickupLandmarks?.length
            ? vendorProfile.pickupLandmarks
            : (vendorProfile?.pickup_landmarks?.length ? vendorProfile.pickup_landmarks : []);
          const resolvedOptions = options.length > 0 ? options : normalizePickupOptions({ pickup_landmarks: fallbackOptions });

          setPickupLandmarks(resolvedOptions);

          if (resolvedOptions.length > 0) {
            setSelectedPickup(resolvedOptions[0].landmark);
            setSelectedPickupDetails(resolvedOptions[0].details);
          } else if (vendorProfile?.meetupPoint) {
            setSelectedPickup(String(vendorProfile.meetupPoint));
            setSelectedPickupDetails(String(vendorProfile.meetupDetails || ''));
          }
        }
      } catch (e) {
        console.error('Error fetching merchant details', e);
      }
    };

    fetchMerchantDetails();
  }, [cartItems, vendorProfile]);

  const safeCartItems: any[] = Array.isArray(cartItems) ? cartItems : [];
  const vendorsInCart = Array.from(new Set(safeCartItems.map((item: any) => String(item?.vendorName || 'Unknown'))));
  const subtotal = safeCartItems.reduce((sum: number, item: any) => sum + (Number(item?.price || 0) * (Number(item?.qty || 1))), 0);
  const SERVICE_FEE_RATE = 0.05; 
  const serviceFee = Number((subtotal * SERVICE_FEE_RATE).toFixed(2));
  const total = Number((subtotal + serviceFee).toFixed(2));

  const handlePlaceOrder = async () => {
    if (!safeCartItems || safeCartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty!');
      return;
    }

    if (!selectedPickup) {
      Alert.alert('Pickup Point Required', 'Please select a preferred pickup location for your order.');
      return;
    }

    if (!selectedBatch) {
      Alert.alert('Selection Required', 'Please select a pick-up batch or schedule before proceeding.');
      return;
    }

    try {
      const fullPickupString = `${selectedPickup}${selectedPickupDetails ? ` (${selectedPickupDetails})` : ''} [Slot: ${selectedBatch}]`;

      // Pass status: 'Pending' or ensure your CartContext automatically inserts it
      const result = await placeOrder(fullPickupString, paymentMethod, { status: 'Pending' });
      
      if (result?.checkoutId) {
        if (result.success === false) {
          const errMsg = result.error?.message || String(result.error || 'Unknown');
          Alert.alert('Order Not Persisted', `Order created locally but failed to save to DB: ${errMsg}`);
        }
        router.replace({ pathname: '/customer/OrderSuccess', params: { checkoutId: String(result.checkoutId), paymentMethod } });
      } else {
        Alert.alert('Order Error', 'Could not complete checkout.');
      }
    } catch (err) {
      console.error('Place order failed', err);
      Alert.alert('Order Error', 'Something went wrong during checkout.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#451A03" />

      <LinearGradient
        colors={['#451A03', '#7C2D12', '#C2410C']}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerLeftAction} activeOpacity={0.8}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerRightSpacer} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick-up Point Option</Text>
          <Text style={styles.sectionSubTitle}>Select your preferred pickup location set by the merchant.</Text>
          
          <TouchableOpacity 
            style={styles.dropdownSelector} 
            activeOpacity={0.8}
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Feather name="map-pin" size={18} color="#C2410C" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.dropdownSelectedText} numberOfLines={1}>
                {selectedPickup || 'Select pickup location'}
              </Text>
              {selectedPickupDetails ? (
                <Text style={styles.dropdownSelectedSubText} numberOfLines={1}>
                  {selectedPickupDetails}
                </Text>
              ) : null}
            </View>
            <Feather name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownListContainer}>
              {pickupLandmarks.length > 0 ? (
                pickupLandmarks.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dropdownItem,
                      selectedPickup === item.landmark && styles.dropdownItemActive
                    ]}
                    onPress={() => {
                      setSelectedPickup(item.landmark);
                      setSelectedPickupDetails(item.details);
                      setIsDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather 
                      name={selectedPickup === item.landmark ? "check-circle" : "circle"} 
                      size={16} 
                      color={selectedPickup === item.landmark ? "#C2410C" : "#94A3B8"} 
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.dropdownItemText, selectedPickup === item.landmark && styles.dropdownItemTextActive]}>
                        {item.landmark}
                      </Text>
                      {item.details ? (
                        <Text style={styles.dropdownItemSubText} numberOfLines={2}>
                          {item.details}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyLandmarksBox}>
                  <Text style={styles.emptyLandmarksText}>No pickup location specified by the merchant yet.</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Pick-up Batch / Schedule</Text>
          <Text style={styles.sectionSubTitle}>Choose a designated time window for your order hand-off.</Text>

          {PICKUP_BATCHES.map((batch) => {
            const batchDisplayString = `${batch.label}: ${batch.time}`;
            const isSelected = selectedBatch === batchDisplayString;
            return (
              <TouchableOpacity
                key={batch.id}
                style={[styles.batchCard, isSelected && styles.batchCardSelected]}
                onPress={() => setSelectedBatch(batchDisplayString)}
                activeOpacity={0.8}
              >
                <View style={styles.batchInfo}>
                  <View style={styles.batchRowTop}>
                    <Text style={[styles.batchLabel, isSelected && styles.batchLabelSelected]}>
                      {batch.label}
                    </Text>
                    <Text style={styles.batchStatus}>{batch.status}</Text>
                  </View>
                  <Text style={[styles.batchTime, isSelected && styles.batchTimeSelected]}>
                    {batch.time}
                  </Text>
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.payOption, paymentMethod === 'COD' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Feather name="dollar-sign" size={20} color={paymentMethod === 'COD' ? '#C2410C' : '#64748B'} />
            <Text style={[styles.payText, paymentMethod === 'COD' && styles.payTextActive]}>Cash on Delivery</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.payOption, paymentMethod === 'GCash' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('GCash')}
          >
            <Feather name="credit-card" size={20} color={paymentMethod === 'GCash' ? '#C2410C' : '#64748B'} />
            <Text style={[styles.payText, paymentMethod === 'GCash' && styles.payTextActive]}>GCash / E-Wallet</Text>
          </TouchableOpacity>

          {paymentMethod === 'GCash' && (
            <View style={styles.qrContainer}>
              <Text style={styles.qrText}>Scan to Pay via GCash</Text>
              <View style={styles.qrWhiteBox}>
                {qrImageUrl ? (
                  <Image source={{ uri: qrImageUrl }} style={styles.customQrImage} />
                ) : (
                  <QRCode value={gcashNumber ? `tel:${gcashNumber}` : "https://gcash.com"} size={120} />
                )}
              </View>
              <Text style={styles.vendorName}>Vendor: {merchantName}</Text>
              <Text style={styles.accountName}>{gcashName || 'Merchant Account'}</Text>
              <Text style={styles.accountNumber}>{gcashNumber || 'No number provided'}</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Review Items</Text>
          {vendorsInCart.map((vendorName, index) => (
            <View key={`vendor-${index}`} style={styles.vendorGroup}>
              <Text style={styles.vendorGroupTitle}>📦 From: {vendorName}</Text>
              {safeCartItems
                .filter((i: any) => String(i?.vendorName || 'Unknown') === vendorName)
                .map((item: any, i: number) => {
                  const qty = Number(item?.qty || 1);
                  const name = String(item?.name || item?.title || 'Item');
                  const price = Number(item?.price || 0);
                  return (
                    <View key={i} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{qty}x {name}</Text>
                      <Text style={styles.summaryValue}>₱{(price * qty).toFixed(2)}</Text>
                    </View>
                  );
                })}
            </View>
          ))}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee</Text>
            <Text style={styles.summaryValue}>₱{serviceFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalDivider]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.8} onPress={handlePlaceOrder}>
          <LinearGradient
            colors={['#C2410C', '#9A3412']}
            style={styles.placeOrderBtn}
          >
            <Text style={styles.placeOrderText}>Confirm Order • ₱{total.toFixed(2)}</Text>
            <Feather name="arrow-right" size={18} color="#FFF" style={{ marginLeft: 10 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  headerLeftAction: { padding: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerRightSpacer: { width: 36 },
  scrollContent: { padding: 20, paddingBottom: Platform.OS === 'android' ? 220 : 260 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  sectionSubTitle: { fontSize: 12, color: '#64748B', marginBottom: 12, fontWeight: '600', lineHeight: 16 },
  dropdownSelector: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
  dropdownSelectedText: { color: '#1E293B', fontWeight: '800', fontSize: 14 },
  dropdownSelectedSubText: { color: '#64748B', fontWeight: '600', fontSize: 11, marginTop: 2 },
  dropdownListContainer: { marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemActive: { backgroundColor: '#FFF7ED' },
  dropdownItemText: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  dropdownItemTextActive: { color: '#C2410C' },
  dropdownItemSubText: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  emptyLandmarksBox: { padding: 16, alignItems: 'center' },
  emptyLandmarksText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', fontWeight: '600' },
  batchCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', marginBottom: 10 },
  batchCardSelected: { borderColor: '#C2410C', backgroundColor: '#FFF7ED', borderWidth: 2 },
  batchInfo: { flex: 1, marginRight: 12 },
  batchRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  batchLabel: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  batchLabelSelected: { color: '#C2410C' },
  batchStatus: { fontSize: 11, color: '#059669', fontWeight: '700', backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  batchTime: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  batchTimeSelected: { color: '#9A3412', fontWeight: '700' },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  radioCircleSelected: { borderColor: '#C2410C' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C2410C' },
  payOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
  payOptionActive: { borderColor: '#C2410C', borderWidth: 2, backgroundColor: '#FFF7ED' },
  payText: { flex: 1, marginLeft: 15, fontWeight: '700', color: '#64748B', fontSize: 15 },
  payTextActive: { color: '#C2410C' },
  qrContainer: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, marginTop: 15, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  qrWhiteBox: { padding: 12, backgroundColor: '#FFFFFF', borderRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9', width: 150, height: 150, justifyContent: 'center', alignItems: 'center' },
  customQrImage: { width: 130, height: 130, resizeMode: 'contain' },
  qrText: { fontSize: 13, color: '#64748B', marginBottom: 15, textAlign: 'center', fontWeight: '600' },
  vendorName: { marginTop: 15, fontWeight: '700', color: '#1E293B', fontSize: 14 },
  accountName: { fontSize: 13, fontWeight: '700', color: '#64748B', marginTop: 2 },
  accountNumber: { fontSize: 16, fontWeight: '900', color: '#C2410C', marginTop: 4 },
  summaryCard: { backgroundColor: '#FFFFFF', padding: 22, borderRadius: 28, elevation: 12, shadowColor: '#C2410C', shadowOpacity: 0.12, shadowRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  summaryTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 18 },
  vendorGroup: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 },
  vendorGroupTitle: { fontWeight: '800', color: '#C2410C', fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  summaryValue: { fontWeight: '700', color: '#1E293B', fontSize: 14 },
  totalDivider: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14 },
  totalLabel: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  totalValue: { fontSize: 24, fontWeight: '900', color: '#C2410C' },
  footer: { padding: 20, paddingBottom: Platform.OS === 'android' ? 32 : 40, backgroundColor: '#FFFFFF', position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderColor: '#F1F5F9', elevation: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  placeOrderBtn: { paddingVertical: 16, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: '#C2410C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  placeOrderText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});