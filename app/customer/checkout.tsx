import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../../styles/globalStyles';
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

  const handlePlaceOrder = async () => {
    if (!cartItems || cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty!');
      return;
    }

    try {
      const result = await placeOrder();
      if (result?.checkoutId) {
        if (result.success === false) {
          const errMsg = result.error?.message || String(result.error || 'Unknown');
          Alert.alert('Order Not Persisted', `Order created locally but failed to save to DB: ${errMsg}`);
        }
        router.replace({ pathname: '/customer/OrderSuccess', params: { checkoutId: result.checkoutId } });
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
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick-up Point</Text>
          <View style={[styles.dropdown, { justifyContent: 'flex-start', gap: 10 }]}> 
            <Feather name="map-pin" size={18} color="#777" />
            <Text>{selectedPickup || 'Seller did not set a pickup point'}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Payment Method</Text>
          <TouchableOpacity 
            style={[styles.payOption, paymentMethod === 'COD' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Feather name="dollar-sign" size={20} color={paymentMethod === 'COD' ? COLORS.primary : '#AAA'} />
            <Text style={styles.payText}>Cash on Delivery</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.payOption, paymentMethod === 'GCash' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('GCash')}
          >
            <Feather name="credit-card" size={20} color={paymentMethod === 'GCash' ? COLORS.primary : '#AAA'} />
            <Text style={styles.payText}>GCash / E-Wallet</Text>
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
            <View key={`vendor-${index}`} style={{marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10}}>
              <Text style={{fontWeight: '800', color: COLORS.primary, fontSize: 13, marginBottom: 5}}>📦 From: {vendorName}</Text>
              {cartItems.filter((i: any) => i.vendorName === vendorName).map((item: any, i: number) => (
                <View key={i} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{item.qty}x {item.name}</Text>
                  <Text style={styles.summaryValue}>₱{(Number(item.price) * item.qty).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          ))}
          <View style={[styles.summaryRow, styles.totalDivider]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.placeOrderBtn} onPress={handlePlaceOrder}>
          <Text style={styles.placeOrderText}>Confirm Order • ₱{subtotal.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, alignItems: 'center', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.secondary },
  scrollContent: { padding: 20, paddingBottom: 160 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.secondary, marginBottom: 10 },
  dropdown: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#DDD', flexDirection: 'row', justifyContent: 'space-between' },
  dropdownMenu: { backgroundColor: '#FFF', marginTop: 5, borderRadius: 12, borderWidth: 1, borderColor: '#DDD' },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  payOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10 },
  payOptionActive: { borderColor: COLORS.primary, borderWidth: 1, backgroundColor: '#FFF9F9' },
  payText: { flex: 1, marginLeft: 15, fontWeight: '600', color: COLORS.secondary },
  qrContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginTop: 15, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed' },
  qrWhiteBox: { padding: 10, backgroundColor: 'white', borderRadius: 10, elevation: 3 },
  qrText: { fontSize: 13, color: '#666', marginBottom: 15, textAlign: 'center' },
  vendorName: { marginTop: 15, fontWeight: '700', color: COLORS.secondary },
  accountNumber: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginTop: 5 },
  summaryCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, elevation: 2 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: COLORS.secondary, marginBottom: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#777' },
  summaryValue: { fontWeight: '600', color: COLORS.secondary },
  totalDivider: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  totalLabel: { fontSize: 18, fontWeight: '800', color: COLORS.secondary },
  totalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  footer: { padding: 20, paddingBottom: 80, backgroundColor: '#FFF', position: 'absolute', bottom: 0, left: 0, right: 0 },
  placeOrderBtn: { backgroundColor: COLORS.secondary, padding: 20, borderRadius: 20, alignItems: 'center' },
  placeOrderText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});