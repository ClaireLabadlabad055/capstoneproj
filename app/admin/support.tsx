import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, SHADOWS } from '../../styles/globalStyles';

export default function AdminSupport() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) {
          if (error.code === '42P01') {
            return setReports([]);
          }
          throw error;
        }

        setReports(data || []);
      } catch (error: any) {
        console.warn('Failed to load reports:', error.message || error);
        Alert.alert('Support data unavailable', error.message || 'Please check the database schema.');
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  const renderReport = ({ item }: { item: any }) => (
    <View style={[styles.reportCard, SHADOWS?.small]}>
      <Text style={styles.reportType}>{item.type || 'User Report'}</Text>
      <Text style={styles.reportText}>{item.message || item.description || 'No details provided.'}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Reporter:</Text>
        <Text style={styles.metaValue}>{item.user_email || item.user_id || 'Unknown'}</Text>
      </View>
      <View style={styles.metaRow}> 
        <Text style={styles.metaLabel}>Vendor:</Text>
        <Text style={styles.metaValue}>{item.vendor_name || item.vendorName || 'N/A'}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.resolveBtn]} onPress={() => Alert.alert('Issue resolved', 'This report has been acknowledged.') }>
          <Feather name="check-circle" size={16} color="#FFF" />
          <Text style={styles.actionBtnText}>Resolve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.detailsBtn]} onPress={() => router.push('/admin/transactions')}>
          <Feather name="message-square" size={16} color={COLORS.primary} />
          <Text style={styles.detailsBtnText}>View Transaction</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support & Moderation</Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderReport}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loading ? null : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No reports available.</Text>
            <Text style={styles.emptySub}>User issues and moderation reports will appear here.</Text>
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
  reportCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16 },
  reportType: { fontSize: 13, fontWeight: '900', color: COLORS.primary, marginBottom: 8 },
  reportText: { fontSize: 14, color: '#475569', marginBottom: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metaLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  metaValue: { fontSize: 12, color: '#1E293B', fontWeight: '800' },
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
