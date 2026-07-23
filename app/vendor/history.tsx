import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, StatusBar, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GradientHeader from '../_components/GradientHeader';
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
      <StatusBar barStyle="light-content" backgroundColor="#C2410C" />
      <GradientHeader
        colors={['#C2410C', '#9A3412', '#7C2D12']}
        titleContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.headerLeftAction} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color="#C2410C" />
          </TouchableOpacity>
        }
      >
        <Text style={styles.headerTitleText}>Vendor Order History</Text>
      </GradientHeader>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {orders.length > 0 ? orders.map((order: any) => {
          const isCompleted = order.status === 'Completed';
          return (
            <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => setSelectedOrder(order)} activeOpacity={0.85}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString()}</Text>
                  <Text style={styles.customerName}>{order.customer_name || 'Guest Customer'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isCompleted ? '#DCFCE7' : '#FFEDD5' }]}>
                  <Text style={[styles.statusText, { color: isCompleted ? '#15803D' : '#C2410C' }]}>{order.status || 'Pending'}</Text>
                </View>
              </View>
              <Text style={styles.itemDetails}>{(order.items?.length || 0)} items • ₱{Number(order.total || 0).toFixed(2)}</Text>
              <Text style={styles.tapHint}>Tap to view receipt</Text>
            </TouchableOpacity>
          );
        }) : (
          <View style={styles.emptyState}>
            <Feather name="clock" size={48} color="#94A3B8" />
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
                  <TouchableOpacity onPress={() => setSelectedOrder(null)} activeOpacity={0.8}>
                    <Feather name="x" size={20} color="#1E293B" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalOrderId}>Ref: {selectedOrder?.id}</Text>
                <Text style={styles.modalSectionLabel}>Customer</Text>
                <Text style={styles.modalDetailText}>{customerName}</Text>
                <Text style={styles.modalSubDetailText}>{shippingAddress}</Text>

                <Text style={styles.modalSectionLabel}>Items</Text>
                <ScrollView style={styles.modalItemsScroll} showsVerticalScrollIndicator={false}>
                  {orderItems.length > 0 ? orderItems.map((item: any, index: number) => (
                    <View key={`${item?.name || 'item'}-${index}`} style={styles.modalItemRow}>
                      <Text style={styles.modalItemText}>{Number(item?.qty || 1)}x {item?.name || 'Item'}</Text>
                      <Text style={styles.modalPriceText}>₱{(Number(item?.price || 0) * Number(item?.qty || 1)).toFixed(2)}</Text>
                    </View>
                  )) : (
                    <Text style={styles.modalSubDetailText}>No item details were saved for this order.</Text>
                  )}
                </ScrollView>

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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerTitleText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  headerLeftAction: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  orderCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { flex: 1, marginRight: 12 },
  orderDate: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  customerName: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginTop: 4, letterSpacing: -0.3 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '900' },
  itemDetails: { fontSize: 13, color: '#64748B', marginTop: 10, fontWeight: '700' },
  tapHint: { fontSize: 12, color: '#C2410C', marginTop: 8, fontWeight: '800' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 16, letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 6, textAlign: 'center', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFF', borderRadius: 28, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  modalOrderId: { fontSize: 11, color: '#94A3B8', marginBottom: 16, fontWeight: '700' },
  modalSectionLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1.5 },
  modalDetailText: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  modalSubDetailText: { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '700' },
  modalItemsScroll: { maxHeight: 180, marginVertical: 4 },
  modalItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' },
  modalItemText: { fontSize: 14, color: '#475569', flex: 1, paddingRight: 10, fontWeight: '700' },
  modalPriceText: { fontSize: 14, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'center' },
  modalTotalLabel: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  modalTotalAmount: { fontSize: 22, fontWeight: '900', color: '#C2410C', letterSpacing: -0.5 },
});