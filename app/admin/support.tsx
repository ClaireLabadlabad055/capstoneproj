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
    <View style={styles.reportCard}>
      <Text style={styles.reportType}>{item.type || 'User Report'}</Text>
      <Text style={styles.reportText} numberOfLines={3}>{item.message || item.description || 'No details provided.'}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Reporter:</Text>
        <Text style={styles.metaValue} numberOfLines={1}>{item.user_email || item.user_id || 'Unknown'}</Text>
      </View>
      <View style={styles.metaRow}> 
        <Text style={styles.metaLabel}>Vendor:</Text>
        <Text style={styles.metaValue} numberOfLines={1}>{item.vendor_name || item.vendorName || 'N/A'}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.resolveBtn]} 
          onPress={() => Alert.alert('Issue resolved', 'This report has been acknowledged.')}
          activeOpacity={0.8}
        >
          <Feather name="check-circle" size={16} color="#FFF" />
          <Text style={styles.actionBtnText}>Resolve</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.detailsBtn]} 
          onPress={() => router.push('/admin/transactions')}
          activeOpacity={0.8}
        >
          <Feather name="message-square" size={16} color="#C2410C" />
          <Text style={styles.detailsBtnText}>View Transaction</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Support & Moderation</Text>
      </GradientHeader>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderReport}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? null : (
          <View style={styles.emptyContainer}>
            <View style={styles.checkCircle}>
              <Feather name="message-square" size={36} color="#C2410C" />
            </View>
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
  backBtn: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  listContent: { padding: 20, paddingBottom: 100 },
  reportCard: { 
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
  reportType: { fontSize: 13, fontWeight: '900', color: '#C2410C', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  reportText: { fontSize: 13, color: '#475569', marginBottom: 14, fontWeight: '600', lineHeight: 18 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 10 },
  metaLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  metaValue: { fontSize: 12, color: '#1E293B', fontWeight: '800', flex: 1, textAlign: 'right' },
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