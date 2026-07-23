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
  Alert 
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GradientHeader from '../_components/GradientHeader';
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
      <View style={styles.vendorCard}>
        <View style={styles.cardHeader}>
          <View style={styles.infoGroup}>
            <Text style={styles.vendorName} numberOfLines={1}>{name}</Text>
            <Text style={styles.categoryTag} numberOfLines={1}>{category} • Joined {joined}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: status === 'Active' ? '#DCFCE7' : status === 'Pending' ? '#FEF3C7' : '#FEE2E2',
            borderColor: status === 'Active' ? '#BBF7D0' : status === 'Pending' ? '#FDE68A' : '#FECACA'
          }]}> 
            <Text style={[styles.statusText, { 
              color: status === 'Active' ? '#15803D' : status === 'Pending' ? '#B45309' : '#B91C1C' 
            }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pickup</Text>
            <Text style={styles.statValue} numberOfLines={1}>{item.pickup_landmark || 'No pickup info'}</Text>
          </View>
          <View style={styles.actionGroup}>
            <TouchableOpacity 
              style={styles.iconBtn}
              onPress={() => router.push({
                pathname: '/admin/vendor-details',
                params: { id: item.id, name }
              })}
              activeOpacity={0.8}
            >
              <Feather name="eye" size={16} color="#C2410C" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: status === 'Active' ? '#FEF2F2' : '#F0FDF4', borderColor: status === 'Active' ? '#FECACA' : '#BBF7D0' }]}
              onPress={() => handleToggleStatus(item.id, status)}
              activeOpacity={0.8}
            >
              <Feather 
                name={status === 'Active' ? "slash" : "check-circle"} 
                size={16} 
                color={status === 'Active' ? "#EF4444" : "#16A34A"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C2410C" />
      
      {/* Header */}
      <GradientHeader
        colors={['#C2410C', '#9A3412', '#7C2D12']}
        titleContainerStyle={{ alignItems: 'flex-start', justifyContent: 'center' }}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color="#C2410C" />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
            <Feather name="plus" size={18} color="#C2410C" />
          </TouchableOpacity>
        }
      >
        <Text style={styles.headerTitle}>Manage Vendors</Text>
      </GradientHeader>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={16} color="#94A3B8" style={styles.searchIcon} />
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
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderVendorCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.checkCircle}>
              <MaterialCommunityIcons name="store-off-outline" size={36} color="#C2410C" />
            </View>
            <Text style={styles.emptyTitle}>No vendors found</Text>
            <Text style={styles.emptySub}>Vendors registered in the application will show up here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  backBtn: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', marginRight: 10 },
  addBtn: { backgroundColor: '#FFEDD5', padding: 9, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },

  searchContainer: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  searchWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, color: '#1E293B', fontWeight: '700' },

  listContent: { padding: 20, paddingBottom: 100 },
  vendorCard: { 
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoGroup: { flex: 1, marginRight: 10 },
  vendorName: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  categoryTag: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 3 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },

  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 14, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F8FAFC' 
  },
  statItem: { flex: 1, marginRight: 10 },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 13, fontWeight: '900', color: '#1E293B', marginTop: 2 },

  actionGroup: { flexDirection: 'row', gap: 8 },
  iconBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 12, 
    backgroundColor: '#FFEDD5', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA'
  },

  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  checkCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FED7AA' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center', letterSpacing: -0.3 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18, fontWeight: '600' }
});