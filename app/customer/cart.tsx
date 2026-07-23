import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  StyleSheet, 
  Dimensions, 
  Platform 
} from 'react-native'; 
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 
import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext'; 
import { supabase } from '../../lib/supabaseClient';

const { width } = Dimensions.get('window');

const resolveStorageUrl = (value: any) => {
  if (!value) return null;
  if (typeof value === 'object' && value.uri) return value.uri;
  if (typeof value === 'string') {
    if (value.startsWith('http')) return value;

    const path = value;
    let bucket = 'covers';
    if (path.includes('/products/') || path.startsWith('products/')) bucket = 'products';
    if (path.includes('/covers/') || path.startsWith('covers/')) bucket = 'covers';

    try {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    } catch (e) {
      // ignore
    }

    for (const b of ['covers', 'products']) {
      try {
        const { data } = supabase.storage.from(b).getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      } catch (e) {
        // continue
      }
    }

    return path;
  }
  return null;
};

export default function CartScreen() {
  const router = useRouter(); 
  const { cartItems, removeFromCart, updateQty } = useCart(); 

  // ✅ FIX: Added Number conversion and guard (|| 0) to prevent NaN/Undefined errors
  const subtotal = (cartItems as any[]).reduce((acc, item) => {
    const price = Number(item.price) || 0;
    return acc + (price * (item.qty || 1));
  }, 0);

  const deliveryFee = cartItems.length > 0 ? 15 : 0;

  const renderItem = (props: any) => {
    const item = props.item;
    // ✅ FIX: Ensure price is treated as a number
    const displayPrice = Number(item.price) || 0;
    
    // Resolve image source safely using robust storage resolution
    let imageSource: any = require('../../assets/images/octo.png');
    const maybeImage = item.image || item.img || item.image_url || null;
    
    if (maybeImage) {
      const resolvedUrl = resolveStorageUrl(maybeImage);
      if (resolvedUrl) {
        imageSource = { uri: resolvedUrl };
      } else if (typeof maybeImage === 'string') {
        imageSource = { uri: maybeImage };
      } else if (maybeImage.uri) {
        imageSource = maybeImage;
      }
    }

    return (
      <View style={styles.cartCard}>
        <View style={styles.imageContainer}>
          <Image 
            source={imageSource}
            style={styles.itemImage} 
          />
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name || "Unknown Item"}</Text>
          <Text style={styles.vendorLabel}>{item.vendorName || "Local Vendor"}</Text>
          {/* ✅ FIX: Added toFixed(2) safely */}
          <Text style={styles.itemPrice}>₱{displayPrice.toFixed(2)}</Text>
        </View>

        <View style={styles.actionColumn}>
          <TouchableOpacity onPress={() => removeFromCart(item.id, item.vendorName)} style={styles.deleteBtn}>
            <Feather name="trash-2" size={18} color="#EF4444" />
          </TouchableOpacity>

          <View style={styles.qtySelector}>
            <TouchableOpacity onPress={() => updateQty(item.id, -1, item.vendorName)}>
              <Feather name="minus" size={14} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.qty || 1}</Text>
            <TouchableOpacity onPress={() => updateQty(item.id, 1, item.vendorName)}>
              <Feather name="plus" size={14} color="#1E293B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#451A03" />

      {/* Styled Header matching HomeScreen Warm Gradient Theme */}
      <LinearGradient
        colors={['#451A03', '#7C2D12', '#C2410C']}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerLeftAction} activeOpacity={0.8}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>My Cart</Text>
        <View style={styles.headerRightSpacer} />
      </LinearGradient>

      <FlatList
        data={cartItems}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${item.vendorName}-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
           <Text style={styles.itemCountText}>{cartItems.length} items in your bag</Text>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-handle-outline" size={80} color="#CBD5E1" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/customer/home')}
            >
              <LinearGradient
                colors={['#C2410C', '#9A3412']}
                style={styles.browseBtn}
              >
                <Text style={styles.browseBtnText}>Browse Delicacies</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      {/* --- SUMMARY CARD --- */}
      <View style={styles.summaryWrapper}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>₱{deliveryFee.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{(subtotal + deliveryFee).toFixed(2)}</Text>
          </View>

          <TouchableOpacity 
            activeOpacity={0.8}
            disabled={cartItems.length === 0}
            onPress={() => router.push('/customer/checkout')} 
          >
            <LinearGradient
              colors={cartItems.length === 0 ? ['#E2E8F0', '#CBD5E1'] : ['#C2410C', '#9A3412']}
              style={[styles.checkoutBtn, cartItems.length === 0 && styles.disabledBtn]}
            >
              <Text style={styles.checkoutBtnText}>Checkout Now</Text>
              <Feather name="arrow-right" size={18} color="#FFF" style={{ marginLeft: 10 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  gradientHeader: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'android' ? 20 : 0,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitleText: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerLeftAction: { 
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerRightSpacer: {
    width: 36,
  },

  itemCountText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center'
  },

  listContent: { 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 380 
  },
  
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 5,
    borderLeftColor: '#C2410C',
  },
  imageContainer: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  itemImage: { width: 65, height: 65, borderRadius: 12 },
  itemDetails: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  vendorLabel: { fontSize: 11, color: '#C2410C', fontWeight: '700', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemPrice: { fontSize: 16, color: '#C2410C', fontWeight: '900', marginTop: 4 },
  
  actionColumn: { alignItems: 'flex-end', justifyContent: 'space-between', height: 75 },
  deleteBtn: { padding: 4 },
  qtySelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 14, 
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  qtyText: { marginHorizontal: 10, fontWeight: '900', color: '#1E293B', fontSize: 13 },

  summaryWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'transparent',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 22,
    elevation: 12,
    shadowColor: '#C2410C',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  summaryValue: { fontWeight: '700', color: '#1E293B', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  totalLabel: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  totalValue: { fontSize: 24, fontWeight: '900', color: '#C2410C' },

  checkoutBtn: {
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: { shadowOpacity: 0, elevation: 0 },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#64748B', marginTop: 10, fontWeight: '700', fontSize: 16 },
  browseBtn: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, marginTop: 20, shadowColor: '#C2410C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  browseBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 }
});