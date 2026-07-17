import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, SHADOWS } from '../../styles/globalStyles';

export default function AdminTransactions() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(25);

        if (error) throw error;
        setOrders(data || []);
      } catch (error: any) {
        console.warn('Failed to load transactions:', error.message || error);
        Alert.alert('Unable to load transactions', error.message || 'Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const renderOrder = ({ item }: { item: any }) => {
    return (
      <View style={[styles.orderCard, SHADOWS?.small]}>
        <View style={styles.orderRow}>
          <Text style={styles.orderId}>ORD-{String(item.id).substring(0, 8).toUpperCase()}</Text>
          <Text style={[styles.statusLabel, { backgroundColor: item.status === 'Completed' ? '#DCFCE7' : '#FEF3C7', color: item.status === 'Completed' ? '#15803D' : '#B45309' }]}>{item.status || 'Pending'}</Text>
        </View>
        <Text style={styles.orderText}>Customer: {item.customer_name || item.customerName || 'Unknown'}</Text>
        <Text style={styles.orderText}>Vendor: {item.vendor_name || item.vendorName || 'Unknown'}</Text>
        <Text style={styles.orderText}>Amount: ₱{Number(item.total || 0).toFixed(2)}</Text>
        <Text style={styles.orderSub}>{item.created_at ? new Date(item.created_at).toLocaleString() : 'No timestamp'}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.resolveBtn]} onPress={() => Alert.alert('Resolve', 'Mark this transaction as reviewed.') }>
            <Feather name="check-circle" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>Review</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.detailsBtn]} onPress={() => router.push({ pathname: '/admin/vendor-details', params: { id: item.vendor_id || '', name: item.vendor_name || item.vendorName || 'Vendor' } })}>
            <Feather name="eye" size={16} color={COLORS.primary} />
            <Text style={styles.detailsBtnText}>Vendor</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Overview</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loading ? null : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No transactions found.</Text>
            <Text style={styles.emptySub}>Transactions will appear here as customers place orders.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { padding: 8, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  listContent: { padding: 20 },
  orderCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 14, fontWeight: '900', color: '#1E293B' },
  statusLabel: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, fontSize: 11, fontWeight: '800' },
  orderText: { fontSize: 13, color: '#475569', marginTop: 4 },
  orderSub: { fontSize: 12, color: '#94A3B8', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 },
  resolveBtn: { backgroundColor: COLORS.primary },
  detailsBtn: { backgroundColor: '#F1F5F9' },
  actionBtnText: { color: '#FFF', fontWeight: '800' },
  detailsBtnText: { color: COLORS.primary, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 10 },
});
