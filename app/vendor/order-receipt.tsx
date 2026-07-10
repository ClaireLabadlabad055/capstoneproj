import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../styles/globalStyles';
import { supabase } from '../../lib/supabaseClient';

type OrderRecord = {
  id: string;
  customer_name?: string;
  customerName?: string;
  shippingAddress?: string;
  address?: string;
  status?: string;
  total?: number | string;
  items?: any[];
  vendorName?: string;
  vendor_name?: string;
  created_at?: string;
};

export default function OrderReceipt() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      const id = Array.isArray(orderId) ? orderId[0] : orderId;
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch receipt order:', error);
        setOrder(null);
      } else {
        setOrder(data as OrderRecord | null);
      }

      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  const customerName = order?.customer_name || order?.customerName || 'Guest Customer';
  const shippingAddress = order?.shippingAddress || order?.address || 'Pickup arrangement will be shared with the customer.';
  const orderItems = useMemo(() => Array.isArray(order?.items) ? order.items : [], [order?.items]);
  const total = useMemo(() => {
    if (typeof order?.total === 'number') return order.total;
    const parsed = Number(order?.total || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [order?.total]);

  const handleComplete = async () => {
    if (!order?.id) return;

    setCompleting(true);
    const { error } = await supabase.from('orders').update({ status: 'Completed' }).eq('id', order.id);

    if (error) {
      Alert.alert('Update failed', error.message);
      setCompleting(false);
      return;
    }

    setOrder((prev) => prev ? { ...prev, status: 'Completed' } : prev);
    router.replace('/vendor/home');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#F59E0B" />
        <Text style={styles.errorTitle}>Order not found</Text>
        <Text style={styles.errorSubtitle}>This order could not be loaded from the database.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.receiptCard}>
        <MaterialCommunityIcons name="check-circle" size={50} color="#4CAF50" style={{ alignSelf: 'center' }} />
        <Text style={styles.title}>Order Verified</Text>
        <Text style={styles.orderId}>Ref: {order.id}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Customer Details</Text>
        <Text style={styles.detailText}>{customerName}</Text>
        <Text style={styles.subDetailText}>{shippingAddress}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Order Summary</Text>
        {orderItems.length > 0 ? orderItems.map((item, index) => (
          <View key={`${item?.name || 'item'}-${index}`} style={styles.itemRow}>
            <Text style={styles.itemText}>{Number(item?.qty || 1)}x {item?.name || 'Item'}</Text>
            <Text style={styles.priceText}>₱{(Number(item?.price || 0) * Number(item?.qty || 1)).toFixed(2)}</Text>
          </View>
        )) : (
          <Text style={styles.subDetailText}>No item details were saved for this order.</Text>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Paid</Text>
          <Text style={styles.totalAmount}>₱{Number(total).toFixed(2)}</Text>
        </View>

        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} disabled={completing}>
          {completing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.completeBtnText}>Confirm Pickup & Close</Text>}
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
  loadingContainer: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  errorContainer: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorTitle: { marginTop: 12, fontSize: 20, fontWeight: '800', color: COLORS.secondary },
  errorSubtitle: { marginTop: 6, color: '#666', textAlign: 'center' },
  backBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#FFF', fontWeight: '700' },
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