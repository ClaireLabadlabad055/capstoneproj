import React, { useState } from 'react';
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

// Mock Data - In a real app, this comes from Firebase/Database
const INITIAL_VENDORS = [
  { id: '1', name: 'Takoyaki Corner', category: 'Snacks', status: 'Active', orders: 154, joined: 'Jan 2026' },
  { id: '2', name: 'Siomai House', category: 'Fast Food', status: 'Pending', orders: 0, joined: 'Mar 2026' },
  { id: '3', name: 'Fruit Shake Hub', category: 'Beverages', status: 'Active', orders: 89, joined: 'Feb 2026' },
  { id: '4', name: 'Burger Station', category: 'Fast Food', status: 'Suspended', orders: 210, joined: 'Dec 2025' },
];

export default function ManageVendors() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [vendors, setVendors] = useState(INITIAL_VENDORS);

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    
    Alert.alert(
      "Update Status",
      `Are you sure you want to set this vendor to ${nextStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: () => {
            setVendors(prev => prev.map(v => 
              v.id === id ? { ...v, status: nextStatus } : v
            ));
          } 
        }
      ]
    );
  };

  const renderVendorCard = ({ item }: { item: typeof INITIAL_VENDORS[0] }) => (
    <View style={[styles.vendorCard, SHADOWS?.small]}>
      <View style={styles.cardHeader}>
        <View style={styles.infoGroup}>
          <Text style={styles.vendorName}>{item.name}</Text>
          <Text style={styles.categoryTag}>{item.category} • Joined {item.joined}</Text>
        </View>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'Active' ? '#DCFCE7' : item.status === 'Pending' ? '#FEF3C7' : '#FEE2E2' 
        }]}>
          <Text style={[styles.statusText, { 
            color: item.status === 'Active' ? '#15803D' : item.status === 'Pending' ? '#B45309' : '#B91C1C' 
          }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Lifetime Orders</Text>
          <Text style={styles.statValue}>{item.orders}</Text>
        </View>
        <View style={styles.actionGroup}>
         <TouchableOpacity 
            style={[styles.iconBtn, { backgroundColor: '#F1F5F9' }]}
            onPress={() => router.push({
            pathname: '/admin/vendor-details',
            params: { id: item.id, name: item.name } // Pass the vendor info
    })}
>
  <Feather name="eye" size={18} color="#64748B" />
</TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.iconBtn, { backgroundColor: item.status === 'Active' ? '#FFF1F1' : '#F0FDF4' }]}
            onPress={() => handleToggleStatus(item.id, item.status)}
          >
            <Feather 
              name={item.status === 'Active' ? "slash" : "check-circle"} 
              size={18} 
              color={item.status === 'Active' ? "#EF4444" : "#22C55E"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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