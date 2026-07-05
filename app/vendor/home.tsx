import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, Platform, Image, LayoutAnimation, UIManager } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS } from '../../styles/globalStyles'; 
import { useCart } from '../../context/CartContext'; 

// Enable LayoutAnimation for smooth expanding/collapsing on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- COLLAPSIBLE CARD COMPONENT (No changes here) ---
const CollapsibleOrderCard = ({ order, onStatusChange }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleLongPressContact = () => {
    Alert.alert(
      "Contact Customer",
      `Would you like to call ${order.customerName || 'the customer'}?`,
      [{ text: "Cancel", style: "cancel" }, { text: "Call", onPress: () => console.log("Calling...") }]
    );
  };

  return (
    <View style={[styles.orderCard, SHADOWS?.small]}>
      <View style={styles.orderCardHeader}>
        <View>
          <Text style={styles.orderID}>ORD-{order.id.substring(0, 5).toUpperCase()}</Text>
          <TouchableOpacity onLongPress={handleLongPressContact} delayLongPress={800}>
            <Text style={styles.customerSub}>
              {order.customerName || 'Guest Customer'} <Feather name="phone" size={10} color="#AAA" />
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRightContainer}>
          <Text style={styles.timerText}>3m ago</Text> 
          <View style={[styles.statusPill, { 
            backgroundColor: order.status === 'Preparing' ? '#FEF3C7' : '#DCFCE7' 
          }]}>
            <Text style={[styles.statusPillText, { 
              color: order.status === 'Preparing' ? '#B45309' : '#15803D' 
            }]}>{order.status}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.9}>
        <View style={styles.itemSummary}>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryQty}>{order.items[0].qty}x</Text> {order.items[0].name}
          </Text>

          {expanded && order.items.slice(1).map((item, i) => (
            <Text key={i} style={styles.summaryText}>
              <Text style={styles.summaryQty}>{item.qty}x</Text> {item.name}
            </Text>
          ))}

          {!expanded && order.items.length > 1 && (
            <Text style={styles.moreItemsText}>+ {order.items.length - 1} more items (Tap to view)</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotalText}>₱{order.total}</Text>
        <TouchableOpacity 
          style={[styles.actionBtn, { 
            backgroundColor: order.status === 'Preparing' ? COLORS.primary : COLORS.secondary 
          }]}
          onPress={() => onStatusChange(order.id, order.status)}
        >
          <Text style={styles.actionBtnText}>
            {order.status === 'Preparing' ? 'Ready to Pick-up' : 'Complete Order'}
          </Text>
          <Feather name="check-circle" size={16} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ... (All imports and CollapsibleOrderCard stay exactly the same)

export default function VendorDashboard() {
  const router = useRouter();
  const { orders, updateOrderStatus } = useCart();
  
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to exit your dashboard?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: () => router.replace('/login') 
        }
      ]
    );
  };

  const vendorOrders = useMemo(() => {
    return (orders || []).filter(o => 
      o.vendorName?.toLowerCase().trim() === "takoyaki corner".toLowerCase().trim()
    );
  }, [orders]);

  const activeOrders = vendorOrders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled');
  const completedOrders = vendorOrders.filter(o => o.status === 'Completed');

  const totalSales = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [completedOrders]);

  const handleStatusTransition = (orderId, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === 'Preparing') nextStatus = 'Ready';
    else if (currentStatus === 'Ready') nextStatus = 'Completed';
    if (nextStatus) updateOrderStatus(orderId, nextStatus);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeText}>March 2026 • Live Dashboard</Text>
            <Text style={styles.storeName}>Takoyaki Corner</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.logoutIconBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileBtn}>
              
              
              {/* ✅ FIXED: Changed <div> to <View> below */}
              <View style={styles.onlineBadge} /> 
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ... All existing statsGrid, toolGrid, and Queue logic stays exactly the same ... */}
        <View style={styles.statsGrid}>
          <View style={[styles.mainStat, SHADOWS?.medium]}>
            <View style={styles.statIconCircle}>
              <Feather name="trending-up" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.mainStatValue}>₱{totalSales.toLocaleString()}</Text>
            <Text style={styles.mainStatLabel}>Gross Revenue</Text>
          </View>
          
          <View style={styles.sideStats}>
            <View style={[styles.smallStat, { backgroundColor: COLORS.secondary }]}>
              <Text style={styles.smallStatNum}>{activeOrders.length}</Text>
              <Text style={styles.smallStatLabel}>Active</Text>
            </View>
            <View style={[styles.smallStat, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE' }]}>
              <Text style={[styles.smallStatNum, { color: COLORS.secondary }]}>{completedOrders.length}</Text>
              <Text style={[styles.smallStatLabel, { color: '#888' }]}>Done</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Management Tools</Text>
        <View style={styles.toolGrid}>
          <TouchableOpacity style={styles.toolItem} onPress={() => router.push('/vendor/inventory')}>
            <View style={[styles.toolIcon, { backgroundColor: '#EFEFFD' }]}>
              <MaterialCommunityIcons name="layers-outline" size={24} color="#5C5CFF" />
            </View>
            <Text style={styles.toolText}>Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem} onPress={() => router.push('/vendor/scanner')}>
            <View style={[styles.toolIcon, { backgroundColor: '#FFF5F0' }]}>
              <MaterialCommunityIcons name="qrcode-scan" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.toolText}>Scanner</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem} onPress={() => router.push('/vendor/reports')}>
            <View style={[styles.toolIcon, { backgroundColor: '#F0FDF4' }]}>
              <Feather name="bar-chart-2" size={24} color="#22C55E" />
            </View>
            <Text style={styles.toolText}>Reports</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.queueHeader}>
          <Text style={styles.sectionTitle}>Live Queue</Text>
          {activeOrders.length > 0 && (
            <View style={styles.orderCountBadge}>
              <Text style={styles.orderCountText}>{activeOrders.length} Orders</Text>
            </View>
          )}
        </View>
        
        {activeOrders.length > 0 ? (
          activeOrders.map((order) => (
            <CollapsibleOrderCard 
              key={order.id} 
              order={order} 
              onStatusChange={handleStatusTransition} 
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <Feather name="coffee" size={40} color="#DDD" />
            </View>
            <Text style={styles.emptyTitle}>Kitchen is Quiet</Text>
            <Text style={styles.emptySub}>New orders will appear here in real-time.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ... (All styles remain exactly the same)


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFCFE' },
  header: { 
    backgroundColor: COLORS.secondary, 
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
    paddingBottom: 35, 
    paddingHorizontal: 25, 
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  // ✅ NEW HEADER ACTION STYLES
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoutIconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  welcomeText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  storeName: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 4 },
  storeMiniImg: { width: '100%', height: '100%', borderRadius: 16 },
  content: { padding: 20 },
  statsGrid: { flexDirection: 'row', gap: 15, marginBottom: 30, marginTop: -15 },
  mainStat: { flex: 1.5, backgroundColor: '#FFF', padding: 20, borderRadius: 28, justifyContent: 'center' },
  statIconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  mainStatValue: { fontSize: 24, fontWeight: '900', color: COLORS.secondary },
  mainStatLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginTop: 2 },
  sideStats: { flex: 1, gap: 10 },
  smallStat: { flex: 1, padding: 15, borderRadius: 20, justifyContent: 'center' },
  smallStatNum: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  smallStatLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2, color: 'rgba(255,255,255,0.8)' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.secondary, marginBottom: 15 },
  toolGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35 },
  toolItem: { alignItems: 'center', width: '30%' },
  toolIcon: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  toolText: { fontSize: 12, fontWeight: '700', color: '#666' },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  orderCountBadge: { backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  orderCountText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  orderCard: { backgroundColor: '#FFF', borderRadius: 28, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#F0F0F0' },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  headerRightContainer: { alignItems: 'flex-end' },
  timerText: { fontSize: 11, color: '#AAA', fontWeight: '700', marginBottom: 4 },
  orderID: { fontSize: 15, fontWeight: '900', color: COLORS.secondary },
  customerSub: { fontSize: 13, color: '#888', fontWeight: '500' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  itemSummary: { backgroundColor: '#FAFAFA', borderRadius: 15, padding: 12, marginBottom: 15 },
  summaryText: { fontSize: 14, color: COLORS.secondary, fontWeight: '600', marginBottom: 4 },
  summaryQty: { color: COLORS.primary, fontWeight: '900' },
  moreItemsText: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 4 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotalText: { fontSize: 20, fontWeight: '900', color: COLORS.secondary },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 15 },
  actionBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyIllustration: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#888' },
  emptySub: { fontSize: 13, color: '#AAA', textAlign: 'center', marginTop: 5 },
});