import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabaseClient';

export default function OrderSuccess() {
  const router = useRouter();
  const { checkoutId, paymentMethod: routePaymentMethod } = useLocalSearchParams(); 
  const [order, setOrder] = useState<any>(null);
  const [pickupName, setPickupName] = useState<string>('Loading...');
  const [pickupSlot, setPickupSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>(String(routePaymentMethod || 'COD'));
  const [loading, setLoading] = useState(true);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (routePaymentMethod) {
      setPaymentMethod(String(routePaymentMethod));
    }
  }, [routePaymentMethod]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!checkoutId) { setLoading(false); return; }
      
      const { data: orderData, error: fetchError } = await supabase.from('orders').select('*').eq('id', checkoutId).maybeSingle();

      if (orderData) {
        setOrder(orderData);
        // Extract slot if it exists in the order record (e.g. pickup_slot, slot, or time_slot)
        const slotValue = orderData.pickup_slot || orderData.slot || orderData.time_slot;
        if (slotValue) {
          setPickupSlot(String(slotValue));
        }
      } else {
        if (fetchError) console.warn('Order fetch error:', fetchError);
        const local = orders.find((o: any) => String(o.id) === String(checkoutId));
        if (local) {
          setOrder(local);
          const localSlot = local.pickup_slot || local.slot || local.time_slot;
          if (localSlot) setPickupSlot(String(localSlot));
        } else {
          setOrder({ id: checkoutId, total: 0, pickup_point_id: null, paymentMethod: paymentMethod });
        }
      }

      setLoading(false);
    };
    fetchOrder();
  }, [checkoutId, routePaymentMethod]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const { orders } = useCart();
  useEffect(() => {
    const derivePickup = async () => {
      if (!order) return setPickupName('No specific location');
      if (!order.pickup_point_id) return setPickupName('No specific location');

      try {
        const { data: pointData } = await supabase
          .from('pickup_points')
          .select('name')
          .eq('id', order.pickup_point_id)
          .maybeSingle();

        if (pointData && pointData.name) {
          setPickupName(pointData.name);
          return;
        }
      } catch (e) {
        // ignore
      }

      setPickupName(String(order.pickup_point_id));
    };
    derivePickup();
  }, [order, orders]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#C2410C" /></View>;

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
        <TouchableOpacity onPress={() => router.replace('/customer/home')} style={styles.headerLeftAction} activeOpacity={0.8}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Order Success</Text>
        <View style={styles.headerRightSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.confirmationHeader}>
          <View style={styles.iconContainer}>
            <Feather name="check" size={28} color="#C2410C" />
          </View>
          <Text style={styles.title}>Order Placed Successfully!</Text>
          <Text style={styles.subtitle}>Present the QR code below to the vendor at the pick-up point.</Text>
        </View>

        {order ? (
          <Animated.View style={[styles.orderCard, {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
          }]}> 
            <View style={styles.qrWrapper}>
              <QRCode 
                value={String(order.id)} 
                size={180} 
                color="#1E293B"
                backgroundColor="#FFF"
              />
            </View>
            <Text style={styles.refText}>REF: #{String(order.id).slice(-6).toUpperCase()}</Text>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Pick-up Point</Text>
                <Text style={styles.value}>{pickupName}</Text>
              </View>

              {pickupSlot && (
                <View style={[styles.infoRow, styles.slotRow]}>
                  <Text style={styles.subLabel}>• Pick-up Slot</Text>
                  <Text style={styles.subValue}>{pickupSlot}</Text>
                </View>
              )}

              {paymentMethod === 'GCash' && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Payment</Text>
                  <Text style={styles.value}>GCash / E-Wallet</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.label}>Total Amount</Text>
                <Text style={styles.value}>₱{Number(order.total || 0).toFixed(2)}</Text>
              </View>
            </View>

            {paymentMethod === 'GCash' && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeTitle}>Next Step</Text>
                <Text style={styles.noticeText}>Send your GCash payment screenshot to the vendor through the chat, then wait for acknowledgement before pickup.</Text>
              </View>
            )}

            {paymentMethod === 'GCash' && order?.vendor_id && (
              <TouchableOpacity activeOpacity={0.8} onPress={() => router.push({ pathname: '/customer/VendorDetails', params: { id: String(order.vendor_id) } })}>
                <LinearGradient
                  colors={['#C2410C', '#9A3412']}
                  style={styles.messageBtn}
                >
                  <View style={styles.messageBtnContent}>
                    <Feather name="message-circle" size={16} color="#FFF" />
                    <Text style={styles.messageBtnText}>Message Vendor</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
        ) : (
          <Text style={styles.emptyText}>Order details not found.</Text>
        )}

        <TouchableOpacity activeOpacity={0.8} onPress={() => router.replace('/customer/home')} style={styles.homeBtnWrapper}>
          <LinearGradient
            colors={['#C2410C', '#9A3412']}
            style={styles.homeBtn}
          >
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  
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
  headerTitleText: { 
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

  scrollContent: { padding: 20, alignItems: 'center', flexGrow: 1, paddingBottom: 40 },
  confirmationHeader: { alignItems: 'center', width: '100%', marginTop: 20, marginBottom: 24 },
  iconContainer: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#FFF7ED', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#1E293B', marginBottom: 8, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', maxWidth: 280, fontWeight: '600' },
  
  orderCard: { 
    width: '100%', 
    padding: 24, 
    borderRadius: 28, 
    backgroundColor: '#FFFFFF', 
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#C2410C',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  qrWrapper: { 
    padding: 16, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  refText: { fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 2, marginBottom: 20 },
  
  infoSection: { width: '100%', borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  slotRow: { marginTop: -4, marginBottom: 14, paddingLeft: 8 },
  label: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  subLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  subValue: { fontSize: 13, fontWeight: '700', color: '#C2410C' },
  
  noticeBox: { 
    width: '100%', 
    backgroundColor: '#FFF7ED', 
    borderRadius: 18, 
    padding: 16, 
    marginTop: 18, 
    borderWidth: 1, 
    borderColor: '#FFEDD5' 
  },
  noticeTitle: { fontSize: 15, fontWeight: '800', color: '#C2410C', marginBottom: 6 },
  noticeText: { fontSize: 13, color: '#9A3412', lineHeight: 20, fontWeight: '600' },
  
  messageBtn: { 
    marginTop: 18, 
    borderRadius: 18,
    width: '100%',
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  messageBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
    width: '100%',
  },
  messageBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  
  homeBtnWrapper: { width: '100%', marginTop: 24 },
  homeBtn: { 
    paddingVertical: 16, 
    borderRadius: 18, 
    alignItems: 'center',
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  homeBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  emptyText: { color: '#64748B', fontWeight: '700' }
});