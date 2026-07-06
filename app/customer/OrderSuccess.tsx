import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../../styles/globalStyles';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient'; // Ensure this path is correct

export default function OrderSuccess() {
  const router = useRouter();
  const { checkoutId } = useLocalSearchParams(); 
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!checkoutId) {
        setLoading(false);
        return;
      }

      // Fetch the specific order from the database
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', checkoutId) // Assuming checkoutId is the row ID
        .single();

      if (data) {
        setOrder(data);
      } else {
        console.error("Error fetching order:", error);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [checkoutId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Feather name="check" size={40} color="#FFF" />
          </View>
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>
            Your order is ready. Show this QR code to the vendor to claim your items.
          </Text>
        </View>

        {order ? (
          <View style={styles.orderCard}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.vendorName}>{order.vendor_name}</Text>
                <Text style={styles.orderTime}>
                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.methodBadge}>
                <Text style={styles.methodText}>PAID</Text>
              </View>
            </View>

            <View style={styles.qrSection}>
              <View style={styles.qrWrapper}>
                <QRCode 
                  value={JSON.stringify({ 
                    orderId: order.id, 
                    vendor: order.vendor_name 
                  })} 
                  size={150} 
                  color={COLORS.secondary}
                  backgroundColor="white"
                />
              </View>
              <Text style={styles.orderIdText}>REF: {order.id.slice(-8).toUpperCase()}</Text>
            </View>

            <View style={styles.dottedLine} />

            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.label}>Items</Text>
                <Text style={styles.itemSummary}>
                  {order.item_count || 0} Items
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.label}>Total</Text>
                <Text style={styles.totalValue}>₱{Number(order.total).toFixed(2)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Feather name="alert-circle" size={50} color="#CCC" />
            <Text style={styles.emptyText}>No active order session found.</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.homeBtn} 
          onPress={() => router.replace('/customer/home')}
        >
          <Text style={styles.homeBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FF' },
  scrollContent: { alignItems: 'center', padding: 25 },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.secondary },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  
  orderCard: { backgroundColor: '#FFF', width: '100%', borderRadius: 30, marginBottom: 20, elevation: 4, overflow: 'hidden' },
  cardTop: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' },
  vendorName: { fontWeight: '900', fontSize: 16, color: COLORS.secondary },
  orderTime: { fontSize: 11, color: '#AAA' },
  methodBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  methodText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  
  qrSection: { padding: 25, alignItems: 'center' },
  qrWrapper: { padding: 15, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0' },
  orderIdText: { marginTop: 15, fontWeight: '800', color: '#BBB', fontSize: 12, letterSpacing: 1 },
  
  dottedLine: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#EEE', marginHorizontal: 20 },
  
  cardBottom: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 10, color: '#AAA', fontWeight: '700', textTransform: 'uppercase' },
  itemSummary: { fontSize: 14, fontWeight: '700', color: '#444' },
  totalValue: { fontSize: 20, fontWeight: '900', color: COLORS.secondary },
  
  homeBtn: { backgroundColor: COLORS.secondary, padding: 20, borderRadius: 20, width: '100%', alignItems: 'center', marginTop: 10 },
  homeBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  emptyContainer: { marginVertical: 50, alignItems: 'center' },
  emptyText: { color: '#999', marginTop: 10, fontWeight: '600' }
});