import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, StatusBar, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext';

export default function Checkout() {
  const router = useRouter();
  const { cartItems, placeOrder, userProfile, setUserProfile } = useCart(); 
  
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [deliveryMethod, setDeliveryMethod] = useState('Delivery'); 
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Group items by vendor for the visual summary
  const vendorsInCart = [...new Set((cartItems || []).map(item => item.vendorName))];

  const subtotal = (cartItems || []).reduce(
    (sum, item) => sum + (item.price * (item.qty || 1)), 0
  );
  
  const deliveryFee = (cartItems && cartItems.length > 0 && deliveryMethod === 'Delivery') ? 45 : 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    if (!cartItems || cartItems.length === 0) {
      Alert.alert("Empty Cart", "Your cart is empty!");
      return;
    }

    try {
      // ✅ SUCCESS: Pass the delivery method so CartContext knows to apply fees/status
      const result = placeOrder(deliveryMethod); 
      
      if (result && result.checkoutId) {
        router.replace({
          pathname: '/customer/OrderSuccess',
          params: { checkoutId: result.checkoutId } 
        });
      } else {
        Alert.alert("Error", "Could not process order. Please try again.");
      }
    } catch (error) {
      console.error("Order Error:", error);
      Alert.alert("Error", "Something went wrong during checkout.");
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
        
        {/* 1. RECEIVE METHOD TOGGLE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receive Method</Text>
          <View style={styles.methodContainer}>
            <TouchableOpacity 
              style={[styles.methodBtn, deliveryMethod === 'Delivery' && styles.methodBtnActive]}
              onPress={() => setDeliveryMethod('Delivery')}
            >
              <Feather name="truck" size={18} color={deliveryMethod === 'Delivery' ? '#FFF' : COLORS.secondary} />
              <Text style={[styles.methodBtnText, deliveryMethod === 'Delivery' && {color: '#FFF'}]}>Delivery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.methodBtn, deliveryMethod === 'Pick-up' && styles.methodBtnActive]}
              onPress={() => setDeliveryMethod('Pick-up')}
            >
              <Feather name="shopping-bag" size={18} color={deliveryMethod === 'Pick-up' ? '#FFF' : COLORS.secondary} />
              <Text style={[styles.methodBtnText, deliveryMethod === 'Pick-up' && {color: '#FFF'}]}>Pick-up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. DYNAMIC LOGISTICS SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name={deliveryMethod === 'Delivery' ? "map-pin" : "home"} size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, {marginLeft: 8, marginBottom: 0}]}>
              {deliveryMethod === 'Delivery' ? "Shipping Address" : "Pick-up Point"}
            </Text>
          </View>

          <View style={styles.addressCard}>
            {deliveryMethod === 'Delivery' ? (
              <>
                <View style={styles.addressHeader}>
                  <Text style={styles.addressName}>{userProfile.name} | {userProfile.phone}</Text>
                  <TouchableOpacity onPress={() => setIsEditingAddress(!isEditingAddress)}>
                    <Text style={styles.editLink}>{isEditingAddress ? "Save" : "Change"}</Text>
                  </TouchableOpacity>
                </View>

                {isEditingAddress ? (
                  <View style={styles.addressInputGroup}>
                    <TextInput 
                      style={styles.addressInput}
                      value={userProfile.address}
                      onChangeText={(text) => setUserProfile({...userProfile, address: text})}
                      placeholder="Street / Barangay"
                    />
                    <TextInput 
                      style={styles.addressInput}
                      value={userProfile.landmark}
                      onChangeText={(text) => setUserProfile({...userProfile, landmark: text})}
                      placeholder="Landmark (e.g. Near Gaisano)"
                    />
                  </View>
                ) : (
                  <>
                    <Text style={styles.addressText}>{userProfile.address}</Text>
                    <View style={styles.landmarkBadge}>
                      <Feather name="flag" size={10} color={COLORS.primary} />
                      <Text style={styles.landmarkText}>{userProfile.landmark}</Text>
                    </View>
                  </>
                )}
              </>
            ) : (
              <View style={styles.pickupInfo}>
                <Text style={styles.addressName}>Toledo Fresh Hub (Main)</Text>
                <Text style={styles.addressText}>S. Osmeña St, Poblacion, Toledo City</Text>
                <Text style={styles.pickupNote}>
                  <Feather name="info" size={12} /> Open: 8:00 AM - 6:00 PM
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 3. PAYMENT METHOD SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity 
            style={[styles.payOption, paymentMethod === 'COD' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Feather name="dollar-sign" size={20} color={paymentMethod === 'COD' ? COLORS.primary : '#AAA'} />
            <Text style={styles.payText}>{deliveryMethod === 'Pick-up' ? "Pay at Store" : "Cash on Delivery"}</Text>
            {paymentMethod === 'COD' && <Feather name="check-circle" size={18} color={COLORS.primary} />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.payOption, paymentMethod === 'GCash' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('GCash')}
          >
            <Feather name="credit-card" size={20} color={paymentMethod === 'GCash' ? COLORS.primary : '#AAA'} />
            <Text style={styles.payText}>GCash / E-Wallet</Text>
            {paymentMethod === 'GCash' && <Feather name="check-circle" size={18} color={COLORS.primary} />}
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

        {/* 4. MULTI-VENDOR ORDER SUMMARY */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Review Items</Text>
          {vendorsInCart.map(vendor => (
            <View key={vendor} style={{marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10}}>
              <Text style={{fontWeight: '800', color: COLORS.primary, fontSize: 13, marginBottom: 5}}>📦 From: {vendor}</Text>
              {cartItems.filter(i => i.vendorName === vendor).map(item => (
                <View key={item.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{item.qty}x {item.name}</Text>
                  <Text style={styles.summaryValue}>₱{(item.price * item.qty).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          ))}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, deliveryMethod === 'Pick-up' && {color: '#4CAF50'}]}>
              {deliveryMethod === 'Pick-up' ? 'FREE' : `₱${deliveryFee.toFixed(2)}`}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalDivider]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.placeOrderBtn, (!cartItems || cartItems.length === 0) && { opacity: 0.5 }]} 
          onPress={handlePlaceOrder}
          disabled={!cartItems || cartItems.length === 0}
        >
          <Text style={styles.placeOrderText}>
            {deliveryMethod === 'Pick-up' ? 'Confirm Pick-up Order' : 'Place Delivery Order'} • ₱{total.toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ... (Your original styles below)s

// ... styles remain the same

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, alignItems: 'center', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.secondary },
  scrollContent: { padding: 20, paddingBottom: 160 },
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.secondary },
  
  methodContainer: { flexDirection: 'row', backgroundColor: '#EEE', padding: 5, borderRadius: 15, marginTop: 10 },
  methodBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  methodBtnActive: { backgroundColor: COLORS.secondary },
  methodBtnText: { marginLeft: 8, fontWeight: '700', color: COLORS.secondary, fontSize: 14 },

  addressCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, elevation: 2 },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addressName: { fontWeight: '800', fontSize: 15, color: COLORS.secondary },
  addressText: { color: '#777', fontSize: 13, lineHeight: 18 },
  editLink: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  addressInputGroup: { marginTop: 10 },
  addressInput: { backgroundColor: '#F0F0F0', padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 13 },
  landmarkBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, marginTop: 8 },
  landmarkText: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginLeft: 5 },
  pickupInfo: { gap: 4 },
  pickupNote: { fontSize: 11, color: '#666', fontStyle: 'italic', marginTop: 5 },

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
  
  footer: { padding: 20, paddingBottom: 80, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, position: 'absolute', bottom: 0, left: 0, right: 0, elevation: 20 },
  placeOrderBtn: { backgroundColor: COLORS.secondary, padding: 20, borderRadius: 20, alignItems: 'center' },
  placeOrderText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});