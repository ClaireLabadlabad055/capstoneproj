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

export default function AdminAudits() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;
        setProducts(data || []);
      } catch (error: any) {
        console.warn('Failed to load product listings:', error.message || error);
        Alert.alert('Unable to load products', error.message || 'Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const renderProduct = ({ item }: { item: any }) => {
    return (
      <View style={styles.productCard}>
        <View style={styles.productRow}>
          <Text style={styles.productName} numberOfLines={1}>{item.name || item.product_name || 'Unnamed item'}</Text>
          <Text style={styles.productPrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
        </View>
        <Text style={styles.productDesc} numberOfLines={2}>{item.description || item.desc || 'No description provided.'}</Text>
        <View style={styles.productRow}> 
          <Text style={styles.productMeta} numberOfLines={1}>{item.vendor_name || item.vendorName || 'Unknown vendor'}</Text>
          <TouchableOpacity 
            style={styles.reviewBtn} 
            onPress={() => Alert.alert('Audit', 'Review this listing for pricing and description.')}
            activeOpacity={0.8}
          >
            <Text style={styles.reviewBtnText}>Audit</Text>
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
        <Text style={styles.headerTitle}>Menu Audits</Text>
      </GradientHeader>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? null : (
          <View style={styles.emptyContainer}>
            <View style={styles.checkCircle}>
              <Feather name="clipboard" size={36} color="#C2410C" />
            </View>
            <Text style={styles.emptyTitle}>No listings found.</Text>
            <Text style={styles.emptySub}>All product listings will appear here for review.</Text>
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
  productCard: { 
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
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3, flex: 1, marginRight: 10 },
  productPrice: { fontSize: 14, fontWeight: '900', color: '#C2410C' },
  productDesc: { fontSize: 12, color: '#64748B', marginBottom: 14, fontWeight: '600', lineHeight: 18 },
  productMeta: { fontSize: 12, color: '#94A3B8', fontWeight: '700', flex: 1, marginRight: 10 },
  reviewBtn: { backgroundColor: '#C2410C', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
  reviewBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  checkCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FED7AA' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center', letterSpacing: -0.3 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18, fontWeight: '600' },
});