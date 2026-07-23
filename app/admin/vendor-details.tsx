import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import GradientHeader from '../_components/GradientHeader';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window'); 

export default function VendorDetails() {
  const router = useRouter();
  const { name } = useLocalSearchParams();

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
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
            <Feather name="edit-3" size={18} color="#C2410C" />
          </TouchableOpacity>
        }
      >
        <Text style={styles.headerTitle}>Vendor Profile</Text>
      </GradientHeader>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- HERO SECTION --- */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="storefront" size={38} color="#C2410C" />
          </View>
          <Text style={styles.storeName} numberOfLines={1}>{storeData.name}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active Vendor</Text>
          </View>
        </View>

        {/* --- STATS TILES --- */}
        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={styles.statValue} numberOfLines={1}>{storeData.revenue}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Orders</Text>
            <Text style={styles.statValue}>{storeData.totalOrders}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statValue}>⭐ {storeData.rating}</Text>
          </View>
        </View>

        {/* --- BUSINESS INFO --- */}
        <Text style={styles.sectionTitle}>Business Information</Text>
        <View style={styles.infoCard}>
          <DetailItem icon="user" label="Owner" value={storeData.owner} />
          <DetailItem icon="map-pin" label="Location" value={storeData.location} />
          <DetailItem icon="clock" label="Hours" value={storeData.hours} />
          <DetailItem icon="phone" label="Contact" value={storeData.contact} />
        </View>

        {/* --- ADMIN CONTROLS --- */}
        <Text style={styles.sectionTitle}>Controls</Text>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
          <View style={styles.actionIcon}>
            <Feather name="list" size={18} color="#C2410C" />
          </View>
          <Text style={styles.actionTitle}>View Inventory</Text>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const DetailItem = ({ icon, label, value }: any) => (
  <View style={styles.detailItem}>
    <View style={styles.detailIconBg}>
      <Feather name={icon} size={15} color="#C2410C" />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  backBtn: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', marginRight: 10 },
  editBtn: { backgroundColor: '#FFEDD5', padding: 9, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },

  scrollContent: { paddingBottom: 100 },

  heroSection: { 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    paddingVertical: 28, 
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28, 
    borderBottomRightRadius: 28,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderTopWidth: 0,
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: { 
    width: 72, 
    height: 72, 
    borderRadius: 22, 
    backgroundColor: '#FFEDD5', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA'
  },
  storeName: { fontSize: 20, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3, textAlign: 'center' },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#DCFCE7', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12, 
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981', marginRight: 8 },
  statusText: { color: '#15803D', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },

  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    marginTop: -20,
    gap: 10
  },
  statTile: { 
    width: (width - 50) / 3, 
    backgroundColor: '#FFF', 
    paddingVertical: 16,
    paddingHorizontal: 10, 
    borderRadius: 18, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.3 },
  statValue: { fontSize: 13, fontWeight: '900', color: '#1E293B', textAlign: 'center' },

  sectionTitle: { 
    fontSize: 12, 
    fontWeight: '900', 
    color: '#64748B', 
    textTransform: 'uppercase', 
    marginHorizontal: 22, 
    marginTop: 24, 
    marginBottom: 12, 
    letterSpacing: 0.5 
  },
  infoCard: { 
    backgroundColor: '#FFF', 
    marginHorizontal: 20, 
    borderRadius: 20, 
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  detailIconBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: '#FED7AA' },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  detailValue: { fontSize: 14, color: '#1E293B', fontWeight: '900', marginTop: 1 },

  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    marginHorizontal: 20, 
    padding: 16, 
    borderRadius: 20, 
    gap: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' },
  actionTitle: { flex: 1, fontSize: 14, fontWeight: '900', color: '#1E293B', letterSpacing: -0.2 },
});