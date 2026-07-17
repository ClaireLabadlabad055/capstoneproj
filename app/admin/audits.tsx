import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, SHADOWS } from '../../styles/globalStyles';

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
      <View style={[styles.productCard, SHADOWS?.small]}>
        <View style={styles.productRow}>
          <Text style={styles.productName}>{item.name || item.product_name || 'Unnamed item'}</Text>
          <Text style={styles.productPrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
        </View>
        <Text style={styles.productDesc}>{item.description || item.desc || 'No description provided.'}</Text>
        <View style={styles.productRow}> 
          <Text style={styles.productMeta}>{item.vendor_name || item.vendorName || 'Unknown vendor'}</Text>
          <TouchableOpacity style={styles.reviewBtn} onPress={() => Alert.alert('Audit', 'Review this listing for pricing and description.') }>
            <Text style={styles.reviewBtnText}>Audit</Text>
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
        <Text style={styles.headerTitle}>Menu Audits</Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loading ? null : (
          <View style={styles.emptyContainer}>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { padding: 8, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  listContent: { padding: 20 },
  productCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  productName: { fontSize: 15, fontWeight: '900', color: '#1E293B' },
  productPrice: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  productDesc: { fontSize: 13, color: '#64748B', marginBottom: 14 },
  productMeta: { fontSize: 12, color: '#94A3B8' },
  reviewBtn: { backgroundColor: COLORS.secondary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14 },
  reviewBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 10 },
});
