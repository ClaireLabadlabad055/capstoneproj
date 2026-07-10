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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 
import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext'; 

const { width } = Dimensions.get('window');

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

    return (
      <View style={styles.cartCard}>
        <View style={styles.imageContainer}>
          {/* Fallback image if item.image is missing */}
          <Image 
            source={item.image || item.img || require('../../assets/images/octo.png')} 
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
            <Feather name="trash-2" size={18} color="#FF6B6B" />
          </TouchableOpacity>

          <View style={styles.qtySelector}>
            <TouchableOpacity onPress={() => updateQty(item.id, -1, item.vendorName)}>
              <Feather name="minus" size={14} color="#4A342E" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.qty || 1}</Text>
            <TouchableOpacity onPress={() => updateQty(item.id, 1, item.vendorName)}>
              <Feather name="plus" size={14} color="#4A342E" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.whiteHeader}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>My Cart</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerLeftAction}>
          <Feather name="arrow-left" size={24} color="#4A342E" />
        </TouchableOpacity>
      </View>

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
            <Ionicons name="bag-handle-outline" size={80} color="#DDD" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <TouchableOpacity 
              style={styles.browseBtn} 
              onPress={() => router.push('/customer/home')}
            >
              <Text style={styles.browseBtnText}>Browse Delicacies</Text>
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
            style={[styles.checkoutBtn, cartItems.length === 0 && styles.disabledBtn]}
            disabled={cartItems.length === 0}
            onPress={() => router.push('/customer/checkout')} 
          >
            <Text style={styles.checkoutBtnText}>Checkout Now</Text>
            <Feather name="arrow-right" size={18} color="#FFF" style={{ marginLeft: 10 }} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ... Keep your existing styles (they were correct!)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBFC' },
  
  // ✅ Identical to Profile Header Style
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

  itemCountText: {
    fontSize: 13,
    color: '#AAA',
    fontWeight: '600',
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
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  imageContainer: { backgroundColor: '#FAF9F6', borderRadius: 15, padding: 5 },
  itemImage: { width: 65, height: 65, borderRadius: 10 },
  itemDetails: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 16, fontWeight: '800', color: '#4A342E' },
  vendorLabel: { fontSize: 11, color: '#BBB', fontWeight: '700', marginTop: 2 },
  itemPrice: { fontSize: 16, color: '#8D493A', fontWeight: '900', marginTop: 4 },
  
  actionColumn: { alignItems: 'flex-end', justifyContent: 'space-between', height: 75 },
  deleteBtn: { padding: 4 },
  qtySelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FAF9F6', 
    borderRadius: 10, 
    padding: 6,
    borderWidth: 1,
    borderColor: '#F0EBE3'
  },
  qtyText: { marginHorizontal: 12, fontWeight: '900', color: '#4A342E' },

  summaryWrapper: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30, // Adjusted to sit better on screen
    backgroundColor: 'transparent',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 22,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#888', fontWeight: '600', fontSize: 14 },
  summaryValue: { fontWeight: '700', color: '#4A342E', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  totalLabel: { fontSize: 18, fontWeight: '900', color: '#4A342E' },
  totalValue: { fontSize: 24, fontWeight: '900', color: '#8D493A' },

  checkoutBtn: {
    backgroundColor: '#4A342E',
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: { backgroundColor: '#E0E0E0' },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#CCC', marginTop: 10, fontWeight: '700', fontSize: 16 },
  browseBtn: { backgroundColor: '#4A342E', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15, marginTop: 20 },
  browseBtnText: { color: '#FFF', fontWeight: '700' }
});