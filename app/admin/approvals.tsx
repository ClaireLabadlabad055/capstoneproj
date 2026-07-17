import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  StatusBar, 
  Platform,
  Alert,
} from 'react-native';
import storage from '../../lib/storage';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS } from '../../styles/globalStyles';
import { supabase } from '../../lib/supabaseClient';

const isMissingColumnError = (error: any) => {
  const message = error?.message || '';
  return message.includes('Could not find the') || message.includes('column') || message.includes('schema cache');
};

const updateApprovalRecord = async (id: string, nextStatus: string) => {
  const { error: rpcError } = await supabase.rpc('set_approval_status', { p_target_id: id, p_next_status: nextStatus });
  if (!rpcError) return;

  if (rpcError?.message?.includes('does not exist') || rpcError?.code === '42883') {
    console.warn('Approval RPC is not available yet; falling back to direct updates.');
  } else {
    throw rpcError;
  }

  const normalizedStatus = nextStatus === 'Active' ? 'approved' : nextStatus === 'Rejected' ? 'rejected' : 'pending';
  const displayStatus = nextStatus === 'Active' ? 'Active' : nextStatus === 'Rejected' ? 'Rejected' : 'Pending';

  const tableTargets = [
    { table: 'merchants', payloads: [{ status: displayStatus, approval_status: normalizedStatus }, { status: displayStatus }, { approval_status: normalizedStatus }] },
    { table: 'customers', payloads: [{ status: displayStatus, approval_status: normalizedStatus }, { status: displayStatus }, { approval_status: normalizedStatus }] },
    { table: 'profiles', payloads: [{ status: displayStatus, approval_status: normalizedStatus }, { status: displayStatus }, { approval_status: normalizedStatus }] },
  ];

  let lastError: any = null;
  for (const target of tableTargets) {
    for (const payload of target.payloads) {
      const { error } = await supabase.from(target.table).upsert([{ id, ...payload }], { onConflict: 'id' });
      if (!error) break;
      lastError = error;
      if (!isMissingColumnError(error)) {
        throw error;
      }
    }
  }

  if (lastError) {
    console.warn(`Unable to persist approval status for ${id}:`, lastError?.message || 'unknown error');
    throw lastError;
  }
};

