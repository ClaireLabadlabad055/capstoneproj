import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  StatusBar, 
  Alert 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GradientHeader from '../_components/GradientHeader';
import { supabase } from '../../lib/supabaseClient';

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
    const isCompleted = item.status === 'Completed';
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderRow}>
          <Text style={styles.orderId} numberOfLines={1}>ORD-{String(item.id).substring(0, 8).toUpperCase()}</Text>
          <Text style={[styles.statusLabel, { backgroundColor: isCompleted ? '#DCFCE7' : '#FEF3C7', color: isCompleted ? '#15803D' : '#B45309' }]}>
            {item.status || 'Pending'}
          </Text>
        </View>
        <Text style={styles.orderText} numberOfLines={1}>Customer: {item.customer_name || item.customerName || 'Unknown'}</Text>
        <Text style={styles.orderText} numberOfLines={1}>Vendor: {item.vendor_name || item.vendorName || 'Unknown'}</Text>
        <Text style={styles.orderAmount}>Amount: ₱{Number(item.total || 0).toFixed(2)}</Text>
        <Text style={styles.orderSub}>{item.created_at ? new Date(item.created_at).toLocaleString() : 'No timestamp'}</Text>
        
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.resolveBtn]} 
            onPress={() => Alert.alert('Resolve', 'Mark this transaction as reviewed.')}
            activeOpacity={0.8}
          >
            <Feather name="check-circle" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>Review</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.detailsBtn]} 
            onPress={() => router.push({ pathname: '/admin/vendor-details', params: { id: item.vendor_id || '', name: item.vendor_name || item.vendorName || 'Vendor' } })}
            activeOpacity={0.8}
          >
            <Feather name="eye" size={16} color="#C2410C" />
            <Text style={styles.detailsBtnText}>Vendor</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C2410C" />
      <GradientHeader
        colors={['#C2410C', '#9A3412', '#7C2D12']}
        titleContainerStyle={{ alignItems: 'flex-start', justifyContent: 'center' }}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color="#C2410C" />
          </TouchableOpacity>
        }
      >
        <Text style={styles.headerTitle}>Transaction Overview</Text>
      </GradientHeader>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? null : (
          <View style={styles.emptyContainer}>
            <View style={styles.checkCircle}>
              <Feather name="activity" size={36} color="#C2410C" />
            </View>
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
  backBtn: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  listContent: { padding: 20, paddingBottom: 100 },
  orderCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    padding: 18, 
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 15, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3, flex: 1, marginRight: 10 },
  statusLabel: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  orderText: { fontSize: 13, color: '#475569', marginTop: 3, fontWeight: '600' },
  orderAmount: { fontSize: 13, color: '#C2410C', marginTop: 3, fontWeight: '900' },
  orderSub: { fontSize: 12, color: '#94A3B8', marginTop: 8, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14 },
  resolveBtn: { backgroundColor: '#C2410C' },
  detailsBtn: { backgroundColor: '#FFEDD5', borderWidth: 1, borderColor: '#FED7AA' },
  actionBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  detailsBtnText: { color: '#C2410C', fontWeight: '900', fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  checkCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FED7AA' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center', letterSpacing: -0.3 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18, fontWeight: '600' },
});