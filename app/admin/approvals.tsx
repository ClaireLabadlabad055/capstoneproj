import React, { useState } from 'react';
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
  Image
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS } from '../../styles/globalStyles';

// Mock Data for Pending Applications
const PENDING_APPLICATIONS = [
  { 
    id: 'app1', 
    storeName: 'Lechon Master', 
    owner: 'Juan Dela Cruz', 
    category: 'Filipino Cuisine', 
    appliedDate: 'April 02, 2026',
    documentUrl: 'business_permit_001.pdf'
  },
  { 
    id: 'app2', 
    storeName: 'Toledo Brews', 
    owner: 'Maria Clara', 
    category: 'Coffee & Pastries', 
    appliedDate: 'April 01, 2026',
    documentUrl: 'business_permit_002.pdf'
  },
];

export default function VendorApprovals() {
  const router = useRouter();
  const [applications, setApplications] = useState(PENDING_APPLICATIONS);

  const handleAction = (id: string, storeName: string, action: 'Approve' | 'Reject') => {
    Alert.alert(
      `${action} Application`,
      `Are you sure you want to ${action.toLowerCase()} ${storeName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: action, 
          style: action === 'Reject' ? 'destructive' : 'default',
          onPress: () => {
            // Filter out the handled application
            setApplications(prev => prev.filter(app => app.id !== id));
            Alert.alert("Success", `${storeName} has been ${action === 'Approve' ? 'approved' : 'rejected'}.`);
          } 
        }
      ]
    );
  };

  const renderApprovalCard = ({ item }: { item: typeof PENDING_APPLICATIONS[0] }) => (
    <View style={[styles.approvalCard, SHADOWS?.small]}>
      <View style={styles.cardHeader}>
        <View style={styles.storeIcon}>
          <MaterialCommunityIcons name="store-plus" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.storeName}>{item.storeName}</Text>
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
          <Text style={styles.docText}>View Business Permit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.btn, styles.rejectBtn]} 
          onPress={() => handleAction(item.id, item.storeName, 'Reject')}
        >
          <Feather name="x" size={18} color="#EF4444" />
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, styles.approveBtn]} 
          onPress={() => handleAction(item.id, item.storeName, 'Approve')}
        >
          <Feather name="check" size={18} color="#FFF" />
          <Text style={styles.approveBtnText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
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
          <Text style={styles.countText}>{applications.length}</Text>
        </View>
      </View>

      <FlatList 
        data={applications}
        keyExtractor={(item) => item.id}
        renderItem={renderApprovalCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.checkCircle}>
              <Feather name="check" size={40} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySub}>There are no pending vendor applications to review.</Text>
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
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 }
});