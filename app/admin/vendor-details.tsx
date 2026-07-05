import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform, 
  StatusBar,
  Dimensions // 1. Added Dimensions to imports
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../styles/globalStyles';

// 2. Added the width constant to fix the ReferenceError
const { width } = Dimensions.get('window'); 

export default function VendorDetails() {
  const router = useRouter();
  const { name } = useLocalSearchParams();

  // Data specifically for Takoyaki Corner or the selected vendor
  const storeData = {
    name: name || "Takoyaki Corner",
    owner: "Claire Dev",
    location: "Poblacion, Toledo City",
    joined: "January 15, 2026",
    contact: "+63 987 654 3210",
    hours: "10:00 AM - 8:00 PM",
    rating: "4.8",
    totalOrders: 154,
    revenue: "₱12,400"
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vendor Profile</Text>
            <TouchableOpacity style={styles.editBtn}>
              <Feather name="edit-3" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- HERO SECTION --- */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="storefront" size={40} color="#FFF" />
          </View>
          <Text style={styles.storeName}>{storeData.name}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active Vendor</Text>
          </View>
        </View>

        {/* --- STATS TILES (Where the error was happening) --- */}
        <View style={styles.statsRow}>
          <View style={[styles.statTile, SHADOWS?.small]}>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={styles.statValue}>{storeData.revenue}</Text>
          </View>
          <View style={[styles.statTile, SHADOWS?.small]}>
            <Text style={styles.statLabel}>Orders</Text>
            <Text style={styles.statValue}>{storeData.totalOrders}</Text>
          </View>
          <View style={[styles.statTile, SHADOWS?.small]}>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statValue}>⭐ {storeData.rating}</Text>
          </View>
        </View>

        {/* --- BUSINESS INFO --- */}
        <Text style={styles.sectionTitle}>Business Information</Text>
        <View style={[styles.infoCard, SHADOWS?.small]}>
          <DetailItem icon="user" label="Owner" value={storeData.owner} />
          <DetailItem icon="map-pin" label="Location" value={storeData.location} />
          <DetailItem icon="clock" label="Hours" value={storeData.hours} />
          <DetailItem icon="phone" label="Contact" value={storeData.contact} />
        </View>

        {/* --- ADMIN CONTROLS --- */}
        <Text style={styles.sectionTitle}>Controls</Text>
        <TouchableOpacity style={[styles.actionButton, SHADOWS?.small]}>
          <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
            <Feather name="list" size={20} color="#4F46E5" />
          </View>
          <Text style={styles.actionTitle}>View Inventory</Text>
          <Feather name="chevron-right" size={20} color="#CBD5E1" />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const DetailItem = ({ icon, label, value }: any) => (
  <View style={styles.detailItem}>
    <View style={styles.detailIconBg}>
      <Feather name={icon} size={16} color="#64748B" />
    </View>
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, 
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  backBtn: { padding: 5 },
  editBtn: { padding: 5 },

  scrollContent: { paddingBottom: 40 },

  heroSection: { 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    paddingVertical: 30, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40,
    elevation: 3
  },
  avatarContainer: { 
    width: 80, height: 80, borderRadius: 30, 
    backgroundColor: COLORS.primary, 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 15 
  },
  storeName: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  statusBadge: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#DCFCE7', 
    paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 20, marginTop: 10 
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 8 },
  statusText: { color: '#15803D', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: -25 },
  statTile: { 
    width: (width - 60) / 3, // Now width is defined!
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 20, 
    alignItems: 'center' 
  },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 },
  statValue: { fontSize: 15, fontWeight: '900', color: '#1E293B' },

  sectionTitle: { 
    fontSize: 13, fontWeight: '900', color: '#64748B', 
    textTransform: 'uppercase', marginLeft: 25, 
    marginTop: 30, marginBottom: 15, letterSpacing: 1 
  },
  infoCard: { backgroundColor: '#FFF', marginHorizontal: 20, borderRadius: 28, padding: 20 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  detailIconBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  detailLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  detailValue: { fontSize: 15, color: '#1E293B', fontWeight: '800' },

  actionButton: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#FFF', marginHorizontal: 20, 
    padding: 18, borderRadius: 24, gap: 15 
  },
  actionIcon: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#1E293B' },
});