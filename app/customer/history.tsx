import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, StatusBar, Platform, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { orders: contextOrders } = useCart();
  const { user, userData } = useAuth();
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = useCallback(async () => {
    const userId = user?.id || userData?.id;
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching history:', error);
      return;
    }
    setDbOrders((data || []).map((o: any) => ({
      id: o.id,
      date: new Date(o.created_at).toLocaleDateString(),
      vendorName: o.vendor_name || o.vendorName || 'Toledo Vendor',
      total: o.total,
      status: o.status || 'Pending',
      items: o.order_details || o.items || [],
      created_at: o.created_at,
    })));
  }, [user?.id, userData?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  useEffect(() => {
    const channel = supabase.channel(`customer-history-${user?.id || userData?.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, user?.id, userData?.id]);

  const historyOrders = useMemo(() => {
    const merged = [...dbOrders, ...(contextOrders || [])];
    const seen = new Set<string>();
    return merged.filter((order: any) => {
      const key = String(order.id || `${order.date || ''}-${order.vendorName || ''}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => {
      const aTime = new Date(a.created_at || a.date || 0).getTime();
      const bTime = new Date(b.created_at || b.date || 0).getTime();
      return bTime - aTime;
    });
  }, [dbOrders, contextOrders]);

  const openQr = (order: any) => {
    setSelectedOrder(order);
    setQrModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.whiteHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerLeftAction}>
          <Feather name="arrow-left" size={22} color="#4A342E" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>Order History</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {historyOrders.length > 0 ? historyOrders.map((order: any) => (
          <TouchableOpacity key={order.id || `${order.date}-${order.vendorName}` } style={styles.orderCard} activeOpacity={0.85} onPress={() => openQr(order)}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.orderDate}>{order.date || 'Today'}</Text>
                <Text style={styles.vendorName}>{order.vendorName || 'Toledo Vendor'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: order.status === 'Completed' ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={[styles.statusText, { color: order.status === 'Completed' ? '#2E7D32' : '#EF6C00' }]}>{order.status || 'Pending'}</Text>
              </View>
            </View>
            <Text style={styles.itemDetails}>{(order.items?.length || 0)} items • ₱{Number(order.total || 0).toFixed(2)}</Text>
            <View style={styles.actionHint}>
              <Text style={styles.actionHintText}>Tap to view QR & reference</Text>
            </View>
          </TouchableOpacity>
        )) : (
          <View style={styles.emptyState}>
            <Feather name="clock" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptySubtitle}>Completed and past orders will appear here.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setQrModalVisible(false)}>
              <Feather name="x" size={22} color="#4A342E" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Order QR</Text>
            <Text style={styles.modalSubtitle}>Show this to the merchant when you pick up your order.</Text>
            <View style={styles.qrHolder}>
              {selectedOrder ? (
                <QRCode value={String(selectedOrder.id)} size={180} />
              ) : null}
            </View>
            <Text style={styles.modalVendor}>{selectedOrder?.vendorName || 'Toledo Vendor'}</Text>
            <Text style={styles.modalReference}>REF: #{String(selectedOrder?.id || '').slice(-8).toUpperCase()}</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setQrModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBFC' },
  whiteHeader: {
    height: 60,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginTop: Platform.OS === 'android' ? 20 : 0,
  },
  headerTitleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitleText: { fontSize: 18, fontWeight: '800', color: '#4A342E' },
  headerLeftAction: { padding: 8 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  orderCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDate: { fontSize: 12, color: '#A8A8A8', fontWeight: '600' },
  vendorName: { fontSize: 15, fontWeight: '800', color: '#4A342E', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800' },
  itemDetails: { fontSize: 13, color: '#777', marginTop: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#4A342E', marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  actionHint: { marginTop: 12, alignItems: 'flex-start' },
  actionHintText: { fontSize: 12, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 22, padding: 22, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, elevation: 12 },
  closeModalBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#4A342E', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 18 },
  qrHolder: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, marginBottom: 18 },
  modalVendor: { fontSize: 16, fontWeight: '700', color: '#4A342E', marginBottom: 6 },
  modalReference: { fontSize: 14, color: '#6B7280', marginBottom: 18 },
  modalCloseBtn: { width: '100%', paddingVertical: 14, backgroundColor: COLORS.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
