import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  StatusBar, 
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GradientHeader from '../_components/GradientHeader';
import { supabase } from '../../lib/supabaseClient';

export default function AdminAudits() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Audit Action Modal States
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.warn('Failed to load product listings:', error.message || error);
      Alert.alert('Unable to load products', error.message || 'Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenAuditModal = (item: any) => {
    setSelectedProduct(item);
    setModalVisible(true);
  };

  const handleUpdateStatus = async (newStatus: 'approved' | 'rejected') => {
    if (!selectedProduct) return;
    
    try {
      setActionLoading(true);
      const productId = selectedProduct.id;

      // Update the product status column in Supabase (supporting common variations: status or approval_status)
      const updatePayload: any = { status: newStatus };
      
      const { error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', productId);

      if (error) throw error;

      Alert.alert(
        'Success', 
        `Listing has been successfully ${newStatus === 'approved' ? 'approved and is now visible to customers' : 'rejected'}.`
      );
      
      setModalVisible(false);
      setSelectedProduct(null);
      loadProducts(); // Refresh list
    } catch (error: any) {
      console.warn('Failed to update product status:', error.message || error);
      Alert.alert('Error', error.message || 'Unable to update product status.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: any }) => {
    const currentStatus = (item.status || item.approval_status || 'pending').toLowerCase();
    
    let statusBadgeStyle = styles.badgePending;
    let statusTextStyle = styles.badgeTextPending;
    let statusLabel = 'Pending Review';

    if (currentStatus === 'approved') {
      statusBadgeStyle = styles.badgeApproved;
      statusTextStyle = styles.badgeTextApproved;
      statusLabel = 'Approved';
    } else if (currentStatus === 'rejected') {
      statusBadgeStyle = styles.badgeRejected;
      statusTextStyle = styles.badgeTextRejected;
      statusLabel = 'Rejected';
    }

    return (
      <View style={styles.productCard}>
        <View style={styles.productRow}>
          <Text style={styles.productName} numberOfLines={1}>{item.name || item.product_name || 'Unnamed item'}</Text>
          <Text style={styles.productPrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
        </View>

        <Text style={styles.productDesc} numberOfLines={2}>{item.description || item.desc || 'No description provided.'}</Text>
        
        <View style={styles.productRowBetween}> 
          <Text style={styles.productMeta} numberOfLines={1}>{item.vendor_name || item.vendorName || 'Unknown vendor'}</Text>
          <View style={[styles.statusBadge, statusBadgeStyle]}>
            <Text style={[styles.statusBadgeText, statusTextStyle]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.cardActionRow}>
          <TouchableOpacity 
            style={styles.reviewBtn} 
            onPress={() => handleOpenAuditModal(item)}
            activeOpacity={0.8}
          >
            <Feather name="eye" size={14} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.reviewBtnText}>Audit & Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
      >
        <Text style={styles.headerTitle}>Menu Audits</Text>
      </GradientHeader>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? null : (
          <View style={styles.emptyContainer}>
            <View style={styles.checkCircle}>
              <Feather name="clipboard" size={36} color="#C2410C" />
            </View>
            <Text style={styles.emptyTitle}>No listings found.</Text>
            <Text style={styles.emptySub}>All product listings will appear here for review.</Text>
          </View>
        )}
      />

      {/* Audit Detail / Action Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Product Audit Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Item Name:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.name || selectedProduct.product_name || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price:</Text>
                  <Text style={styles.detailValueHighlight}>₱{Number(selectedProduct.price || 0).toFixed(2)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vendor / Kitchen:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.vendor_name || selectedProduct.vendorName || 'N/A'}</Text>
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailDescription}>{selectedProduct.description || selectedProduct.desc || 'No description provided.'}</Text>
                </View>

                <View style={styles.modalActionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn]} 
                    onPress={() => handleUpdateStatus('rejected')}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Feather name="x-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.approveBtn]} 
                    onPress={() => handleUpdateStatus('approved')}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Feather name="check-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  backBtn: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  listContent: { padding: 20, paddingBottom: 100 },
  productCard: { 
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
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  productRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  productName: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3, flex: 1, marginRight: 10 },
  productPrice: { fontSize: 14, fontWeight: '900', color: '#C2410C' },
  productDesc: { fontSize: 12, color: '#64748B', marginBottom: 12, fontWeight: '600', lineHeight: 18 },
  productMeta: { fontSize: 12, color: '#94A3B8', fontWeight: '700', flex: 1, marginRight: 10 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeTextPending: { color: '#D97706' },
  badgeApproved: { backgroundColor: '#DCFCE7' },
  badgeTextApproved: { color: '#16A34A' },
  badgeRejected: { backgroundColor: '#FEE2E2' },
  badgeTextRejected: { color: '#DC2626' },
  statusBadgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

  cardActionRow: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, alignItems: 'flex-end' },
  reviewBtn: { backgroundColor: '#C2410C', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  reviewBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  checkCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FED7AA' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center', letterSpacing: -0.3 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18, fontWeight: '600' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: '80%', padding: 22, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  closeModalBtn: { padding: 4, backgroundColor: '#F1F5F9', borderRadius: 50 },
  modalScroll: { maxHeight: 400 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  detailLabel: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  detailValue: { fontSize: 14, fontWeight: '900', color: '#1E293B', maxWidth: '60%', textAlign: 'right' },
  detailValueHighlight: { fontSize: 15, fontWeight: '900', color: '#C2410C' },
  detailBlock: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 20 },
  detailDescription: { fontSize: 13, color: '#334155', marginTop: 6, lineHeight: 18, fontWeight: '600' },
  modalActionButtons: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 10 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  rejectBtnText: { color: '#DC2626', fontWeight: '900', fontSize: 14 },
  approveBtn: { backgroundColor: '#16A34A' },
  approveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
});