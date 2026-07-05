import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, SafeAreaView, StatusBar, StyleSheet, Dimensions, Modal } from 'react-native';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext'; 
import { useProducts } from '../../context/ProductContext'; 
import { useVendor } from '../../context/VendorContext'; 

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.45;

const CATEGORIES = ['All Vendors', 'Snacks', 'Sweets', 'Beverages', 'Meals'];
const CAT_ICONS = {
  'All Vendors': 'grid-outline',
  'Snacks': 'fast-food-outline',
  'Sweets': 'ice-cream-outline',
  'Beverages': 'beer-outline',
  'Meals': 'restaurant-outline'
};

// ✅ REUSABLE VENDOR CARD
const VendorCard = ({ item, isSynced, liveProfile, onOpen }) => {
  const displayName = isSynced ? liveProfile.name : item.name;
  const displayImage = isSynced 
    ? (typeof liveProfile.coverImage === 'string' ? { uri: liveProfile.coverImage } : liveProfile.coverImage)
    : item.image;

  return (
    <TouchableOpacity style={styles.vendorCardVertical} onPress={onOpen}>
      <Image source={displayImage} style={styles.vendorLargeImage} />
      <View style={styles.ratingBadgeFloating}>
        <Ionicons name="star" size={14} color="#FFD700" />
        <Text style={styles.ratingBadgeText}>{item.rating}</Text>
      </View>
      <View style={styles.vendorInfoContent}>
        <View style={styles.vendorTitleRow}>
          <Text style={styles.vendorNameLarge}>{displayName}</Text>
          <Text style={styles.vendorPriceRange}>₱₱</Text>
        </View>
        <Text style={styles.vendorCategorySubtitle}>{item.category}</Text>
        <View style={styles.vendorMetaRow}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={14} color={COLORS.primary} />
            <Text style={styles.metaText}>20-30 min</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={14} color="#777" />
            <Text style={styles.metaText}>{item.distance}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ✅ REUSABLE PRODUCT CARD
const ProductCard = ({ item, onPress }) => {
  const { addToCart } = useCart();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleAdd = () => {
    scale.value = withTiming(1.1, { duration: 150 }, () => {
      scale.value = withTiming(1, { duration: 150 });
    });
    addToCart({ ...item, vendorName: item.vendorName || 'Vendor', qty: 1 });
  };

  const renderImg = () => {
    if (typeof item.img === 'number') return item.img;
    if (item.img?.uri) return { uri: item.img.uri };
    return require('../../assets/images/octo.png');
  };

  return (
    <Animated.View style={[styles.popularCard, animatedStyle]}>
      <TouchableOpacity onPress={() => onPress(item)}>
        <Image source={renderImg()} style={styles.popularItemImg} />
      </TouchableOpacity>
      <View style={styles.popularCardContent}>
        <TouchableOpacity onPress={() => onPress(item)}>
          <Text style={styles.popularItemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.popularItemDesc} numberOfLines={1}>{item.desc || "A local favorite!"}</Text>
        </TouchableOpacity>
        <View style={styles.priceRow}>
          <Text style={styles.popularItemPrice}>₱{item.price}</Text>
          <TouchableOpacity onPress={handleAdd} style={styles.addToCartSmallBtn}>
            <Ionicons name="add" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export default function UserDashboard() {
  const { vendorProfile } = useVendor(); 
  const { userProfile, addToCart } = useCart();
  const { products } = useProducts(); 
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('All Vendors');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null); 

  const VENDORS = useMemo(() => [
    { id: 'v1', name: "Claire's Cookies", category: 'Bakery • Desserts', categoryType: 'Sweets', rating: '5.0', distance: '0.8km', image: require('../../assets/images/cst.jpg') },
    { id: 'v2', name: vendorProfile.name, category: 'Streetfood • Snacks', categoryType: 'Snacks', rating: '4.9', distance: '1.2km', image: vendorProfile.coverImage, isSynced: true },
  ], [vendorProfile]);

  const filteredVendors = useMemo(() => {
    return VENDORS.filter(vendor => {
      const matchesTab = activeTab === 'All Vendors' || vendor.categoryType === activeTab;
      const matchesSearch = vendor.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [VENDORS, activeTab, searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter(item => {
      const matchesTab = activeTab === 'All Vendors' || item.itemTag === activeTab || item.category === activeTab;
      const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [products, activeTab, searchQuery]);

  const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : 'Claire';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity><Ionicons name="menu-outline" size={28} color={COLORS.secondary} /></TouchableOpacity>
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-pin" size={14} color={COLORS.secondary} />
            <Text style={styles.locationText} numberOfLines={1}>Toledo City, Cebu</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/customer/profile')}>
             <View style={styles.profilePlaceholder}><Text style={styles.profileInitial}>{firstName[0]}</Text></View>
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeText}>Hi {firstName}, <Text style={styles.orderLabelText}>Don't Wait, Order Your Food!</Text></Text>
      </View>

      {/* --- MODIFIED SCROLLVIEW WITH PADDING FIX --- */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.mainScroll, { paddingBottom: 120 }]}
      >
        
        {/* --- SEARCH BAR --- */}
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#AAA" />
          <TextInput 
            placeholder="Search delicacies..." 
            style={styles.searchInput} 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#CCC" />
            </TouchableOpacity>
          )}
        </View>

        {/* --- CATEGORIES --- */}
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Categories</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveTab(cat)} style={styles.categoryCard}>
              <View style={[styles.categoryIconBg, activeTab === cat && styles.categoryIconBgActive]}>
                <Ionicons name={CAT_ICONS[cat]} size={24} color={activeTab === cat ? "#FFF" : COLORS.secondary} />
              </View>
              <Text style={[styles.categoryName, activeTab === cat && styles.categoryNameActive]}>{cat.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* --- POPULAR ITEMS --- */}
        {filteredProducts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeTab === 'All Vendors' ? '🔥 Popular Items' : `Delicious ${activeTab}`}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularScroll}>
              {filteredProducts.map(item => (
                <ProductCard key={item.id} item={item} onPress={setSelectedProduct} />
              ))}
            </ScrollView>
          </>
        )}

        {/* --- NEARBY VENDORS --- */}
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Nearby Vendors</Text></View>
        {filteredVendors.length > 0 ? (
          filteredVendors.map(vendor => (
            <VendorCard 
              key={vendor.id} 
              item={vendor} 
              isSynced={vendor.isSynced}
              liveProfile={vendorProfile}
              onOpen={() => router.push({ 
                pathname: '/customer/VendorDetails', 
                params: { 
                    ...vendor,
                    image: vendor.isSynced 
                        ? (typeof vendorProfile.coverImage === 'string' ? vendorProfile.coverImage : vendorProfile.coverImage.uri)
                        : vendor.image
                } 
              })} 
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
             <Text style={styles.emptyText}>No vendors found</Text>
          </View>
        )}
      </ScrollView>

      {/* --- PRODUCT MODAL --- */}
      <Modal visible={!!selectedProduct} animationType="fade" transparent={false}>
        <SafeAreaView style={styles.cleanModalContainer}>
          {selectedProduct && (
            <View style={{ flex: 1 }}>
              <View style={styles.modalHeaderMinimal}>
                <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                  <Ionicons name="chevron-back" size={28} color={COLORS.secondary} />
                </TouchableOpacity>
                <Text style={styles.modalHeaderTitle}>Product Details</Text>
                <TouchableOpacity><Feather name="heart" size={22} color={COLORS.primary} /></TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <Image 
                  source={typeof selectedProduct.img === 'number' ? selectedProduct.img : { uri: selectedProduct.img.uri }} 
                  style={styles.modalImageLarge} 
                  resizeMode="contain"
                />
                <View style={styles.modalDetailsContent}>
                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalNameLarge}>{selectedProduct.name}</Text>
                    <Text style={styles.modalPriceLarge}>₱{selectedProduct.price}</Text>
                  </View>
                  <Text style={styles.modalVendorName}>{selectedProduct.vendorName || "Vendor"}</Text>
                  
                  <View style={styles.modalBadgeRow}>
                    <View style={styles.tagBadge}><Text style={styles.tagText}>{selectedProduct.itemTag}</Text></View>
                    <View style={styles.sectionBadge}><Text style={styles.sectionText}>{selectedProduct.category}</Text></View>
                  </View>

                  <Text style={styles.modalLabel}>Description</Text>
                  <Text style={styles.modalDescriptionText}>{selectedProduct.desc || "A delicious treat made with fresh ingredients."}</Text>
                  
                  <TouchableOpacity 
                    style={styles.modalMainBtn} 
                    onPress={() => {
                      addToCart({...selectedProduct, qty: 1});
                      setSelectedProduct(null);
                    }}
                  >
                    <Text style={styles.modalMainBtnText}>Add to Cart • ₱{selectedProduct.price}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 20, paddingTop: 25 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: COLORS.secondary, fontSize: 13, fontWeight: '700' },
  profilePlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  profileInitial: { color: '#FFF', fontWeight: 'bold' },
  welcomeText: { fontSize: 18, color: COLORS.secondary, fontWeight: '800', marginTop: 15 },
  orderLabelText: { color: '#666', fontWeight: '400' },
  mainScroll: { paddingHorizontal: 20, paddingTop: 10, flexGrow: 1 },
  searchBar: { flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 15, paddingHorizontal: 15, height: 50, alignItems: 'center', marginVertical: 15, zIndex: 10 },
  searchInput: { flex: 1, marginLeft: 10 },
  sectionHeader: { marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.secondary },
  categoriesList: { marginBottom: 10 },
  categoryCard: { alignItems: 'center', marginRight: 15 },
  categoryIconBg: { width: 55, height: 55, borderRadius: 15, backgroundColor: '#FBFBFB', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
  categoryIconBgActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryName: { fontSize: 11, marginTop: 5 },
  categoryNameActive: { color: COLORS.primary, fontWeight: '700' },
  popularScroll: { marginHorizontal: -5 },
  popularCard: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 20, marginHorizontal: 5, elevation: 3, marginBottom: 10 },
  popularItemImg: { width: '100%', height: 110, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  popularCardContent: { padding: 10 },
  popularItemName: { fontSize: 14, fontWeight: '800' },
  popularItemDesc: { fontSize: 10, color: '#AAA' },
  popularItemPrice: { fontSize: 15, fontWeight: '900', color: COLORS.primary },
  addToCartSmallBtn: { backgroundColor: COLORS.secondary, width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end' },
  vendorCardVertical: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 20, elevation: 3, overflow: 'hidden' },
  vendorLargeImage: { width: '100%', height: 140 },
  ratingBadgeFloating: { position: 'absolute', top: 10, right: 10, backgroundColor: '#FFF', padding: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  ratingBadgeText: { fontSize: 12, fontWeight: '800', marginLeft: 3 },
  vendorInfoContent: { padding: 15 },
  vendorTitleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vendorNameLarge: { fontSize: 18, fontWeight: '800' },
  vendorPriceRange: { color: '#AAA' },
  vendorCategorySubtitle: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  vendorMetaRow: { flexDirection: 'row', gap: 15, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: '#666' },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#AAA' },

  // ✅ CLEAN MODAL STYLES
  cleanModalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeaderMinimal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  modalHeaderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.secondary },
  modalImageLarge: { width: width, height: 300, backgroundColor: '#FFF' },
  modalDetailsContent: { padding: 25 },
  modalPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalNameLarge: { fontSize: 26, fontWeight: '900', color: COLORS.secondary },
  modalPriceLarge: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  modalVendorName: { fontSize: 14, color: COLORS.primary, fontWeight: '700', marginTop: 5 },
  modalBadgeRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  tagBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '700', color: '#666' },
  sectionBadge: { backgroundColor: '#FFF5F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  sectionText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  modalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.secondary, marginTop: 30 },
  modalDescriptionText: { fontSize: 15, color: '#666', marginTop: 10, lineHeight: 24 },
  modalMainBtn: { backgroundColor: COLORS.secondary, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 40, marginBottom: 20 },
  modalMainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});