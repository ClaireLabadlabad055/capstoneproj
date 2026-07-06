import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, StatusBar, Dimensions, Alert, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabaseClient'; 

const { width } = Dimensions.get('window');

export default function MyOrders() {
  const router = useRouter();
  const { orders: contextOrders, updateOrderStatus } = useCart(); 
  
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });useEffect(() => {
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*');
    
    // Add this to your code
    if (error) {
      console.error("Database connection error:", error);
    } else {
      console.log("Successfully fetched orders from DB:", data);
      setDbOrders(data);
    }
  };
  fetchOrders();
}, []);



      if (data) {
        // Map database columns to match your UI components
        const formatted = data.map(o => ({
          id: o.id,
          date: new Date(o.created_at).toLocaleDateString(),
          vendorName: o.vendor_name,
          total: o.total,
          status: o.status,
          items: o.order_details || []
        }));
        setDbOrders(formatted);
      } else if (error) {
        console.error("Error fetching orders:", error);
      }
    };
    fetchOrders();
  }, []);

  // Merge database orders with local mock/context orders
  const allOrders = [...dbOrders, ...(contextOrders || [])];

  const openQR = (order: any) => {
    setSelectedOrder(order);
    setQrModalVisible(true);
  };

  const handleOrderReceived = async (orderId: string) => {
    updateOrderStatus(orderId, 'Completed');
    // Sync update to Supabase
    await supabase.from('orders').update({ status: 'Completed' }).eq('id', orderId);
    setRatingModalVisible(true);
  };

  const openRatingForCompleted = (order: any) => {
    setSelectedOrder(order);
    setRatingModalVisible(true);
  };

  const submitRating = () => {
    Alert.alert("Success", "Thank you for rating your ToledoGo experience!");
    setRatingModalVisible(false);
    setRating(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <View style={styles.whiteHeader}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>My Orders</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/customer/profile')} style={styles.headerLeftAction}>
          <Feather name="arrow-left" size={24} color="#4A342E" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {allOrders.length > 0 ? (
          [...allOrders].reverse().map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.orderDate}>{order.date || 'Today'}</Text>
                  <Text style={styles.orderId}>ID: {order.id.slice(-8).toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: order.status === 'Completed' ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Text style={[styles.statusText, { color: order.status === 'Completed' ? '#2E7D32' : '#EF6C00' }]}>
                    {order.status || 'Pending'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.itemInfo}>
                <Text style={styles.vendorName}>{order.vendorName || 'Toledo Vendor'}</Text>
                <Text style={styles.itemDetails}>
                  {order.items?.length || 0} items • ₱{order.total}
                </Text>
              </View>

              <View style={styles.actionRow}>
                {order.status !== 'Completed' && (
                  <TouchableOpacity style={[styles.actionBtn, styles.qrBtn]} onPress={() => openQR(order)}>
                    <Feather name="maximize" size={14} color="#4A342E" />
                    <Text style={styles.qrBtnText}>Order QR</Text>
                  </TouchableOpacity>
                )}

                {order.status === 'Ready' && (
                  <TouchableOpacity style={[styles.actionBtn, styles.receivedBtn]} onPress={() => handleOrderReceived(order.id)}>
                    <Text style={styles.receivedBtnText}>Order Received</Text>
                  </TouchableOpacity>
                )}

                {order.status === 'Completed' && (
                  <TouchableOpacity style={[styles.actionBtn, styles.ratingBtn]} onPress={() => openRatingForCompleted(order)}>
                    <MaterialCommunityIcons name="star" size={16} color="#FFF" />
                    <Text style={styles.ratingBtnText}>Rate Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Feather name="package" size={50} color="#DDD" />
            </View>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/customer/home')}>
              <Text style={styles.browseBtnText}>Browse Delicacies</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals remain exactly as you had them */}
      {/* ... (Keep your existing Modal code here) ... */}
    </SafeAreaView>
  );
}
// Keep your original styles constant at the bottom

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBFC' },
  
  // ✅ Consistent Minimalist Header Styles
  whiteHeader: {
    height: 60,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginTop: Platform.OS === 'android' ? 20 : 0,
    position: 'relative',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#4A342E',
  },
  headerLeftAction: { 
    padding: 8,
    zIndex: 10,
  },
  itemInfo: {
    marginVertical: 10,
  },

  scrollContent: { padding: 20, paddingBottom: 100 },
  orderCard: { backgroundColor: '#FFF', borderRadius: 22, padding: 18, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderDate: { fontSize: 12, color: '#A8A8A8', fontWeight: '600' },
  orderId: { fontSize: 14, fontWeight: '800', color: '#4A342E' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 },
  vendorName: { fontSize: 16, fontWeight: '800', color: '#4A342E' },
  itemDetails: { fontSize: 13, color: '#777', marginTop: 4 },
  
  actionRow: { flexDirection: 'row', marginTop: 15, gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12 },
  qrBtn: { backgroundColor: '#FAF9F6', borderWidth: 1, borderColor: '#F0EBE3' },
  qrBtnText: { marginLeft: 6, color: '#4A342E', fontWeight: '700' },
  receivedBtn: { backgroundColor: '#4A342E' },
  receivedBtnText: { color: '#FFF', fontWeight: '700' },
  ratingBtn: { backgroundColor: '#D2B48C' }, // Muted earth gold
  ratingBtnText: { color: '#FFF', fontWeight: '800', marginLeft: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  qrCard: { width: width * 0.85, backgroundColor: '#FFF', borderRadius: 30, padding: 25, alignItems: 'center' },
  ratingCard: { width: width * 0.85, backgroundColor: '#FFF', borderRadius: 30, padding: 30, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#4A342E' },
  modalSub: { color: '#777', marginTop: 5, marginBottom: 20 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 25 },
  submitBtn: { backgroundColor: '#4A342E', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 15 },
  submitBtnText: { color: '#FFF', fontWeight: '800' },
  qrBackground: { padding: 15, backgroundColor: '#FFF', borderRadius: 20, marginVertical: 20, borderWidth: 1, borderColor: '#EEE' },
  modalVendor: { fontSize: 18, fontWeight: '700', color: '#4A342E', marginBottom: 20 },
  closeModalBtn: { alignSelf: 'flex-end', padding: 5 },
  doneBtn: { backgroundColor: '#4A342E', width: '100%', padding: 15, borderRadius: 15, alignItems: 'center' },
  doneBtnText: { color: '#FFF', fontWeight: '700' },
  
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#4A342E', marginTop: 20 },
  browseBtn: { backgroundColor: '#4A342E', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15, marginTop: 20 },
  browseBtnText: { color: '#FFF', fontWeight: '700' }
});