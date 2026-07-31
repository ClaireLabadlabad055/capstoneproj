import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, LayoutAnimation, Linking, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useVendor } from '../../context/VendorContext';
import { supabase } from '../../lib/supabaseClient';
import GradientHeader from '../_components/GradientHeader';

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
  pickupBatch?: string;
  pickup_batch?: string;
  pickupLandmark?: string;
  pickup_landmark?: string;
  pickup_point_id?: string;
  rejection_reason?: string;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- HELPER TO CLEAN PICKUP LOCATION (Removes [Slot: ...] text) ---
const cleanLocationText = (rawLocation: string) => {
  if (!rawLocation) return 'Public Market Entrance';
  return rawLocation.replace(/\s*\[Slot:\s*[^\]]+\]/i, '').trim();
};

// --- COLLAPSIBLE CARD COMPONENT ---
const CollapsibleOrderCard = ({ 
  order, 
  onStatusChange, 
  onRejectPress 
}: { 
  order: Order; 
  onStatusChange: (id: string, status: string) => void;
  onRejectPress: (order: Order) => void;
}) => {
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

  const isPending = order.status === 'Pending' || order.status === 'Awaiting Acceptance';

  // Determine status pill background and text colors
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Pending':
      case 'Awaiting Acceptance':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'Preparing':
        return { bg: '#FFEDD5', text: '#C2410C' };
      case 'Ready to Meet Up':
        return { bg: '#E0F2FE', text: '#0284C7' };
      default:
        return { bg: '#DCFCE7', text: '#15803D' };
    }
  };

  const statusStyle = getStatusStyle(order.status);

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
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusPillText, { color: statusStyle.text }]}>{order.status}</Text>
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
        
        {isPending ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={{ width: 'auto' }}
              activeOpacity={0.8}
              onPress={() => onRejectPress(order)}
            >
              <View style={styles.rejectBtnGrad}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ width: 'auto' }}
              activeOpacity={0.8}
              onPress={() => onStatusChange(order.id, order.status)}
            >
              <LinearGradient
                colors={['#15803D', '#166534']}
                style={styles.actionBtnGrad}
              >
                <Text style={styles.actionBtnText}>Accept</Text>
                <Feather name="check" size={14} color="#FFF" style={{ marginLeft: 4 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={{ width: 'auto' }}
            activeOpacity={0.8}
            onPress={() => onStatusChange(order.id, order.status)}
          >
            <LinearGradient
              colors={order.status === 'Preparing' ? ['#0284C7', '#0369A1'] : ['#15803D', '#166534']}
              style={styles.actionBtnGrad}
            >
              <Text style={styles.actionBtnText}>
                {order.status === 'Completed' ? 'Completed' : order.status === 'Ready to Meet Up' ? 'Complete Order' : 'Ready to Meet Up'}
              </Text>
              <Feather name="check-circle" size={14} color="#FFF" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function VendorDashboard() {
  const router = useRouter();
  const { user, userData, signOut } = useAuth();
  const { vendorProfile } = useVendor();
  const [orders, setOrders] = useState<Order[]>([]);
  const [liveApprovalStatus, setLiveApprovalStatus] = useState<string>('');
  const [fetchedMerchantName, setFetchedMerchantName] = useState<string>('');

  // Rejection modal states
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedOrderToReject, setSelectedOrderToReject] = useState<Order | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const fetchMerchantDetails = useCallback(async () => {
    const activeVendorId = vendorProfile?.id || user?.id;
    if (!activeVendorId) return;

    try {
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
    const activeVendorId = vendorProfile?.id || user?.id;
    const activeVendorName = vendorProfile?.name || vendorProfile?.business_name || fetchedMerchantName;

    if (!activeVendorId && !activeVendorName) return;

    try {
      const collected: any[] = [];

      if (activeVendorId) {
        const { data: byVendorId, error: vendorIdError } = await supabase
          .from('orders')
          .select('*')
          .eq('vendor_id', activeVendorId)
          .order('created_at', { ascending: false });

        if (vendorIdError) {
          console.warn('Vendor orders fetch by vendor id error:', vendorIdError.message);
        } else if (byVendorId?.length) {
          collected.push(...byVendorId);
        }
      }

      if (activeVendorName) {
        const { data: byName, error: errName } = await supabase
          .from('orders')
          .select('*')
          .eq('vendor_name', activeVendorName)
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
  }, [vendorProfile?.id, vendorProfile?.name, vendorProfile?.business_name, fetchedMerchantName, user?.id]);

  useEffect(() => {
    fetchOrders();

    const activeVendorId = vendorProfile?.id || user?.id || 'anonymous';
    const channelName = `orders-realtime-${activeVendorId}-${Date.now()}`;

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel error encountered. Polling fallback active.');
        }
      });

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [fetchOrders, vendorProfile?.id, user?.id]);

  const handleStatusTransition = async (orderId: string, currentStatus: string) => {
    let nextStatus = 'Preparing';
    if (currentStatus === 'Preparing') {
      nextStatus = 'Ready to Meet Up';
    } else if (currentStatus === 'Ready to Meet Up') {
      nextStatus = 'Completed';
    }

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
    const alertMessage = nextStatus === 'Preparing' 
      ? 'Order accepted. The customer has been notified that you are preparing their food.'
      : nextStatus === 'Ready to Meet Up'
      ? 'Order marked ready to meet up. Customer has been notified.'
      : 'Order completed successfully.';
    Alert.alert('Status updated', alertMessage);
  };

  const openRejectModal = (order: Order) => {
    setSelectedOrderToReject(order);
    setRejectionReasonInput('');
    setRejectModalVisible(true);
  };

  const handleConfirmRejection = async () => {
    if (!selectedOrderToReject) return;
    if (!rejectionReasonInput.trim()) {
      Alert.alert('Reason required', 'Please provide a reason for rejecting this order.');
      return;
    }

    const orderId = selectedOrderToReject.id;
    const reason = rejectionReasonInput.trim();

    let updateResult: any = null;
    if (vendorProfile?.id) {
      updateResult = await supabase.from('orders').update({ 
        status: 'Rejected', 
        rejection_reason: reason 
      }).eq('id', String(orderId)).eq('vendor_id', vendorProfile.id).select();
    }

    if (!updateResult || updateResult.error || !updateResult.data?.length) {
      if (vendorProfile?.name) {
        updateResult = await supabase.from('orders').update({ 
          status: 'Rejected', 
          rejection_reason: reason 
        }).eq('id', String(orderId)).eq('vendor_name', vendorProfile.name).select();
      }
    }

    if (updateResult?.error) {
      console.error('Failed to reject order:', updateResult.error);
      Alert.alert('Update failed', updateResult.error.message || 'Could not reject the order. Please try again.');
      return;
    }

    if (!updateResult?.data?.length) {
      const fallbackResult = await supabase.from('orders').update({ 
        status: 'Rejected', 
        rejection_reason: reason 
      }).eq('id', String(orderId)).select();
      if (fallbackResult.error) {
        console.error('Failed to reject order:', fallbackResult.error);
        Alert.alert('Update failed', fallbackResult.error.message || 'Could not reject the order. Please try again.');
        return;
      }
    }

    setRejectModalVisible(false);
    setSelectedOrderToReject(null);
    setRejectionReasonInput('');
    await fetchOrders();
    Alert.alert('Order Rejected', 'The order has been rejected and the customer has been notified with your reason.');
  };

  const activeOrders = orders.filter(o => o.status !== 'Completed' && o.status !== 'Rejected');
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalSales = completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const headerLabel = resolvedVendorName;

  // Group active orders by cleaned pickup location, then by Batch Schedules
  const groupedActiveOrders = useMemo(() => {
    const map: { [landmark: string]: { [batch: string]: Order[] } } = {};
    
    activeOrders.forEach(order => {
      const rawLandmark = order.pickup_point_id || order.pickupLandmark || order.pickup_landmark || 'Public Market Entrance';
      
      // Extract the slot match if it exists inside the raw location string
      const slotMatch = rawLandmark.match(/\[Slot:\s*([^\]]+)\]/i);
      const batch = slotMatch ? slotMatch[1].trim() : (order.pickupBatch || order.pickup_batch || 'Batch 1 (10:00 AM - 11:00 AM)');
      
      const landmark = cleanLocationText(rawLandmark);

      if (!map[landmark]) {
        map[landmark] = {};
      }
      if (!map[landmark][batch]) {
        map[landmark][batch] = [];
      }
      map[landmark][batch].push(order);
    });

    return map;
  }, [activeOrders]);

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
        titleContainerStyle={styles.headerTitleContainer}
        style={{
          borderBottomWidth: 0,
          paddingTop: Platform.OS === 'android' ? 44 : 54,
          paddingBottom: 28,
          paddingHorizontal: 16,
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
          Object.entries(groupedActiveOrders).map(([landmarkName, batches]) => (
            <View key={landmarkName} style={styles.landmarkGroupContainer}>
              {/* Landmark Header */}
              <View style={styles.landmarkGroupHeader}>
                <Ionicons name="location" size={16} color="#C2410C" />
                <Text style={styles.landmarkGroupHeaderText}>{landmarkName}</Text>
              </View>

              {/* Batches under this Landmark */}
              {Object.entries(batches).map(([batchName, batchOrders]) => (
                <View key={batchName} style={styles.batchGroupContainer}>
                  <View style={styles.batchGroupHeader}>
                    <Feather name="clock" size={14} color="#64748B" />
                    <Text style={styles.batchGroupHeaderText}>{batchName}</Text>
                  </View>

                  {/* Orders under this Batch & Landmark */}
                  {batchOrders.map((order) => (
                    <CollapsibleOrderCard 
                      key={order.id} 
                      order={order} 
                      onStatusChange={handleStatusTransition} 
                      onRejectPress={openRejectModal}
                    />
                  ))}
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyQueueContainer}>
            <MaterialCommunityIcons name="coffee-outline" size={48} color="#C2410C" />
            <Text style={styles.emptyTitle}>Kitchen is Quiet</Text>
            <Text style={styles.emptySubtitle}>New orders will appear here automatically.</Text>
          </View>
        )}
      </ScrollView>

      {/* REJECTION REASON MODAL */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Order</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Please provide a reason why this order is being rejected. This will be sent to the customer.
            </Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., Ingredients out of stock, closed early..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={rejectionReasonInput}
              onChangeText={setRejectionReasonInput}
              textAlignVertical="top"
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                activeOpacity={0.8}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalConfirmBtn} 
                activeOpacity={0.8}
                onPress={handleConfirmRejection}
              >
                <Text style={styles.modalConfirmText}>Confirm Rejection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerTitleContainer: { alignItems: 'flex-start', justifyContent: 'center', width: '100%', paddingLeft: 0, marginLeft: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', width: '100%', paddingLeft: 0, marginLeft: 0, paddingHorizontal: 0 },
  headerTextContainer: { flex: 1, marginRight: 10, paddingLeft: 0, marginLeft: 0, alignItems: 'flex-start' },
  welcomeText: { fontSize: 11, fontWeight: '700', color: '#FED7AA', letterSpacing: 1.2, marginBottom: 2, textAlign: 'left', marginLeft: 0 },
  storeName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, textAlign: 'left', marginLeft: 0 },
  logoutButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  approvalBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginLeft: 0 },
  approvalBadgeText: { fontSize: 11, fontWeight: '700', textAlign: 'left' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20, marginTop: 4 },
  mainStat: { flex: 2, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  mainStatValue: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  mainStatLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  sideStats: { flex: 1, justifyContent: 'space-between' },
  smallStat: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  smallStatNum: { fontSize: 20, fontWeight: '800', color: '#C2410C', marginBottom: 2 },
  smallStatLabel: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12, marginTop: 4, textAlign: 'left', marginLeft: 0, paddingHorizontal: 0 },
  toolGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 0 },
  toolItem: { alignItems: 'center', width: '18%' },
  toolIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: '#FFEDD5' },
  toolText: { fontSize: 11, fontWeight: '600', color: '#334155', textAlign: 'center' },
  landmarkGroupContainer: { marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  landmarkGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', justifyContent: 'flex-start', paddingLeft: 0, marginLeft: 0 },
  landmarkGroupHeaderText: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'left' },
  batchGroupContainer: { marginLeft: 0, marginBottom: 12 },
  batchGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, justifyContent: 'flex-start', paddingLeft: 0, marginLeft: 0 },
  batchGroupHeaderText: { fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'left' },
  orderCard: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orderID: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  customerSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  iconActionBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  itemSummary: { backgroundColor: '#FFFFFF', padding: 8, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  summaryText: { fontSize: 12, color: '#334155', marginBottom: 2 },
  summaryQty: { fontWeight: '700', color: '#C2410C' },
  moreItemsText: { fontSize: 11, color: '#64748B', fontStyle: 'italic', marginTop: 2 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  orderTotalText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  rejectBtnGrad: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  rejectBtnText: { fontSize: 12, fontWeight: '700', color: '#B91C1C' },
  actionBtnGrad: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  emptyQueueContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 12, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  reasonInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 14, color: '#0F172A', height: 100, marginBottom: 20 },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F1F5F9' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  modalConfirmBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#DC2626' },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});