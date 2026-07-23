import React, { useCallback, useEffect, useState } from 'react';
import storage from '../../lib/storage';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Dimensions, 
  Platform 
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import GradientHeader from '../_components/GradientHeader';

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
import { COLORS } from '../../styles/globalStyles';
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
      <StatusBar barStyle="light-content" backgroundColor="#C2410C" />
      
      <GradientHeader
        colors={['#C2410C', '#9A3412', '#7C2D12']}
        titleContainerStyle={{ alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 0, marginLeft: 0 }}
        rightAction={
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Feather name="log-out" size={18} color="#C2410C" />
          </TouchableOpacity>
        }
      >
        <View style={styles.headerTextBlock}>
          <Text style={styles.adminTag}>System Administrator</Text>
          <Text style={styles.welcomeText}>Platform Overview</Text>
        </View>
      </GradientHeader>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* --- KPI STATS GRID --- */}
        <View style={styles.statsGrid}>
          {platformStats.map((stat) => (
            <View key={stat.id} style={styles.statCard}>
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
            style={styles.actionCard} 
            onPress={() => router.push('/admin/vendor')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Feather name="users" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.actionText}>Manage Vendors</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/approvals')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFEDD5' }]}>
              <Feather name="check-square" size={22} color="#C2410C" />
            </View>
            <Text style={styles.actionText}>Approvals</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{pendingApprovals}</Text></View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/transactions')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}> 
              <Feather name="activity" size={22} color="#15803D" />
            </View>
            <Text style={styles.actionText}>Transactions</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/audits')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}> 
              <Feather name="clipboard" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.actionText}>Menu Audits</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/support')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}> 
              <Feather name="message-square" size={22} color="#D97706" />
            </View>
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
        </View>

        {/* --- VENDOR PERFORMANCE LIST --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Performing Vendors</Text>
          <TouchableOpacity activeOpacity={0.7}><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
        </View>

        {topMerchants.map((vendor) => {
          const status = getVendorStatus(vendor);
          const isPending = status === 'Pending';
          const isRejected = status === 'Rejected';
          return (
            <TouchableOpacity 
              key={vendor.id} 
              style={styles.vendorItem}
              onPress={() => router.push({
                pathname: '/admin/vendor-details',
                params: { id: vendor.id, name: vendor.business_name || vendor.full_name }
              })}
              activeOpacity={0.85}
            >
              <View style={styles.vendorInfo}>
                <View style={styles.vendorAvatar}>
                  <Text style={styles.avatarText}>{(vendor.business_name || vendor.full_name || 'V').charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.vendorNameText} numberOfLines={1}>{vendor.business_name || vendor.full_name || 'Unnamed Vendor'}</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: isPending ? '#D97706' : isRejected ? '#EF4444' : '#15803D' }]} />
                    <Text style={styles.statusText}>{status}</Text>
                  </View>
                  <Text style={styles.categoryTag} numberOfLines={1}>{vendor.address || vendor.barangay || vendor.location || 'No address available'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  adminTag: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#FFEDD5', 
    textTransform: 'uppercase', 
    letterSpacing: 1.5,
    marginBottom: 2
  },
  welcomeText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  headerTextBlock: { alignItems: 'flex-start' },
  logoutBtn: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA' },
  scrollContent: { padding: 20, paddingTop: 16, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { 
    backgroundColor: '#FFF', 
    width: (width - 52) / 2, 
    padding: 18, 
    borderRadius: 20, 
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#1E293B', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '800', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 14 },
  viewAll: { color: '#C2410C', fontWeight: '900', fontSize: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  actionTitle: { marginBottom: 12 },
  actionCard: { 
    width: '31%', 
    backgroundColor: '#FFF', 
    padding: 14, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 11, fontWeight: '900', color: '#334155', textAlign: 'center', letterSpacing: -0.2 },
  badge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#C2410C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  vendorItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  vendorInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  vendorAvatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#C2410C' },
  vendorNameText: { fontSize: 15, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, color: '#64748B', fontWeight: '800' },
  categoryTag: { fontSize: 11, color: '#94A3B8', marginTop: 3, fontWeight: '700' }
});