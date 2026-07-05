import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; 
import { useRouter, Stack } from 'expo-router'; 
import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext'; 

const { width } = Dimensions.get('window');
const BRAND_BROWN = '#4A2C2A'; 

export default function VendorReports() {
  const router = useRouter();
  const { orders } = useCart(); 

  // Data Logic
  const completedOrders = useMemo(() => 
    (orders || []).filter(o => o.status === 'Completed'), 
  [orders]);

  // NEW: Calculate Total Units Sold (sum of all quantities)
  const totalUnitsSold = useMemo(() => {
    return completedOrders.reduce((sum, order) => sum + (order.quantity || 1), 0);
  }, [completedOrders]);

  const totalRevenue = useMemo(() => {
    return completedOrders.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  }, [completedOrders]);

  const topSellingItems = useMemo(() => {
    const counts = {};
    completedOrders.forEach(order => {
      const name = order.itemName || 'Local Delicacy';
      // Use quantity if available, otherwise default to 1
      counts[name] = (counts[name] || 0) + (order.quantity || 1);
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [completedOrders]);

  const avgTicket = completedOrders.length > 0 ? (totalRevenue / completedOrders.length).toFixed(0) : 0;
  
  // SUGGESTION: Daily Goal Logic (Set a target of ₱5,000 for the project demo)
  const dailyGoal = 5000;
  const progress = Math.min(totalRevenue / dailyGoal, 1);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* --- CUSTOM SAFE HEADER --- */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Insights</Text>
          <TouchableOpacity style={styles.exportBtn}>
            <Feather name="share-2" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- REVENUE CARD --- */}
        <View style={styles.mainRevenueCard}>
          <View style={styles.revenueHeader}>
            <View>
                <Text style={styles.cardLabel}>Total Earnings</Text>
                <Text style={styles.revenueValue}>₱{totalRevenue.toLocaleString()}</Text>
            </View>
            <View style={styles.incomeBadge}>
                <Feather name="trending-up" size={14} color="#4ADE80" />
                <Text style={styles.incomeBadgeText}>+12%</Text>
            </View>
          </View>

          {/* NEW: Daily Goal Progress Bar */}
          <View style={styles.goalContainer}>
            <View style={styles.goalTextRow}>
                <Text style={styles.goalLabel}>Daily Goal Progress</Text>
                <Text style={styles.goalLabel}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statSmallLabel}>Orders</Text>
              <Text style={styles.statSmallValue}>{completedOrders.length}</Text>
            </View>
            <View style={[styles.statItem, styles.sideBorder]}>
              <Text style={styles.statSmallLabel}>Units Sold</Text>
              <Text style={styles.statSmallValue}>{totalUnitsSold}</Text>
            </View>
            <View style={[styles.statItem, styles.sideBorder]}>
              <Text style={styles.statSmallLabel}>Avg. Ticket</Text>
              <Text style={styles.statSmallValue}>₱{avgTicket}</Text>
            </View>
          </View>
        </View>

        {/* --- BEST SELLERS --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Selling Items</Text>
          <TouchableOpacity>
             <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bestSellersCard}>
          {topSellingItems.length > 0 ? (
            topSellingItems.map((item, index) => (
              <View key={index} style={[styles.productRow, index === 0 && { borderTopWidth: 0 }]}>
                <View style={styles.productInfo}>
                  <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#FFD700' : '#F0F0F0' }]}>
                    <Text style={[styles.rankText, { color: index === 0 ? BRAND_BROWN : '#888' }]}>
                        {index === 0 ? '🏆' : index + 1}
                    </Text>
                  </View>
                  <Text style={styles.productName}>{item.name}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.productCount}>{item.count} Sold</Text>
                    <Text style={styles.growthText}>Demand: High</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No sales data yet.</Text>
            </View>
          )}
        </View>

        {/* --- DYNAMIC TIP CARD --- */}
        <View style={styles.tipCard}>
          <View style={styles.tipIconBg}>
             <MaterialCommunityIcons name="flash" size={20} color="#F59E0B" />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.tipTitle}>ToledoGo Smart Suggestion</Text>
            <Text style={styles.tipText}>
                Your <Text style={{fontWeight: '700'}}>Units Sold</Text> are peaking between 4PM - 6PM. Consider offering a "Merienda Bundle" to increase your Avg. Ticket!
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFB' },
  headerWrapper: {
    backgroundColor: BRAND_BROWN,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 20,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  exportBtn: { padding: 8 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  // REVENUE CARD STYLES
  mainRevenueCard: { 
    backgroundColor: BRAND_BROWN, 
    borderRadius: 30, 
    padding: 25, 
    marginTop: 20,
    elevation: 8,
    shadowColor: BRAND_BROWN,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 }
  },
  revenueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  revenueValue: { color: '#FFF', fontSize: 38, fontWeight: '900', marginTop: 5 },
  incomeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74, 222, 128, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  incomeBadgeText: { color: '#4ADE80', fontSize: 12, fontWeight: '700' },
  
  // PROGRESS BAR
  goalContainer: { marginTop: 20 },
  goalTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 3 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  sideBorder: { borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statSmallLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' },
  statSmallValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },

  // SECTION STYLES
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 15 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  seeAllText: { color: BRAND_BROWN, fontSize: 13, fontWeight: '700' },
  
  bestSellersCard: { backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  productInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 12, fontWeight: '900' },
  productName: { fontSize: 14, fontWeight: '700', color: '#333' },
  productCount: { fontSize: 14, fontWeight: '800', color: BRAND_BROWN },
  growthText: { fontSize: 10, color: '#4ADE80', fontWeight: '600', marginTop: 2 },

  // TIP CARD
  tipCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 22, flexDirection: 'row', gap: 15, marginTop: 25, alignItems: 'flex-start', borderWidth: 1, borderColor: '#F0F0F0' },
  tipIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center' },
  tipTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  tipText: { fontSize: 12, color: '#666', lineHeight: 18 },

  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#CCC', fontStyle: 'italic', fontSize: 14 }
});