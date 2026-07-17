import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  SafeAreaView, 
  StatusBar, 
  Platform,
  Alert 
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS } from '../../styles/globalStyles';
import { supabase } from '../../lib/supabaseClient';

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

export default function ManageVendors() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .order('created_at', { ascending: false });

        if (merchantError) throw merchantError;

        const mergedVendors = (merchantData || []).map((item: any) => ({
          ...item,
          approval_status: item.approval_status || '',
          status: item.status || item.approval_status || '',
        }));

        setVendors(mergedVendors);
      } catch (error) {
        console.error('Failed to fetch merchants:', error);
        Alert.alert('Error', 'Unable to load vendor list.');
      }
    };
    fetchVendors();
  }, []);

  const filteredVendors = vendors.filter(v => 
    (v.business_name || v.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    const normalizedStatus = nextStatus === 'Active' ? 'Active' : 'Rejected';

    Alert.alert(
      "Update Status",
      `Are you sure you want to set this vendor to ${nextStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('merchants')
                .update({ status: normalizedStatus, approval_status: normalizedStatus === 'Active' ? 'approved' : 'rejected' })
                .eq('id', id);

              if (error) throw error;

              setVendors(prev => prev.map(v =>
                v.id === id ? { ...v, status: normalizedStatus, approval_status: normalizedStatus === 'Active' ? 'approved' : 'rejected' } : v
              ));

              Alert.alert('Success', 'Vendor status updated.');
            } catch (error: any) {
              console.error('Failed to update vendor status:', error);
              Alert.alert('Update Failed', error.message || 'Unable to update vendor status.');
            }
          }
        }
      ]
    );
  };

const renderVendorCard = ({ item }: { item: any }) => {
    const name = item.business_name || item.full_name || 'Unnamed Vendor';
    const status = getVendorStatus(item);
    const category = item.delicacy_type || item.category || 'No category';
    const joined = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown';

    return (
      <View style={[styles.vendorCard, SHADOWS?.small]}>
        <View style={styles.cardHeader}>
          <View style={styles.infoGroup}>
            <Text style={styles.vendorName}>{name}</Text>
            <Text style={styles.categoryTag}>{category} • Joined {joined}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: status === 'Active' ? '#DCFCE7' : status === 'Pending' ? '#FEF3C7' : '#FEE2E2' 
          }]}> 
            <Text style={[styles.statusText, { 
              color: status === 'Active' ? '#15803D' : status === 'Pending' ? '#B45309' : '#B91C1C' 
            }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pickup</Text>
            <Text style={styles.statValue}>{item.pickup_landmark || 'No pickup info'}</Text>
          </View>
          <View style={styles.actionGroup}>
           <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: '#F1F5F9' }]}
              onPress={() => router.push({
                pathname: '/admin/vendor-details',
                params: { id: item.id, name }
              })}
            >
              <Feather name="eye" size={18} color="#64748B" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: status === 'Active' ? '#FFF1F1' : '#F0FDF4' }]}
              onPress={() => handleToggleStatus(item.id, status)}
            >
              <Feather 
                name={status === 'Active' ? "slash" : "check-circle"} 
                size={18} 
                color={status === 'Active' ? "#EF4444" : "#22C55E"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Vendors</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Feather name="plus" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by store name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      {/* Vendor List */}
      <FlatList 
        data={filteredVendors}
        keyExtractor={(item) => item.id}
        renderItem={renderVendorCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="store-off-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>No vendors found</Text>
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
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  backBtn: { padding: 8 },
  addBtn: { padding: 8 },

  searchContainer: { padding: 20, backgroundColor: '#FFF' },
  searchWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 15, 
    paddingHorizontal: 15 
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 15, color: '#1E293B', fontWeight: '600' },

  listContent: { padding: 20 },
  vendorCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoGroup: { flex: 1 },
  vendorName: { fontSize: 17, fontWeight: '900', color: '#1E293B' },
  categoryTag: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 4 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 20, 
    paddingTop: 15, 
    borderTopWidth: 1, 
    borderTopColor: '#F8FAFC' 
  },
  statItem: { flexDirection: 'column' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginTop: 2 },

  actionGroup: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#94A3B8', fontWeight: '600', marginTop: 10 }
});