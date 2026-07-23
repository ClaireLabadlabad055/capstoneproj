import React, { useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCart } from '../../context/CartContext';
import { COLORS } from '../../styles/globalStyles';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import GradientHeader from '../_components/GradientHeader';

export default function ScannerScreen() {
  const router = useRouter();
  const { orders, updateOrderStatus } = useCart();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedOrder, setScannedOrder] = useState<any>(null);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is needed to scan QR codes</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionBtn} activeOpacity={0.9}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    let orderId = data;
    try {
      if (data.startsWith('{')) {
        const parsed = JSON.parse(data);
        orderId = parsed.id || parsed.orderId || parsed.reference || parsed.referenceNo || data;
      }
    } catch {
      // Fall back to using the raw string value below.
    }

    const normalizedOrderId = String(orderId || '').trim();
    if (!normalizedOrderId) {
      setScanned(false);
      Alert.alert("Invalid QR", "The scanned code did not contain an order reference.");
      return;
    }

    try {
      const { data: orderRow, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', normalizedOrderId)
        .maybeSingle();

      if (error) throw error;

      let foundOrder = orderRow;
      if (!foundOrder) {
        foundOrder = orders.find((o: any) =>
          String(o.id) === normalizedOrderId ||
          String(o.id).toLowerCase() === normalizedOrderId.toLowerCase() ||
          String(o.id).endsWith(normalizedOrderId)
        );
      }

      if (foundOrder) {
        setScannedOrder({
          ...foundOrder,
          customerName: foundOrder.customer_name || foundOrder.customerName || 'Walk-in Customer',
          items: Array.isArray(foundOrder.items)
            ? foundOrder.items
            : (Array.isArray(foundOrder.order_details) ? foundOrder.order_details : []),
          total: foundOrder.total ?? foundOrder.amount ?? 0,
        });
      } else {
        setScanned(false);
        Alert.alert("Not Found", "This order could not be found on this device or in the database.", [
          { text: "Try Again", onPress: () => setScanned(false) }
        ]);
      }
    } catch (e) {
      console.error('Scanner lookup failed:', e);
      setScanned(false);
      Alert.alert("Lookup Failed", "Could not retrieve the order right now.");
    }
  };

  const confirmPickup = async () => {
    if (!scannedOrder?.id) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Completed' })
        .eq('id', String(scannedOrder.id));

      if (error) throw error;

      updateOrderStatus(String(scannedOrder.id), 'Completed');
      router.back();
    } catch (e) {
      console.error('Failed to complete order:', e);
      Alert.alert("Update Failed", "The order could not be marked complete.");
    }
  };

  return (
    <View style={styles.container}>
      <GradientHeader
        colors={['#C2410C', '#9A3412', '#7C2D12']}
        titleContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color="#C2410C" />
          </TouchableOpacity>
        }
        rightAction={
          <View style={styles.headerSpacer} />
        }
        style={styles.headerBar}
      >
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>Scanner</Text>
          <Text style={styles.headerSubtitle}>Scan and complete orders</Text>
        </View>
      </GradientHeader>

      {/* 1. THE SCANNER LAYER */}
      {!scanned && (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.finder} />
            <Text style={styles.instruction}>Position the QR code inside the frame</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* 2. THE RECEIPT MODAL (Improved UI) */}
      <Modal visible={scanned && !!scannedOrder} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.receiptCard}>
            {/* Header */}
            <View style={styles.receiptHeader}>
              <View style={styles.checkIconBg}>
                <MaterialCommunityIcons name="check" size={26} color="#FFF" />
              </View>
              <Text style={styles.receiptTitle}>Order Verified</Text>
              <Text style={styles.receiptSubtitle}>ID: {scannedOrder?.id.split('-').pop()}</Text>
            </View>

            {/* Customer Info */}
            <View style={styles.infoSection}>
              <Text style={styles.label}>CUSTOMER</Text>
              <Text style={styles.value}>{scannedOrder?.customerName || "Walk-in Customer"}</Text>
            </View>

            <View style={styles.dashedLine} />

            {/* Items List */}
            <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>ORDER ITEMS</Text>
              {scannedOrder?.items.map((item: any, index: number) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemMain}>{item.qty}x {item.name}</Text>
                  <Text style={styles.itemPrice}>₱{item.price * item.qty}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.dashedLine} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.totalAmount}>₱{scannedOrder?.total}</Text>
            </View>

            {/* Actions */}
            <TouchableOpacity style={styles.confirmButton} onPress={confirmPickup} activeOpacity={0.9}>
              <Text style={styles.confirmButtonText}>COMPLETE TRANSACTION</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rescanLink} onPress={() => { setScanned(false); setScannedOrder(null); }} activeOpacity={0.8}>
              <Text style={styles.rescanText}>Oops, wrong order? Scan again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerBar: { paddingVertical: 16, paddingHorizontal: 20, marginTop: Platform.OS === 'android' ? 24 : 0, marginBottom: 0 },
  headerBackBtn: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA' },
  headerSpacer: { width: 38 },
  headerTitleWrapper: { alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', lineHeight: 24 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2, fontWeight: '700' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  permissionText: { textAlign: 'center', marginBottom: 20, color: '#475569', fontWeight: '700' },
  permissionBtn: { backgroundColor: '#C2410C', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14 },
  permissionBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  
  // Scanner UI
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  finder: { width: 260, height: 260, borderWidth: 3, borderColor: '#FFF', borderRadius: 24 },
  instruction: { color: '#FFF', marginTop: 30, fontSize: 14, fontWeight: '800' },
  cancelBtn: { position: 'absolute', bottom: 50, padding: 16 },
  cancelText: { color: '#FFF', textDecorationLine: 'underline', fontWeight: '700' },

  // Receipt UI
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  receiptCard: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  receiptHeader: { alignItems: 'center', marginBottom: 20 },
  checkIconBg: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#15803D', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  receiptTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  receiptSubtitle: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  
  infoSection: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  
  dashedLine: { height: 1, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', marginVertical: 12 },
  
  itemsList: { marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemMain: { fontSize: 14, color: '#475569', fontWeight: '700' },
  itemPrice: { fontSize: 14, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  totalAmount: { fontSize: 26, fontWeight: '900', color: '#C2410C', letterSpacing: -0.5 },
  
  confirmButton: { backgroundColor: '#C2410C', padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 24, shadowColor: '#C2410C', shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  confirmButtonText: { color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.8 },
  rescanLink: { marginTop: 16, alignItems: 'center', padding: 8 },
  rescanText: { color: '#94A3B8', fontWeight: '800', fontSize: 12 }
});