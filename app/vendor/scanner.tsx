import React, { useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCart } from '../../context/CartContext';
import { COLORS } from '../../styles/globalStyles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';

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
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
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
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
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
                <MaterialCommunityIcons name="check" size={30} color="#FFF" />
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
            <ScrollView style={styles.itemsList}>
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
            <TouchableOpacity style={styles.confirmButton} onPress={confirmPickup}>
              <Text style={styles.confirmButtonText}>COMPLETE TRANSACTION</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rescanLink} onPress={() => { setScanned(false); setScannedOrder(null); }}>
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
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionText: { textAlign: 'center', marginBottom: 20, color: '#333' },
  button: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 10 },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  
  // Scanner UI
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  finder: { width: 260, height: 260, borderWidth: 4, borderColor: '#FFF', borderRadius: 30 },
  instruction: { color: '#FFF', marginTop: 30, fontSize: 16, fontWeight: '500' },
  cancelBtn: { position: 'absolute', bottom: 50 },
  cancelText: { color: '#FFF', textDecorationLine: 'underline' },

  // Receipt UI
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  receiptCard: { backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '85%' },
  receiptHeader: { alignItems: 'center', marginBottom: 25 },
  checkIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  receiptTitle: { fontSize: 24, fontWeight: '900', color: COLORS.secondary },
  receiptSubtitle: { color: '#888', fontWeight: '600' },
  
  infoSection: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '800', color: '#AAA', letterSpacing: 1, marginBottom: 5 },
  value: { fontSize: 18, fontWeight: '700', color: COLORS.secondary },
  
  dashedLine: { height: 1, borderWidth: 1, borderColor: '#EEE', borderStyle: 'dashed', marginVertical: 15 },
  
  itemsList: { marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemMain: { fontSize: 16, color: '#444', fontWeight: '600' },
  itemPrice: { fontSize: 16, fontWeight: '700', color: COLORS.secondary },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  totalLabel: { fontSize: 18, fontWeight: '900', color: COLORS.secondary },
  totalAmount: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  
  confirmButton: { backgroundColor: COLORS.primary, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 30 },
  confirmButtonText: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  rescanLink: { marginTop: 20, alignItems: 'center' },
  rescanText: { color: '#AAA', fontWeight: '600' }
});