import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, StatusBar, Platform, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
      <StatusBar barStyle="light-content" backgroundColor="#451A03" />

      {/* Styled Header matching Warm Gradient Theme */}
      <LinearGradient
        colors={['#451A03', '#7C2D12', '#C2410C']}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => router.push('/customer/profile')} style={styles.headerLeftAction} activeOpacity={0.8}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Order History</Text>
        <View style={styles.headerRightSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {historyOrders.length > 0 ? historyOrders.map((order: any) => (
          <TouchableOpacity key={order.id || `${order.date}-${order.vendorName}` } style={styles.orderCard} activeOpacity={0.85} onPress={() => openQr(order)}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.orderDate}>{order.date || 'Today'}</Text>
                <Text style={styles.vendorName}>{order.vendorName || 'Toledo Vendor'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: order.status === 'Completed' ? '#DCFCE7' : '#FFEDD5' }]}>
                <Text style={[styles.statusText, { color: order.status === 'Completed' ? '#166534' : '#C2410C' }]}>{order.status || 'Pending'}</Text>
              </View>
            </View>
            <Text style={styles.itemDetails}>{(order.items?.length || 0)} items • ₱{Number(order.total || 0).toFixed(2)}</Text>
            <View style={styles.actionHint}>
              <Text style={styles.actionHintText}>Tap to view QR & reference</Text>
            </View>
          </TouchableOpacity>
        )) : (
          <View style={styles.emptyState}>
            <Feather name="clock" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptySubtitle}>Completed and past orders will appear here.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setQrModalVisible(false)} activeOpacity={0.8}>
              <Feather name="x" size={22} color="#1E293B" />
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
            
            <TouchableOpacity activeOpacity={0.8} style={{ width: '100%' }} onPress={() => setQrModalVisible(false)}>
              <LinearGradient
                colors={['#C2410C', '#9A3412']}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
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

  scrollContent: { padding: 20, paddingBottom: 100 },
  
  orderCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 18, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    shadowColor: '#C2410C', 
    shadowOpacity: 0.08, 
    shadowOffset: { width: 0, height: 6 }, 
    shadowRadius: 12, 
    elevation: 3 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDate: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  vendorName: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginTop: 4, letterSpacing: -0.3 },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '800' },
  
  itemDetails: { fontSize: 14, color: '#64748B', marginTop: 12, fontWeight: '600' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 16, letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: '#64748B', marginTop: 6, textAlign: 'center', fontWeight: '600' },
  
  actionHint: { marginTop: 12, alignItems: 'flex-start' },
  actionHintText: { fontSize: 12, color: '#C2410C', fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { 
    width: '100%', 
    maxWidth: 360, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 28, 
    padding: 24, 
    alignItems: 'center', 
    shadowColor: '#C2410C', 
    shadowOpacity: 0.2, 
    shadowRadius: 20, 
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  closeModalBtn: { position: 'absolute', top: 18, right: 18, zIndex: 10, padding: 4 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B', marginBottom: 6, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 18 },
  
  qrHolder: { 
    width: 210, 
    height: 210, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 24, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  
  modalVendor: { fontSize: 17, fontWeight: '900', color: '#1E293B', marginBottom: 4 },
  modalReference: { fontSize: 13, color: '#64748B', marginBottom: 20, fontWeight: '700', letterSpacing: 0.5 },
  
  modalCloseBtn: { 
    paddingVertical: 16, 
    borderRadius: 18, 
    alignItems: 'center', 
    width: '100%',
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalCloseText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});