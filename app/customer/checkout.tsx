import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, StatusBar, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabaseClient';

export default function Checkout() {
  const router = useRouter();
  const { cartItems, placeOrder } = useCart();

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [selectedPickup, setSelectedPickup] = useState('');

  useEffect(() => {
    const fetchSellerPickup = async () => {
      const vendorId = cartItems?.[0]?.vendorId || cartItems?.[0]?.vendor_id || null;
      if (!vendorId) return;
      try {
        const { data: merchant } = await supabase.from('merchants').select('pickup_landmark').eq('id', vendorId).maybeSingle();
        if (merchant) setSelectedPickup(merchant.pickup_landmark || '');
      } catch (e) {
        // ignore errors fetching merchant pickup
      }
    };

    fetchSellerPickup();
  }, [cartItems]);

  const vendorsInCart = Array.from(new Set((cartItems || []).map((item: any) => String(item.vendorName || 'Unknown'))));
  const subtotal = (cartItems || []).reduce((sum: number, item: any) => sum + (Number(item.price) * (item.qty || 1)), 0);
  const SERVICE_FEE_RATE = 0.05; // 5% service fee
  const serviceFee = Number((subtotal * SERVICE_FEE_RATE).toFixed(2));
  const total = Number((subtotal + serviceFee).toFixed(2));

  const handlePlaceOrder = async () => {
    if (!cartItems || cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty!');
      return;
    }

    try {
      const result = await placeOrder(selectedPickup, paymentMethod);
      if (result?.checkoutId) {
        if (result.success === false) {
          const errMsg = result.error?.message || String(result.error || 'Unknown');
          Alert.alert('Order Not Persisted', `Order created locally but failed to save to DB: ${errMsg}`);
        }
        router.replace({ pathname: '/customer/OrderSuccess', params: { checkoutId: result.checkoutId, paymentMethod } });
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

      {/* Styled Header matching HomeScreen Warm Gradient Theme */}
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
          <Text style={styles.sectionTitle}>Pick-up Point</Text>
          <View style={styles.dropdown}> 
            <Feather name="map-pin" size={18} color="#C2410C" />
            <Text style={styles.pickupText}>{selectedPickup || 'Seller did not set a pickup point'}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Payment Method</Text>
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
                <QRCode value="https://gcash.app/payment/toledo-fresh-hub" size={120} />
              </View>
              <Text style={styles.vendorName}>Vendor: Toledo Fresh Hub</Text>
              <Text style={styles.accountNumber}>0912 345 6789</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Review Items</Text>
          {vendorsInCart.map((vendorName, index) => (
            <View key={`vendor-${index}`} style={styles.vendorGroup}>
              <Text style={styles.vendorGroupTitle}>📦 From: {vendorName}</Text>
              {cartItems.filter((i: any) => i.vendorName === vendorName).map((item: any, i: number) => (
                <View key={i} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{item.qty}x {item.name}</Text>
                  <Text style={styles.summaryValue}>₱{(Number(item.price) * item.qty).toFixed(2)}</Text>
                </View>
              ))}
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
  headerTitle: { 
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

  scrollContent: { padding: 20, paddingBottom: Platform.OS === 'android' ? 220 : 260 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  
  dropdown: { 
    backgroundColor: '#F8FAFC', 
    padding: 16, 
    borderRadius: 18, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12 
  },
  pickupText: { color: '#1E293B', fontWeight: '600', fontSize: 14, flex: 1 },

  payOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 18, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  payOptionActive: { 
    borderColor: '#C2410C', 
    borderWidth: 2, 
    backgroundColor: '#FFF7ED' 
  },
  payText: { flex: 1, marginLeft: 15, fontWeight: '700', color: '#64748B', fontSize: 15 },
  payTextActive: { color: '#C2410C' },

  qrContainer: { 
    backgroundColor: '#FFFFFF', 
    padding: 20, 
    borderRadius: 24, 
    marginTop: 15, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  qrWhiteBox: { padding: 12, backgroundColor: '#FFFFFF', borderRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  qrText: { fontSize: 13, color: '#64748B', marginBottom: 15, textAlign: 'center', fontWeight: '600' },
  vendorName: { marginTop: 15, fontWeight: '700', color: '#1E293B' },
  accountNumber: { fontSize: 16, fontWeight: '900', color: '#C2410C', marginTop: 4 },

  summaryCard: { 
    backgroundColor: '#FFFFFF', 
    padding: 22, 
    borderRadius: 28, 
    elevation: 12,
    shadowColor: '#C2410C',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 18 },
  vendorGroup: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 },
  vendorGroupTitle: { fontWeight: '800', color: '#C2410C', fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  summaryValue: { fontWeight: '700', color: '#1E293B', fontSize: 14 },
  totalDivider: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14 },
  totalLabel: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  totalValue: { fontSize: 24, fontWeight: '900', color: '#C2410C' },

  footer: { 
    padding: 20, 
    paddingBottom: Platform.OS === 'android' ? 32 : 40, 
    backgroundColor: '#FFFFFF', 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  placeOrderBtn: { 
    paddingVertical: 16, 
    borderRadius: 18, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  placeOrderText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});