import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import QRCode from 'react-native-qrcode-svg';
import { useCart } from '../../context/CartContext';
import { COLORS } from '../../styles/globalStyles';
import { Feather } from '@expo/vector-icons';

export default function OrderSuccess() {
  const { orders } = useCart();
  const router = useRouter();
  
  // ✅ 1. Get the specific checkoutId from the navigation params
  const { checkoutId } = useLocalSearchParams(); 

  // ✅ 2. Filter logic: Only show orders matching this specific checkout session
  const latestOrders = useMemo(() => {
    if (!checkoutId) return []; // Show nothing if no ID is passed
    return orders.filter(o => o.checkoutId === checkoutId);
  }, [orders, checkoutId]);

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
            Your order is ready. Show these QR codes to the vendors to claim your items.
          </Text>
        </View>

        {/* ✅ RENDERS ONLY THE NEW ORDERS */}
        {latestOrders.length > 0 ? (
          latestOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.vendorName}>{order.vendorName}</Text>
                  <Text style={styles.orderTime}>
                    {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.methodBadge}>
                  <Text style={styles.methodText}>{order.method?.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.qrSection}>
                <View style={styles.qrWrapper}>
                  <QRCode 
                    // This data is what the Vendor App will scan
                    value={JSON.stringify({ 
                      orderId: order.id, 
                      vendor: order.vendorName,
                      customer: order.customerName 
                    })} 
                    size={150} 
                    color={COLORS.secondary}
                    backgroundColor="white"
                  />
                </View>
                <Text style={styles.orderIdText}>REF: {order.id}</Text>
              </View>

              <View style={styles.dottedLine} />

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.label}>Items</Text>
                  <Text style={styles.itemSummary}>
                    {order.items?.length} {order.items?.length === 1 ? 'Item' : 'Items'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.label}>Total</Text>
                  <Text style={styles.totalValue}>₱{order.total?.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          /* Fallback UI if someone navigates here directly */
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