import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../../styles/globalStyles';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { useCart } from '../../context/CartContext';

export default function OrderSuccess() {
  const router = useRouter();
  const { checkoutId } = useLocalSearchParams(); 
  const [order, setOrder] = useState<any>(null);
  const [pickupName, setPickupName] = useState<string>('Loading...');
  const [loading, setLoading] = useState(true);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchOrder = async () => {
      if (!checkoutId) { setLoading(false); return; }
      
      // 1. Fetch Order
      const { data: orderData, error: fetchError } = await supabase.from('orders').select('*').eq('id', checkoutId).single();

      if (orderData) {
        setOrder(orderData);
      } else {
        // If DB fetch failed or returns nothing, try local orders from context (fallback)
        if (fetchError) console.warn('Order fetch error:', fetchError);
        const local = orders.find((o: any) => String(o.id) === String(checkoutId));
        if (local) {
          setOrder(local);
        } else {
          // As a last resort, show a minimal order placeholder so QR still appears
          setOrder({ id: checkoutId, total: 0, pickup_point_id: null });
        }
      }

      // 2. Fetch Pickup Point Name if ID exists (use order state after it is set)
      // We will derive pickupName below after order is set
      setLoading(false);
    };
    fetchOrder();
  }, [checkoutId]);

  useEffect(() => {
    // run entrance animation when order is available
    if (!loading) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  // Derive pickup name whenever order or orders list changes
  const { orders } = useCart();
  useEffect(() => {
    const derivePickup = async () => {
      if (!order) return setPickupName('No specific location');
      if (order.pickup_point_id) {
        try {
          const { data: pointData } = await supabase
            .from('pickup_points')
            .select('name')
            .eq('id', order.pickup_point_id)
            .single();
          setPickupName(pointData?.name || 'Standard Location');
        } catch (e) {
          setPickupName('Standard Location');
        }
      } else {
        setPickupName('No specific location');
      }
    };
    derivePickup();
  }, [order, orders]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="check" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Order Confirmed</Text>
          <Text style={styles.subtitle}>Present the QR code below to the vendor at the pick-up point.</Text>
        </View>

        {order ? (
          <Animated.View style={[styles.orderCard, {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
          }]}> 
            {/* WRAPPED QR FOR VISIBILITY */}
            <View style={styles.qrWrapper}>
              <QRCode 
                value={String(order.id)} 
                size={180} 
                color="#000"
                backgroundColor="#FFF"
              />
            </View>
            <Text style={styles.refText}>REF: #{String(order.id).slice(-6).toUpperCase()}</Text>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Pick-up Point</Text>
                <Text style={styles.value}>{pickupName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Total Amount</Text>
                <Text style={styles.value}>₱{Number(order.total || 0).toFixed(2)}</Text>
              </View>
            </View>
          </Animated.View>
        ) : (
          <Text style={styles.emptyText}>Order details not found.</Text>
        )}

        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/customer/home')}>
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 30, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 30 },
  iconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F0F9F0', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.secondary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#999', textAlign: 'center', maxWidth: 250 },
  
  orderCard: { width: '100%', padding: 25, borderRadius: 25, backgroundColor: '#F8F9FA', alignItems: 'center' },
  qrWrapper: { padding: 15, backgroundColor: '#FFF', borderRadius: 20, marginBottom: 10 },
  refText: { fontSize: 12, fontWeight: '700', color: '#AAA', letterSpacing: 2, marginBottom: 20 },
  
  infoSection: { width: '100%', borderTopWidth: 1, borderColor: '#EEE', paddingTop: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 14, color: '#999' },
  value: { fontSize: 14, fontWeight: '700', color: COLORS.secondary },
  
  homeBtn: { marginTop: 30, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 50, backgroundColor: COLORS.secondary },
  homeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  emptyText: { color: '#999' }
});