export default function AdminApprovals() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'merchant' | 'customer'>('merchant');
  const [merchantApplications, setMerchantApplications] = useState<any[]>([]);
  const [customerApplications, setCustomerApplications] = useState<any[]>([]);

  const loadApplications = async () => {
    try {
      const [merchantResult, customerResult] = await Promise.all([
        supabase.from('merchants').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
      ]);

      const merchantRows = (merchantResult.data || []).filter((item: any) => isPendingApprovalItem(item));
      const customerRows = (customerResult.data || []).filter((item: any) => isPendingApprovalItem(item));

      setMerchantApplications(merchantRows.map((item: any) => ({
          id: item.id,
          name: item.business_name || 'Unnamed Kitchen',
          owner: item.business_name || 'Pending owner',
          category: item.delicacy_type || 'Home Kitchen',
          appliedDate: formatAppliedDate(item.created_at),
          documentUrl: item.verification_doc_url || null,
          type: 'merchant',
          raw: item,
        })));

        setCustomerApplications(customerRows.map((item: any) => ({
          id: item.id,
          name: item.full_name || 'Pending Customer',
          owner: item.full_name || 'Pending Customer',
          category: 'Customer Account Verification',
          appliedDate: formatAppliedDate(item.created_at),
          documentUrl: null,
          type: 'customer',
          raw: item,
        })));
    } catch (error: any) {
      console.error('Failed to load approvals', error);
      const message = error?.message || '';
      if (message.includes('column') || message.includes('schema cache') || message.includes('Could not find the')) {
        Alert.alert('Database setup needed', 'The approval columns are missing in Supabase. Please run the SQL migration first, then refresh the approvals page.');
      } else {
        Alert.alert('Unable to load approvals', message || 'Please try again.');
      }
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const isPendingApprovalItem = (item: any) => {
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
  };

  const formatAppliedDate = (value: string | null | undefined) => {
    if (!value) return 'Recently submitted';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently submitted';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleAction = async (
    id: string,
    itemName: string,
    itemType: 'merchant' | 'customer',
    action: 'Approve' | 'Reject'
  ) => {
    Alert.alert(
      `${action} Application`,
      `Are you sure you want to ${action.toLowerCase()} ${itemName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: action === 'Reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const nextStatus = action === 'Approve' ? 'Active' : 'Rejected';

              await updateApprovalRecord(id, nextStatus);

              setMerchantApplications(prev => prev.filter(app => app.id !== id));
              setCustomerApplications(prev => prev.filter(app => app.id !== id));
              try {
                await storage.setItem('approval_sync_flag', JSON.stringify({ timestamp: Date.now(), delta: 1 }));
              } catch (storageError) {
                console.warn('Failed to persist approval sync flag:', storageError);
              }
              Alert.alert('Success', `${itemName} has been ${action === 'Approve' ? 'approved' : 'rejected'}.`);
            } catch (error: any) {
              console.error('Approval update failed', error);
              Alert.alert('Update Failed', error.message || 'Unable to update the approval status.');
            }
          },
        },
      ]
    );
  };

  const ApprovalCard = ({ item, onAction }: { item: any; onAction: any }) => {
    return (
      <View style={[styles.approvalCard, SHADOWS?.small]}>
          <View style={styles.cardHeader}>
            <View style={[styles.storeIcon, item.type === 'customer' && styles.customerIcon]}>
              <MaterialCommunityIcons name={item.type === 'merchant' ? 'store-plus' : 'account-circle'} size={24} color={COLORS.primary} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.storeName}>{item.name}</Text>
              <Text style={styles.ownerText}>Owner: {item.owner}</Text>
            </View>
          </View>

          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Feather name="tag" size={14} color="#64748B" />
              <Text style={styles.detailText}>{item.category}</Text>
            </View>
            <View style={styles.detailRow}>
              <Feather name="calendar" size={14} color="#64748B" />
              <Text style={styles.detailText}>Applied on {item.appliedDate}</Text>
            </View>
            <TouchableOpacity style={styles.docBtn}>
              <Feather name="file-text" size={14} color={COLORS.primary} />
              <Text style={styles.docText}>{item.type === 'merchant' ? 'View Business Permit' : 'View ID Document'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.btn, styles.rejectBtn]} 
              onPress={() => onAction(item.id, item.name, item.type, 'Reject')}
            >
              <Feather name="x" size={18} color="#EF4444" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, styles.approveBtn]} 
              onPress={() => onAction(item.id, item.name, item.type, 'Approve')}
            >
              <Feather name="check" size={18} color="#FFF" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
    );
  };

  const renderApprovalCard = ({ item }: { item: any }) => (
    <ApprovalCard item={item} onAction={handleAction} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Approvals</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{selectedTab === 'merchant' ? merchantApplications.length : customerApplications.length}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'merchant' && styles.activeTabButton]}
          onPress={() => setSelectedTab('merchant')}
        >
          <Text style={[styles.tabText, selectedTab === 'merchant' && styles.activeTabText]}>Merchant Approvals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'customer' && styles.activeTabButton]}
          onPress={() => setSelectedTab('customer')}
        >
          <Text style={[styles.tabText, selectedTab === 'customer' && styles.activeTabText]}>Customer Approvals</Text>
        </TouchableOpacity>
      </View>

      <FlatList 
        data={selectedTab === 'merchant' ? merchantApplications : customerApplications}
        keyExtractor={(item) => item.id}
        renderItem={renderApprovalCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.checkCircle}>
              <Feather name="check" size={40} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySub}>There are no pending approvals to review.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: { padding: 8, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', flex: 1 },
  countBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

  listContent: { padding: 20 },
  approvalCard: { backgroundColor: '#FFF', borderRadius: 28, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  storeIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  headerInfo: { flex: 1 },
  storeName: { fontSize: 17, fontWeight: '900', color: '#1E293B' },
  ownerText: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },

  detailsBox: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 15, gap: 10, marginBottom: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  docBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, paddingVertical: 5 },
  docText: { fontSize: 13, color: COLORS.primary, fontWeight: '800', textDecorationLine: 'underline' },

  actionRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, height: 50, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  rejectBtn: { backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FEE2E2' },
  approveBtn: { backgroundColor: COLORS.secondary },
  rejectBtnText: { color: '#EF4444', fontWeight: '800', fontSize: 14 },
  approveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  tabRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 15, backgroundColor: '#F8FAFC', alignItems: 'center', marginHorizontal: 5 },
  activeTabButton: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  activeTabText: { color: '#FFFFFF' },
  customerIcon: { backgroundColor: '#FEF3C7' },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 }
});