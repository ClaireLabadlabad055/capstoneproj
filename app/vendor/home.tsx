import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, Platform, UIManager, LayoutAnimation, Linking } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, SHADOWS } from '../../styles/globalStyles'; 
import { useAuth } from '../../context/AuthContext';
import { useVendor } from '../../context/VendorContext';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabaseClient';

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
    <View style={[styles.orderCard, SHADOWS?.small]}>
      <View style={styles.orderCardHeader}>
        <View>
          <Text style={styles.orderID}>ORD-{order.id.toString().substring(0, 5).toUpperCase()}</Text>
          <Text style={styles.customerSub}>{order.customerName || order.customer_name || 'Guest Customer'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={handleCall} style={{ padding: 6 }}>
            <Feather name="phone" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMessage} style={{ padding: 6 }}>
            <Feather name="message-square" size={18} color={COLORS.secondary} />
          </TouchableOpacity>
          <View style={styles.statusPill}>
            <View style={[styles.statusPill, { backgroundColor: order.status === 'Preparing' ? '#FEF3C7' : '#DCFCE7' }]}>
              <Text style={[styles.statusPillText, { color: order.status === 'Preparing' ? '#B45309' : '#15803D' }]}>{order.status}</Text>
            </View>
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
          style={[styles.actionBtn, { backgroundColor: order.status === 'Preparing' ? COLORS.primary : COLORS.secondary }]}
            onPress={() => onStatusChange(order.id, order.status)}
          >
            <Text style={styles.actionBtnText}>{order.status === 'Completed' ? 'Completed' : order.status === 'Ready to Meet Up' ? 'Complete Order' : 'Ready to Meet Up'}</Text>
          <Feather name="check-circle" size={16} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function VendorDashboard() {
  const router = useRouter();
  const { vendorProfile } = useVendor();
  const [orders, setOrders] = useState<Order[]>([]);
  const [liveApprovalStatus, setLiveApprovalStatus] = useState<string>('');

  const fetchApprovalStatus = useCallback(async () => {
    if (!vendorProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('approval_status, status')
        .eq('id', vendorProfile.id)
        .maybeSingle();

      if (error) {
        console.warn('Vendor approval status fetch error:', error.message);
        return;
      }

      const approvalStatus = String(data?.approval_status || '').trim().toLowerCase();
      const statusValue = String(data?.status || '').trim().toLowerCase();

      if (['approved', 'active', 'accepted', 'verified', 'complete'].includes(approvalStatus) || ['approved', 'active', 'accepted', 'verified', 'complete'].includes(statusValue)) {
        setLiveApprovalStatus('approved');
      } else if (['rejected', 'declined', 'denied'].includes(approvalStatus) || ['rejected', 'declined', 'denied'].includes(statusValue)) {
        setLiveApprovalStatus('rejected');
      } else {
        setLiveApprovalStatus('pending');
      }
    } catch (error) {
      console.warn('Vendor approval status fetch failed:', error);
    }
  }, [vendorProfile?.id]);

  useEffect(() => {
    fetchApprovalStatus();

    const channel = supabase.channel(`vendor-approval-${vendorProfile?.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchants', filter: `id=eq.${vendorProfile?.id}` }, () => {
        fetchApprovalStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApprovalStatus, vendorProfile?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchApprovalStatus();
      return undefined;
    }, [fetchApprovalStatus])
  );

  const approvalStatusValue = String(liveApprovalStatus || vendorProfile?.approvalStatus || vendorProfile?.approval_status || '').trim().toLowerCase();
  const approvalLabel = approvalStatusValue === 'approved' || approvalStatusValue === 'active' || approvalStatusValue === 'accepted' || approvalStatusValue === 'verified' || approvalStatusValue === 'complete'
    ? 'Approved'
    : approvalStatusValue === 'rejected' || approvalStatusValue === 'declined' || approvalStatusValue === 'denied'
      ? 'Rejected'
      : 'Pending';
  const approvalColor = approvalLabel === 'Approved' ? '#DCFCE7' : approvalLabel === 'Rejected' ? '#FEE2E2' : '#FEF3C7';
  const approvalTextColor = approvalLabel === 'Approved' ? '#15803D' : approvalLabel === 'Rejected' ? '#B91C1C' : '#B45309';

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeText}>LIVE DASHBOARD</Text>
            <Text style={styles.storeName}>{vendorProfile?.name || 'Your Kitchen'}</Text>
            <View style={[styles.approvalBadge, { backgroundColor: approvalColor }]}>
              <Text style={[styles.approvalBadgeText, { color: approvalTextColor }]}>{approvalLabel}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => Alert.alert("Logout", "Exit dashboard?", [{text: "Logout", style: "destructive", onPress: () => router.replace('/login')}])}>
            <Feather name="log-out" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsGrid}>
          <View style={styles.mainStat}>
            <Text style={styles.mainStatValue}>₱{totalSales.toLocaleString()}</Text>
            <Text style={styles.mainStatLabel}>Gross Revenue</Text>
          </View>
          <View style={styles.sideStats}>
            <View style={[styles.smallStat, { backgroundColor: COLORS.secondary }]}><Text style={styles.smallStatNum}>{activeOrders.length}</Text><Text style={styles.smallStatLabel}>Active</Text></View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Management Tools</Text>
        <View style={styles.toolGrid}>
          <TouchableOpacity style={styles.toolItem} onPress={() => router.push('/vendor/inventory')}><View style={styles.toolIcon}><MaterialCommunityIcons name="layers-outline" size={20} color="#5C5CFF" /></View><Text style={styles.toolText}>Inventory</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toolItem} onPress={() => router.push('/vendor/profile-edit')}><View style={styles.toolIcon}><MaterialCommunityIcons name="storefront-outline" size={20} color="#F59E0B" /></View><Text style={styles.toolText}>Shop Profile</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toolItem} onPress={() => router.push('/vendor/scanner')}><View style={styles.toolIcon}><MaterialCommunityIcons name="qrcode-scan" size={20} color={COLORS.primary} /></View><Text style={styles.toolText}>Scanner</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toolItem} onPress={() => router.push('/vendor/history')}><View style={styles.toolIcon}><Feather name="clock" size={20} color="#7C3AED" /></View><Text style={styles.toolText}>Order History</Text></TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Live Queue</Text>
        {activeOrders.length > 0 ? (
          activeOrders.map((order) => <CollapsibleOrderCard key={order.id} order={order} onStatusChange={handleStatusTransition} />)
        ) : (
          <View style={styles.emptyQueueContainer}>
            <MaterialCommunityIcons name="coffee-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Kitchen is Quiet</Text>
            <Text style={styles.emptySubtitle}>New orders will appear here automatically.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: COLORS.secondary, paddingTop: 60, paddingBottom: 30, paddingHorizontal: 25, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  storeName: { color: '#FFF', fontSize: 28, fontWeight: '800', marginTop: 4 },
  approvalBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  approvalBadgeText: { fontSize: 12, fontWeight: '700' },
  content: { padding: 20 },
  statsGrid: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  mainStat: { flex: 2, backgroundColor: '#FFF', padding: 20, borderRadius: 20, ...SHADOWS.small, borderWidth: 1, borderColor: '#F1F5F9' },
  mainStatValue: { fontSize: 20, fontWeight: '900', color: COLORS.secondary },
  mainStatLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  sideStats: { flex: 1 },
  smallStat: { flex: 1, padding: 15, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  smallStatNum: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  smallStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 15, marginTop: 10 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30, paddingHorizontal: 2 },
  toolItem: { alignItems: 'center', width: '48%', backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 18, ...SHADOWS.small, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12 },
  toolIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  toolText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  orderCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  orderID: { fontWeight: '900', color: '#1E293B' },
  customerSub: { color: '#64748B', fontSize: 13 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  itemSummary: { padding: 12, backgroundColor: '#F1F5F9', borderRadius: 12, marginBottom: 12 },
  summaryText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  summaryQty: { color: COLORS.primary, fontWeight: '900' },
  moreItemsText: { fontSize: 11, color: COLORS.primary, marginTop: 5, fontWeight: '700' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotalText: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: COLORS.primary },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  emptyQueueContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginTop: 15 },
  emptySubtitle: { fontSize: 13, color: '#64748B', marginTop: 5 }
});