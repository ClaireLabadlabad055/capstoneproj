import React, { useCallback, useEffect, useState } from 'react';
import storage from '../../lib/storage';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  SafeAreaView, 
  Dimensions, 
  Platform 
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

const getVendorStatus = (item: any) => {
  const approvalStatus = String(item?.approval_status || item?.status || '').trim().toLowerCase();
  const statusValue = String(item?.status || '').trim().toLowerCase();

  if (['approved', 'active', 'accepted', 'verified', 'complete'].includes(approvalStatus) || ['approved', 'active', 'accepted', 'verified', 'complete'].includes(statusValue)) {
    return 'Active';
  }

  if (['rejected', 'declined', 'denied'].includes(approvalStatus) || ['rejected', 'declined', 'denied'].includes(statusValue)) {
    return 'Rejected';
  }

  return 'Pending';
};
import { COLORS, SHADOWS } from '../../styles/globalStyles';
import { supabase } from '../../lib/supabaseClient';

// Get device width for responsive grid
const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const router = useRouter();
  const [merchantCount, setMerchantCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [topMerchants, setTopMerchants] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [{ data: merchantData, error: merchantError, count: merchantTotal },
        { data: customerData, error: customerError, count: customerTotal },
        { data: orderData, error: orderError, count: orderTotal }] = await Promise.all([
          supabase.from('merchants').select('id', { count: 'exact' }),
          supabase.from('customers').select('id', { count: 'exact' }),
          supabase.from('orders').select('id', { count: 'exact' }),
      ]);

      if (merchantError) console.warn('Merchant count fetch error:', merchantError.message);
      if (customerError) console.warn('Customer count fetch error:', customerError.message);
      if (orderError) console.warn('Order count fetch error:', orderError.message);

      const activeMerchants = (merchantData || []).filter((item: any) => getVendorStatus(item) === 'Active');

      setMerchantCount(activeMerchants.length);
      setCustomerCount(customerTotal ?? customerData?.length ?? 0);
      setOrderCount(orderTotal ?? orderData?.length ?? 0);

      const { data: merchants, error: topMerchantError } = await supabase
        .from('merchants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (topMerchantError) {
        console.warn('Top merchants fetch error:', topMerchantError.message);
        setTopMerchants([]);
      } else {
        setTopMerchants(merchants || []);
      }

      let localPendingAdjustment = 0;
      try {
        const pendingSignalRaw = await storage.getItem('approval_sync_flag');
        if (pendingSignalRaw) {
          const pendingSignal = JSON.parse(pendingSignalRaw);
          localPendingAdjustment = Number(pendingSignal?.delta || 0);
          if (localPendingAdjustment > 0) {
            await storage.removeItem('approval_sync_flag');
          }
        }
      } catch (storageError) {
        console.warn('Unable to read approval sync signal:', storageError);
      }

      const [merchantResponse, customerResponse] = await Promise.all([
        supabase.from('merchants').select('*'),
        supabase.from('customers').select('*'),
      ]);

      const merchantPendingCount = (merchantResponse.data || []).filter((item: any) => getVendorStatus(item) === 'Pending').length;

      const customerPendingCount = (customerResponse.data || []).filter((item: any) => {
        const approvalStatus = String(item?.approval_status || '').trim().toLowerCase();
        const statusValue = String(item?.status || '').trim().toLowerCase();
        if (['approved', 'active', 'accepted', 'verified', 'complete'].includes(approvalStatus) || ['approved', 'active', 'accepted', 'verified', 'complete'].includes(statusValue)) {
          return false;
        }
        if (['rejected', 'declined', 'denied'].includes(approvalStatus) || ['rejected', 'declined', 'denied'].includes(statusValue)) {
          return false;
        }
        return approvalStatus === 'pending' || approvalStatus === 'pending approval' || approvalStatus === 'pending review'
          || statusValue === 'pending' || statusValue === 'pending approval' || statusValue === 'pending review';
      }).length;

      setPendingApprovals(Math.max(0, merchantPendingCount + customerPendingCount - localPendingAdjustment));
    } catch (error) {
      console.error('Admin dashboard fetch error:', error);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
      return undefined;
    }, [fetchDashboardData])
  );

  useEffect(() => {
    const unsubscribe = router.addListener?.('focus', () => {
      fetchDashboardData();
    });

    return () => {
      unsubscribe?.();
    };
  }, [fetchDashboardData, router]);

  const platformStats = [
    { id: '1', label: 'Active Vendors', value: String(merchantCount), icon: 'storefront-outline', color: '#059669' },
    { id: '2', label: 'Total Orders', value: String(orderCount), icon: 'shopping-outline', color: '#D97706' },
    { id: '3', label: 'Customers', value: String(customerCount), icon: 'account-multiple-outline', color: '#7C3AED' },
    { id: '4', label: 'Pending Reviews', value: String(pendingApprovals), icon: 'clock-outline', color: '#4F46E5' },
  ];

  const handleLogout = () => {
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* --- HEADER SECTION --- */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.adminTag}>System Administrator</Text>
              <Text style={styles.welcomeText}>Platform Overview</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* --- KPI STATS GRID --- */}
        <View style={styles.statsGrid}>
          {platformStats.map((stat) => (
            <View key={stat.id} style={[styles.statCard, SHADOWS?.small]}>
              <View style={[styles.iconCircle, { backgroundColor: stat.color + '15' }]}>
                <MaterialCommunityIcons name={stat.icon as any} size={22} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* --- QUICK ACTIONS --- */}
        <Text style={[styles.sectionTitle, styles.actionTitle]}>System Control</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionCard, SHADOWS?.small]} 
            onPress={() => router.push('/admin/vendor')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Feather name="users" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.actionText}>Manage Vendors</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, SHADOWS?.small]} 
            onPress={() => router.push('/admin/approvals')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Feather name="check-square" size={24} color="#D97706" />
            </View>
            <Text style={styles.actionText}>Approvals</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{pendingApprovals}</Text></View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, SHADOWS?.small]} 
            onPress={() => router.push('/admin/transactions')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}> 
              <Feather name="activity" size={24} color="#059669" />
            </View>
            <Text style={styles.actionText}>Transactions</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, SHADOWS?.small]} 
            onPress={() => router.push('/admin/audits')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}> 
              <Feather name="clipboard" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.actionText}>Menu Audits</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, SHADOWS?.small]} 
            onPress={() => router.push('/admin/support')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}> 
              <Feather name="message-square" size={24} color="#D97706" />
            </View>
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
        </View>

        {/* --- VENDOR PERFORMANCE LIST --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Performing Vendors</Text>
          <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
        </View>

        {topMerchants.map((vendor) => (
          <TouchableOpacity 
            key={vendor.id} 
            style={styles.vendorItem}
            onPress={() => router.push({
              pathname: '/admin/vendor-details',
              params: { id: vendor.id, name: vendor.business_name || vendor.full_name }
            })}
          >
            <View style={styles.vendorInfo}>
              <View style={styles.vendorAvatar}>
                <Text style={styles.avatarText}>{(vendor.business_name || vendor.full_name || 'V').charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.vendorNameText}>{vendor.business_name || vendor.full_name || 'Unnamed Vendor'}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: getVendorStatus(vendor) === 'Pending' ? '#F59E0B' : getVendorStatus(vendor) === 'Rejected' ? '#EF4444' : '#10B981' }]} />
                  <Text style={styles.statusText}>{getVendorStatus(vendor)}</Text>
                </View>
                <Text style={[styles.categoryTag, { marginTop: 4 }]}>{vendor.address || vendor.barangay || vendor.location || 'No address available'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, 
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  headerContent: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingVertical: 20,
  },
  adminTag: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: COLORS.primary, 
    textTransform: 'uppercase', 
    letterSpacing: 1.2,
    marginBottom: 2
  },
  welcomeText: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  logoutBtn: { padding: 12, backgroundColor: '#FFF1F1', borderRadius: 14 },
  scrollContent: { padding: 20, paddingTop: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 18 },
  statCard: { 
    backgroundColor: '#FFF', 
    width: (width - 55) / 2, // Uses the width constant correctly
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 15,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 },
  viewAll: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 30 },
  actionTitle: { marginBottom: 8 },
  actionCard: { width: '47%', backgroundColor: '#FFF', padding: 16, borderRadius: 24, alignItems: 'center', minHeight: 130 },
  actionIcon: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionText: { fontSize: 12, fontWeight: '900', color: '#334155', textAlign: 'center' },
  badge: { position: 'absolute', top: 18, right: 18, backgroundColor: '#EF4444', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  vendorItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 18, 
    borderRadius: 22, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  vendorInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vendorAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  vendorNameText: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  vendorSales: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  vendorRating: { fontSize: 12, color: '#64748B', marginTop: 3 }
});