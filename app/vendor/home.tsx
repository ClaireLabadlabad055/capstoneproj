import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, Platform, UIManager, LayoutAnimation, Linking } from 'react-native';
import GradientHeader from '../_components/GradientHeader';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, SHADOWS } from '../../styles/globalStyles'; 
import { useAuth } from '../../context/AuthContext';
import { useVendor } from '../../context/VendorContext';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';

// --- TYPES ---
type OrderItem = { name: string; qty: number; price: number };
type Order = {
  id: string;
  status: string;
  total: number | string;
  items: OrderItem[];
  customerName?: string;
  customerPhone?: string | null;
  customer_name?: string;
  vendorName?: string;
  user_id?: string;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- COLLAPSIBLE CARD COMPONENT ---
const CollapsibleOrderCard = ({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: string) => void }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleCall = () => {
    if (!order.customerPhone) return Alert.alert('No phone number', 'Customer phone number not available');
    Linking.openURL(`tel:${order.customerPhone}`);
  };

  const handleMessage = () => {
    if (!order.customerPhone) return Alert.alert('No phone number', 'Customer phone number not available');
    Linking.openURL(`sms:${order.customerPhone}`);
  };

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.orderID}>ORD-{order.id.toString().substring(0, 5).toUpperCase()}</Text>
          <Text style={styles.customerSub} numberOfLines={1}>{order.customerName || order.customer_name || 'Guest Customer'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity onPress={handleCall} style={styles.iconActionBtn} activeOpacity={0.8}>
            <Feather name="phone" size={15} color="#C2410C" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMessage} style={styles.iconActionBtn} activeOpacity={0.8}>
            <Feather name="message-square" size={15} color="#9A3412" />
          </TouchableOpacity>
          <View style={[styles.statusPill, { backgroundColor: order.status === 'Preparing' ? '#FFEDD5' : '#DCFCE7' }]}>
            <Text style={[styles.statusPillText, { color: order.status === 'Preparing' ? '#C2410C' : '#15803D' }]}>{order.status}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.9}>
        <View style={styles.itemSummary}>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryQty}>{order.items[0]?.qty}x</Text> {order.items[0]?.name}
          </Text>
          {expanded && order.items.slice(1).map((item, i) => (
            <Text key={i} style={styles.summaryText}><Text style={styles.summaryQty}>{item.qty}x</Text> {item.name}</Text>
          ))}
          {!expanded && order.items.length > 1 && <Text style={styles.moreItemsText}>+ {order.items.length - 1} more items (Tap to view)</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotalText}>₱{Number(order.total).toFixed(2)}</Text>
        <TouchableOpacity 
          style={{ width: 'auto' }}
          activeOpacity={0.8}
          onPress={() => onStatusChange(order.id, order.status)}
        >
          <LinearGradient
            colors={order.status === 'Preparing' ? ['#C2410C', '#9A3412'] : ['#15803D', '#166534']}
            style={styles.actionBtnGrad}
          >
            <Text style={styles.actionBtnText}>
              {order.status === 'Completed' ? 'Completed' : order.status === 'Ready to Meet Up' ? 'Complete Order' : 'Ready to Meet Up'}
            </Text>
            <Feather name="check-circle" size={14} color="#FFF" style={{ marginLeft: 6 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function VendorDashboard() {
  const router = useRouter();
  const { user, userData, signOut } = useAuth(); // Included signOut if available in your context
  const { vendorProfile } = useVendor();
  const [orders, setOrders] = useState<Order[]>([]);
  const [liveApprovalStatus, setLiveApprovalStatus] = useState<string>('');
  const [fetchedMerchantName, setFetchedMerchantName] = useState<string>('');

  const fetchMerchantDetails = useCallback(async () => {
    const activeVendorId = vendorProfile?.id || user?.id;
    if (!activeVendorId) return;

    try {
      // Fetch specifically from merchants table matching the active vendor/user ID
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', activeVendorId)
        .maybeSingle();

      if (merchantError) {
        console.warn('Merchant fetch error:', merchantError.message);
      }

      if (merchantData) {
        const foundName = merchantData.business_name || merchantData.name || merchantData.store_name;
        if (foundName) {
          setFetchedMerchantName(String(foundName));
        }

        const approvalStatus = String(merchantData.approval_status || merchantData.status || '').trim().toLowerCase();
        if (['approved', 'active', 'accepted', 'verified', 'complete'].includes(approvalStatus)) {
          setLiveApprovalStatus('approved');
        } else if (['rejected', 'declined', 'denied'].includes(approvalStatus)) {
          setLiveApprovalStatus('rejected');
        } else {
          setLiveApprovalStatus('pending');
        }
        return;
      }

      // Fallback to profiles table if merchants table record wasn't found directly
      const { data: profileData } = await supabase
        .from('profiles')
        .select('business_name, full_name, store_name')
        .eq('id', activeVendorId)
        .maybeSingle();

      if (profileData) {
        const profileName = profileData.business_name || profileData.store_name || profileData.full_name;
        if (profileName) {
          setFetchedMerchantName(String(profileName));
        }
      }
    } catch (error) {
      console.warn('Merchant details fetch exception:', error);
    }
  }, [vendorProfile?.id, user?.id]);

  useEffect(() => {
    fetchMerchantDetails();

    const activeVendorId = vendorProfile?.id || user?.id;
    if (!activeVendorId) return;

    const channel = supabase.channel(`vendor-dashboard-${activeVendorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'merchants' }, () => {
        fetchMerchantDetails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMerchantDetails, vendorProfile?.id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchMerchantDetails();
      return undefined;
    }, [fetchMerchantDetails])
  );

  const approvalStatusValue = String(liveApprovalStatus || vendorProfile?.approvalStatus || vendorProfile?.approval_status || '').trim().toLowerCase();
  const approvalLabel = approvalStatusValue === 'approved' || approvalStatusValue === 'active' || approvalStatusValue === 'accepted' || approvalStatusValue === 'verified' || approvalStatusValue === 'complete'
    ? 'Approved'
    : approvalStatusValue === 'rejected' || approvalStatusValue === 'declined' || approvalStatusValue === 'denied'
      ? 'Rejected'
      : 'Pending';
  const approvalColor = approvalLabel === 'Approved' ? '#DCFCE7' : approvalLabel === 'Rejected' ? '#FEE2E2' : '#FFEDD5';
  const approvalTextColor = approvalLabel === 'Approved' ? '#15803D' : approvalLabel === 'Rejected' ? '#B91C1C' : '#C2410C';

  const resolvedVendorName = useMemo(() => {
    return (
      vendorProfile?.business_name ||
      vendorProfile?.name ||
      fetchedMerchantName ||
      userData?.business_name ||
      userData?.full_name ||
      user?.full_name ||
      user?.email ||
      'Your Kitchen'
    );
  }, [vendorProfile, fetchedMerchantName, userData, user]);

  const fetchOrders = useCallback(async () => {
    if (!vendorProfile?.name && !vendorProfile?.id) return;

    try {
      const vendorName = vendorProfile?.name || '';
      const vendorId = vendorProfile?.id;
      const collected: any[] = [];

      if (vendorId) {
        const { data: byVendorId, error: vendorIdError } = await supabase
          .from('orders')
          .select('*')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false });

        if (vendorIdError) {
          console.warn('Vendor orders fetch by vendor id error:', vendorIdError.message);
        } else if (byVendorId?.length) {
          collected.push(...byVendorId);
        }
      }

      if (vendorName) {
        const { data: byName, error: errName } = await supabase
          .from('orders')
          .select('*')
          .eq('vendor_name', vendorName)
          .order('created_at', { ascending: false });

        if (errName) {
          console.warn('Vendor orders fetch by name error:', errName.message);
        } else if (byName?.length) {
          collected.push(...byName);
        }
      }

      const unique = Array.from(new Map(collected.map((o: any) => [o.id, o])).values());
      const userIds = Array.from(new Set(unique.map((o: any) => o.user_id).filter(Boolean)));
      let profiles: any[] = [];

      if (userIds.length > 0) {
        try {
          const { data: pData, error: pErr } = await supabase.from('profiles').select('id, full_name, phone').in('id', userIds);
          if (pErr) console.warn('Profiles fetch error', pErr.message);
          profiles = pData || [];
        } catch (e) {
          console.warn('Profiles fetch exception', e);
        }
      }

      const mapped = unique.map((o: any) => {
        const prof = (profiles as any[]).find((p: any) => p.id === o.user_id);
        return {
          ...o,
          customerName: o.customer_name || (prof?.full_name) || o.customerName || 'Guest Customer',
          customerPhone: prof?.phone || o.customerPhone || null,
        };
      });

      setOrders(mapped as Order[]);
    } catch (e) {
      console.error('Fetch orders exception:', e);
    }
  }, [vendorProfile?.id, vendorProfile?.name]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase.channel('realtime-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const handleStatusTransition = async (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Preparing' || currentStatus === 'Awaiting Payment' ? 'Ready to Meet Up' : 'Completed';

    let updateResult: any = null;
    if (vendorProfile?.id) {
      updateResult = await supabase.from('orders').update({ status: nextStatus }).eq('id', String(orderId)).eq('vendor_id', vendorProfile.id).select();
    }

    if (!updateResult || updateResult.error || !updateResult.data?.length) {
      if (vendorProfile?.name) {
        updateResult = await supabase.from('orders').update({ status: nextStatus }).eq('id', String(orderId)).eq('vendor_name', vendorProfile.name).select();
      }
    }

    if (updateResult?.error) {
      console.error('Failed to update order status:', updateResult.error);
      Alert.alert('Update failed', updateResult.error.message || 'Could not update the order status. Please try again.');
      return;
    }

    if (!updateResult?.data?.length) {
      const fallbackResult = await supabase.from('orders').update({ status: nextStatus }).eq('id', String(orderId)).select();
      if (fallbackResult.error) {
        console.error('Failed to update order status:', fallbackResult.error);
        Alert.alert('Update failed', fallbackResult.error.message || 'Could not update the order status. Please try again.');
        return;
      }
    }

    await fetchOrders();
    Alert.alert('Status updated', 'The customer can now see the new order status.');
  };

  const activeOrders = orders.filter(o => o.status !== 'Completed');
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalSales = completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const headerLabel = resolvedVendorName;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <GradientHeader
        colors={['#C2410C', '#9A3412', '#7C2D12']}
        rightAction={
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
            onPress={() => 
              Alert.alert(
                "Logout", 
                "Exit dashboard?", 
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Logout", 
                    style: "destructive", 
                    onPress: async () => {
                      try {
                        if (signOut) {
                          await signOut();
                        } else {
                          await supabase.auth.signOut();
                        }
                      } catch (err) {
                        console.error('Logout error:', err);
                      } finally {
                        router.replace('/login');
                      }
                    } 
                  }
                ]
              )
            }
          >
            <Feather name="log-out" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        }
        titleContainerStyle={{ alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}
        style={{
          borderBottomWidth: 0,
          paddingTop: Platform.OS === 'android' ? 44 : 54,
          paddingBottom: 28,
          paddingHorizontal: 20,
          minHeight: 120,
          marginBottom: 10,
        }}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcomeText}>LIVE DASHBOARD</Text>
            <Text style={styles.storeName} numberOfLines={1}>{headerLabel}</Text>
            <View style={[styles.approvalBadge, { backgroundColor: approvalColor }]}> 
              <Text style={[styles.approvalBadgeText, { color: approvalTextColor }]}>{approvalLabel}</Text>
            </View>
          </View>
        </View>
      </GradientHeader>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsGrid}>
          <View style={styles.mainStat}>
            <Text style={styles.mainStatValue}>₱{totalSales.toLocaleString()}</Text>
            <Text style={styles.mainStatLabel}>Gross Revenue</Text>
          </View>
          <View style={styles.sideStats}>
            <View style={styles.smallStat}>
              <Text style={styles.smallStatNum}>{activeOrders.length}</Text>
              <Text style={styles.smallStatLabel}>Active</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Management Tools</Text>
        <View style={styles.toolGrid}>
          <TouchableOpacity style={styles.toolItem} activeOpacity={0.9} onPress={() => router.push('/vendor/inventory')}>
            <View style={styles.toolIcon}>
              <MaterialCommunityIcons name="layers-outline" size={22} color="#C2410C" />
            </View>
            <Text style={styles.toolText}>Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolItem} activeOpacity={0.9} onPress={() => router.push('/vendor/profile-edit')}>
            <View style={styles.toolIcon}>
              <MaterialCommunityIcons name="storefront-outline" size={22} color="#C2410C" />
            </View>
            <Text style={styles.toolText}>Shop Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolItem} activeOpacity={0.9} onPress={() => router.push('/vendor/scanner')}>
            <View style={styles.toolIcon}>
              <MaterialCommunityIcons name="qrcode-scan" size={22} color="#C2410C" />
            </View>
            <Text style={styles.toolText}>Scanner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolItem} activeOpacity={0.9} onPress={() => router.push('/vendor/history')}>
            <View style={styles.toolIcon}>
              <Feather name="clock" size={22} color="#C2410C" />
            </View>
            <Text style={styles.toolText}>Order History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolItem} activeOpacity={0.9} onPress={() => router.push('/vendor/messages')}>
            <View style={styles.toolIcon}>
              <Feather name="message-circle" size={22} color="#C2410C" />
            </View>
            <Text style={styles.toolText}>Messages</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Live Queue</Text>
        {activeOrders.length > 0 ? (
          activeOrders.map((order) => <CollapsibleOrderCard key={order.id} order={order} onStatusChange={handleStatusTransition} />)
        ) : (
          <View style={styles.emptyQueueContainer}>
            <MaterialCommunityIcons name="coffee-outline" size={48} color="#C2410C" />
            <Text style={styles.emptyTitle}>Kitchen is Quiet</Text>
            <Text style={styles.emptySubtitle}>New orders will appear here automatically.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flex: 1, minWidth: 0, width: '100%' },
  headerTextContainer: { alignItems: 'flex-start', flex: 1, minWidth: 0, marginRight: 12, width: '100%', flexShrink: 1 },
  welcomeText: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
  storeName: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 2, letterSpacing: -0.3, flexShrink: 1, maxWidth: '100%', width: '100%' },
  logoutButton: { justifyContent: 'center', alignItems: 'center', padding: 10, minHeight: 40, minWidth: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  approvalBadge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  approvalBadgeText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  content: { padding: 20, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  mainStat: { flex: 2, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#C2410C', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  mainStatValue: { fontSize: 24, fontWeight: '900', color: '#C2410C', letterSpacing: -0.3 },
  mainStatLabel: { fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: '700' },
  sideStats: { flex: 1 },
  smallStat: { flex: 1, padding: 15, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C2410C', shadowColor: '#C2410C', shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  smallStatNum: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  smallStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '800', marginTop: 2, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 16, marginTop: 10, letterSpacing: -0.3 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 28 },
  toolItem: { alignItems: 'center', width: '48%', backgroundColor: '#FFFFFF', paddingVertical: 18, paddingHorizontal: 12, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 14, shadowColor: '#C2410C', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  toolIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  toolText: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#C2410C', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  orderID: { fontWeight: '900', color: '#1E293B', fontSize: 15, letterSpacing: -0.3 },
  customerSub: { color: '#64748B', fontSize: 13, marginTop: 2, fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  iconActionBtn: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemSummary: { padding: 14, backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryText: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  summaryQty: { color: '#C2410C', fontWeight: '900' },
  moreItemsText: { fontSize: 11, color: '#C2410C', marginTop: 6, fontWeight: '800' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotalText: { fontSize: 18, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  actionBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, shadowColor: '#C2410C', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  actionBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  emptyQueueContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginTop: 12, letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '600' }
});
