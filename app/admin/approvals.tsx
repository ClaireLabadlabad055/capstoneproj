import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  StatusBar, 
  Alert,
} from 'react-native';
import storage from '../../lib/storage';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GradientHeader from '../_components/GradientHeader';
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
      <View style={styles.approvalCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.storeIcon, item.type === 'customer' && styles.customerIcon]}>
              <MaterialCommunityIcons name={item.type === 'merchant' ? 'store-plus' : 'account-circle'} size={22} color="#C2410C" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.storeName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.ownerText} numberOfLines={1}>Owner: {item.owner}</Text>
            </View>
          </View>

          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Feather name="tag" size={13} color="#94A3B8" />
              <Text style={styles.detailText}>{item.category}</Text>
            </View>
            <View style={styles.detailRow}>
              <Feather name="calendar" size={13} color="#94A3B8" />
              <Text style={styles.detailText}>Applied on {item.appliedDate}</Text>
            </View>
            <TouchableOpacity style={styles.docBtn} activeOpacity={0.7}>
              <Feather name="file-text" size={13} color="#C2410C" />
              <Text style={styles.docText}>{item.type === 'merchant' ? 'View Business Permit' : 'View ID Document'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.btn, styles.rejectBtn]} 
              onPress={() => onAction(item.id, item.name, item.type, 'Reject')}
              activeOpacity={0.8}
            >
              <Feather name="x" size={16} color="#EF4444" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, styles.approveBtn]} 
              onPress={() => onAction(item.id, item.name, item.type, 'Approve')}
              activeOpacity={0.8}
            >
              <Feather name="check" size={16} color="#FFF" />
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
      <StatusBar barStyle="light-content" backgroundColor="#C2410C" />
      
      <GradientHeader
        colors={['#C2410C', '#9A3412', '#7C2D12']}
        titleContainerStyle={{ alignItems: 'flex-start', justifyContent: 'center' }}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color="#C2410C" />
          </TouchableOpacity>
        }
        rightAction={
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{selectedTab === 'merchant' ? merchantApplications.length : customerApplications.length}</Text>
          </View>
        }
      >
        <Text style={styles.headerTitle}>Pending Approvals</Text>
      </GradientHeader>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'merchant' && styles.activeTabButton]}
          onPress={() => setSelectedTab('merchant')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, selectedTab === 'merchant' && styles.activeTabText]}>Merchant Approvals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'customer' && styles.activeTabButton]}
          onPress={() => setSelectedTab('customer')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, selectedTab === 'customer' && styles.activeTabText]}>Customer Approvals</Text>
        </TouchableOpacity>
      </View>

      <FlatList 
        data={selectedTab === 'merchant' ? merchantApplications : customerApplications}
        keyExtractor={(item) => item.id}
        renderItem={renderApprovalCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.checkCircle}>
              <Feather name="check" size={36} color="#15803D" />
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
  backBtn: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  countBadge: { backgroundColor: '#FFEDD5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA' },
  countText: { fontSize: 12, fontWeight: '900', color: '#C2410C' },

  listContent: { padding: 20, paddingBottom: 100 },
  approvalCard: { 
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  storeIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  headerInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  ownerText: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 2 },

  detailsBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, gap: 8, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 12, color: '#475569', fontWeight: '700' },
  docBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, paddingVertical: 2 },
  docText: { fontSize: 12, color: '#C2410C', fontWeight: '900', textDecorationLine: 'underline' },

  actionRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 44, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  rejectBtn: { backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FEE2E2' },
  approveBtn: { backgroundColor: '#C2410C' },
  rejectBtnText: { color: '#EF4444', fontWeight: '900', fontSize: 13 },
  approveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 13 },

  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  tabRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F8FAFC', alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  activeTabButton: { backgroundColor: '#C2410C', borderColor: '#C2410C' },
  tabText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  activeTabText: { color: '#FFFFFF' },
  customerIcon: { backgroundColor: '#FEF3C7' },
  checkCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18, fontWeight: '600' }
});