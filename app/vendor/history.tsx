import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, StatusBar, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useVendor } from '../../context/VendorContext';
import { supabase } from '../../lib/supabaseClient';

export default function VendorOrderHistoryScreen() {
  const router = useRouter();
  const { vendorProfile } = useVendor();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!vendorProfile?.name) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('vendor_name', vendorProfile.name)
      .order('created_at', { ascending: false });
    if (!error) setOrders(data || []);
  }, [vendorProfile?.name]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase.channel(`vendor-history-${vendorProfile?.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, vendorProfile?.id]);

  const orderItems = selectedOrder?.items || selectedOrder?.order_details || [];
  const customerName = selectedOrder?.customer_name || selectedOrder?.customerName || 'Guest Customer';
  const shippingAddress = selectedOrder?.shippingAddress || selectedOrder?.address || 'Pickup arrangement will be shared with the customer.';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.whiteHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerLeftAction}>
          <Feather name="arrow-left" size={22} color="#4A342E" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>Vendor Order History</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {orders.length > 0 ? orders.map((order: any) => (
          <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => setSelectedOrder(order)} activeOpacity={0.85}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString()}</Text>
                <Text style={styles.customerName}>{order.customer_name || 'Guest Customer'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: order.status === 'Completed' ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={[styles.statusText, { color: order.status === 'Completed' ? '#2E7D32' : '#EF6C00' }]}>{order.status || 'Pending'}</Text>
              </View>
            </View>
            <Text style={styles.itemDetails}>{(order.items?.length || 0)} items • ₱{Number(order.total || 0).toFixed(2)}</Text>
            <Text style={styles.tapHint}>Tap to view receipt</Text>
          </TouchableOpacity>
        )) : (
          <View style={styles.emptyState}>
            <Feather name="clock" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No vendor history yet</Text>
            <Text style={styles.emptySubtitle}>Completed orders will appear here.</Text>
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={!!selectedOrder} animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
        <TouchableWithoutFeedback onPress={() => setSelectedOrder(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Order Receipt</Text>
                  <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                    <Feather name="x" size={20} color="#4A342E" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalOrderId}>Ref: {selectedOrder?.id}</Text>
                <Text style={styles.modalSectionLabel}>Customer</Text>
                <Text style={styles.modalDetailText}>{customerName}</Text>
                <Text style={styles.modalSubDetailText}>{shippingAddress}</Text>

                <Text style={styles.modalSectionLabel}>Items</Text>
                {orderItems.length > 0 ? orderItems.map((item: any, index: number) => (
                  <View key={`${item?.name || 'item'}-${index}`} style={styles.modalItemRow}>
                    <Text style={styles.modalItemText}>{Number(item?.qty || 1)}x {item?.name || 'Item'}</Text>
                    <Text style={styles.modalPriceText}>₱{(Number(item?.price || 0) * Number(item?.qty || 1)).toFixed(2)}</Text>
                  </View>
                )) : (
                  <Text style={styles.modalSubDetailText}>No item details were saved for this order.</Text>
                )}

                <View style={styles.modalTotalRow}>
                  <Text style={styles.modalTotalLabel}>Total</Text>
                  <Text style={styles.modalTotalAmount}>₱{Number(selectedOrder?.total || 0).toFixed(2)}</Text>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBFC' },
  whiteHeader: { height: 60, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1, borderColor: '#F0F0F0', marginTop: Platform.OS === 'android' ? 20 : 0 },
  headerTitleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitleText: { fontSize: 18, fontWeight: '800', color: '#4A342E' },
  headerLeftAction: { padding: 8 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  orderCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDate: { fontSize: 12, color: '#A8A8A8', fontWeight: '600' },
  customerName: { fontSize: 15, fontWeight: '800', color: '#4A342E', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800' },
  itemDetails: { fontSize: 13, color: '#777', marginTop: 8 },
  tapHint: { fontSize: 12, color: '#8B5CF6', marginTop: 8, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#4A342E', marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFF', borderRadius: 24, padding: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#4A342E' },
  modalOrderId: { fontSize: 12, color: '#8A8A8A', marginBottom: 12 },
  modalSectionLabel: { fontSize: 12, fontWeight: '800', color: '#7C3AED', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
  modalDetailText: { fontSize: 16, fontWeight: '700', color: '#4A342E' },
  modalSubDetailText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  modalItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalItemText: { fontSize: 14, color: '#374151', flex: 1, paddingRight: 10 },
  modalPriceText: { fontSize: 14, fontWeight: '700', color: '#4A342E' },
  modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  modalTotalLabel: { fontSize: 16, fontWeight: '800', color: '#374151' },
  modalTotalAmount: { fontSize: 16, fontWeight: '800', color: '#7C3AED' },
});
