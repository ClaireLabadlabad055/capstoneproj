import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  SafeAreaView, 
  Dimensions, 
  Platform 
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS } from '../../styles/globalStyles';

// Get device width for responsive grid
const { width } = Dimensions.get('window');

const PLATFORM_STATS = [
  { 
    id: '1', 
    label: 'Total Sales', 
    value: '₱142,500', 
    icon: 'currency-php', 
    color: '#4F46E5' 
  },
  { 
    id: '2', 
    label: 'Active Vendors', 
    value: '12', 
    icon: 'storefront-outline', 
    color: '#059669' 
  },
  { 
    id: '3', 
    label: 'Total Orders', 
    value: '842', 
    icon: 'shopping-outline', 
    color: '#D97706' 
  },
  { 
    id: '4', 
    label: 'New Users', 
    value: '156', 
    icon: 'account-plus-outline', 
    color: '#7C3AED' 
  },
];

const RECENT_VENDORS = [
  { id: 'v1', name: 'Takoyaki Corner', status: 'Active', sales: '₱12,400', rating: 4.8 },
  { id: 'v2', name: 'Siomai House', status: 'Pending', sales: '₱0', rating: 0 },
  { id: 'v3', name: 'Fruit Shake Hub', status: 'Active', sales: '₱8,200', rating: 4.5 },
];

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* --- HEADER SECTION --- */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.adminTag}>System Administrator</Text>
              <Text style={styles.welcomeText}>Platform Overview</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* --- KPI STATS GRID --- */}
        <View style={styles.statsGrid}>
          {PLATFORM_STATS.map((stat) => (
            <View key={stat.id} style={[styles.statCard, SHADOWS?.small]}>
              <View style={[styles.iconCircle, { backgroundColor: stat.color + '15' }]}>
                <MaterialCommunityIcons name={stat.icon as any} size={22} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* --- QUICK ACTIONS --- */}
        <Text style={styles.sectionTitle}>System Control</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionCard, SHADOWS?.small]} 
            onPress={() => router.push('/admin/vendor')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Feather name="users" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.actionText}>Manage Vendors</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, SHADOWS?.small]} 
            onPress={() => router.push('/admin/approvals')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Feather name="check-square" size={24} color="#D97706" />
            </View>
            <Text style={styles.actionText}>Approvals</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
          </TouchableOpacity>
        </View>

        {/* --- VENDOR PERFORMANCE LIST --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Performing Vendors</Text>
          <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
        </View>

        {RECENT_VENDORS.map((vendor) => (
          <TouchableOpacity 
            key={vendor.id} 
            style={styles.vendorItem}
            // NAVIGATE TO DETAILS
            onPress={() => router.push({
              pathname: '/admin/vendor-details',
              params: { id: vendor.id, name: vendor.name }
            })}
          >
            <View style={styles.vendorInfo}>
              <View style={styles.vendorAvatar}>
                <Text style={styles.avatarText}>{vendor.name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.vendorNameText}>{vendor.name}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: vendor.status === 'Active' ? '#10B981' : '#F59E0B' }]} />
                  <Text style={styles.statusText}>{vendor.status}</Text>
                </View>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.vendorSales}>{vendor.sales}</Text>
              <Text style={styles.vendorRating}>⭐ {vendor.rating}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, 
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  headerContent: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingVertical: 20,
  },
  adminTag: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: COLORS.primary, 
    textTransform: 'uppercase', 
    letterSpacing: 1.2,
    marginBottom: 2
  },
  welcomeText: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  logoutBtn: { padding: 12, backgroundColor: '#FFF1F1', borderRadius: 14 },
  scrollContent: { padding: 20, paddingTop: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { 
    backgroundColor: '#FFF', 
    width: (width - 55) / 2, // Uses the width constant correctly
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 15,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 },
  viewAll: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 15, marginBottom: 35 },
  actionCard: { flex: 1, backgroundColor: '#FFF', padding: 22, borderRadius: 28, alignItems: 'center' },
  actionIcon: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionText: { fontSize: 13, fontWeight: '900', color: '#334155' },
  badge: { position: 'absolute', top: 18, right: 18, backgroundColor: '#EF4444', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  vendorItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 18, 
    borderRadius: 22, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  vendorInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vendorAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  vendorNameText: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  vendorSales: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  vendorRating: { fontSize: 12, color: '#64748B', marginTop: 3 }
});