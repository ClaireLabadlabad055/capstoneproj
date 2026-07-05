import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { COLORS } from '../../styles/globalStyles';

export default function OrderReceipt() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const { orders, updateOrderStatus } = useCart();

  // Find the specific order scanned
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text>Order not found!</Text>
        <TouchableOpacity onPress={() => router.back()}><Text>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const handleComplete = () => {
    updateOrderStatus(order.id, 'Completed');
    router.replace('/vendor/home'); // Go back to dashboard after finishing
  };

  return (
    <View style={styles.container}>
      <View style={styles.receiptCard}>
        <MaterialCommunityIcons name="check-circle" size={50} color="#4CAF50" style={{alignSelf: 'center'}} />
        <Text style={styles.title}>Order Verified</Text>
        <Text style={styles.orderId}>Ref: {order.id}</Text>
        
        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Customer Details</Text>
        <Text style={styles.detailText}>{order.customerName}</Text>
        <Text style={styles.subDetailText}>{order.shippingAddress}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Order Summary</Text>
        {order.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemText}>{item.qty}x {item.name}</Text>
            <Text style={styles.priceText}>₱{item.price * item.qty}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Paid</Text>
          <Text style={styles.totalAmount}>₱{order.total}</Text>
        </View>

        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Text style={styles.completeBtnText}>Confirm Pickup & Close</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', padding: 20 },
  receiptCard: { backgroundColor: '#FFF', borderRadius: 30, padding: 25, elevation: 5 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: COLORS.secondary, marginTop: 10 },
  orderId: { textAlign: 'center', color: '#888', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary, marginBottom: 5, textTransform: 'uppercase' },
  detailText: { fontSize: 16, fontWeight: '700', color: COLORS.secondary },
  subDetailText: { fontSize: 13, color: '#666' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemText: { fontSize: 15, color: '#444' },
  priceText: { fontSize: 15, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 2, borderTopColor: '#F0F0F0' },
  totalLabel: { fontSize: 18, fontWeight: '800' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  completeBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 15, marginTop: 25, alignItems: 'center' },
  completeBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  cancelBtn: { marginTop: 15, alignItems: 'center' },
  cancelText: { color: '#AAA', fontWeight: '600' }
});