import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, SafeAreaView, StatusBar, StyleSheet, Dimensions, Animated as RNAnimated } from 'react-native';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext'; 
import { useProducts } from '../../context/ProductContext'; 
import { useVendor } from '../../context/VendorContext'; 

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.45;

const CATEGORIES = ['All Vendors', 'Snacks', 'Sweets', 'Beverages', 'Meals'];
const CAT_ICONS: { [key: string]: string } = {
  'All Vendors': 'grid-outline',
  'Snacks': 'fast-food-outline',
  'Sweets': 'ice-cream-outline',
  'Beverages': 'beer-outline',
  'Meals': 'restaurant-outline'
};

const VendorCard = ({ item, isSynced, liveProfile, onOpen }: any) => {
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

const ProductCard = ({ item, onPress }: any) => {
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
  const { userProfile } = useCart();
  const { userData } = useAuth();
  const { products } = useProducts(); 
  const router = useRouter();
  const { recentLoginStatus, setRecentLoginStatus } = useAuth();

  const [activeTab, setActiveTab] = useState('All Vendors');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null); 
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Fetch Vendors
      const { data: vendorData } = await supabase.from('merchants').select('*');
      if (vendorData) {
        const formatted = vendorData.map(v => ({
          id: v.id,
          name: v.business_name,
          category: v.delicacy_type || 'General',
          categoryType: v.delicacy_type || 'Others',
          rating: '4.5',
          distance: '1.2km',
          image: v.verification_doc_url ? { uri: v.verification_doc_url } : require('../../assets/images/octo.png'),
          isSynced: false
        }));
        setDbVendors(formatted);
      }

      // profile image is now synced via AuthContext.userData
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (userData?.avatar_url) {
      setProfileImage(`${userData.avatar_url}?t=${new Date().getTime()}`);
    } else {
      setProfileImage(null);
    }
  }, [userData]);

  const VENDORS = useMemo(() => [
    { id: 'v1', name: "Claire's Cookies", category: 'Bakery • Desserts', categoryType: 'Sweets', rating: '5.0', distance: '0.8km', image: require('../../assets/images/cst.jpg') },
    ...dbVendors,
    { id: 'v2', name: vendorProfile.name, category: 'Streetfood • Snacks', categoryType: 'Snacks', rating: '4.9', distance: '1.2km', image: vendorProfile.coverImage, isSynced: true },
  ], [vendorProfile, dbVendors]);

  const filteredVendors = useMemo(() => {
    return VENDORS.filter(vendor => {
      const matchesTab = activeTab === 'All Vendors' || vendor.categoryType === activeTab;
      const matchesSearch = vendor.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [VENDORS, activeTab, searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter((item: any) => {
      const matchesTab = activeTab === 'All Vendors' || item.itemTag === activeTab || item.category === activeTab;
      const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [products, activeTab, searchQuery]);

  const firstName = userData?.full_name ? userData.full_name.split(' ')[0] : (userProfile?.name ? userProfile.name.split(' ')[0] : 'Claire');

  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (recentLoginStatus) {
      setShowWelcome(true);
      RNAnimated.timing(welcomeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

      const hide = setTimeout(() => {
        RNAnimated.timing(welcomeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setShowWelcome(false);
          setRecentLoginStatus(null);
        });
      }, 3400);

      return () => clearTimeout(hide);
    }
  }, [recentLoginStatus]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity><Ionicons name="menu-outline" size={28} color={COLORS.secondary} /></TouchableOpacity>
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-pin" size={14} color={COLORS.secondary} />
            <Text style={styles.locationText} numberOfLines={1}>Toledo City, Cebu</Text>
          </View>
         <TouchableOpacity onPress={() => router.push('/customer/profile')}>
  {userData?.avatar_url && userData.avatar_url !== "" ? (
    <Image 
      // The 'key' forces a re-render when the URL changes (prevents caching issues)
      key={userData.avatar_url} 
      source={{ uri: userData.avatar_url }} 
      style={styles.profilePlaceholder} 
    />
  ) : (
    <View style={styles.profilePlaceholder}>
      <Text style={styles.profileInitial}>
        {userData?.full_name ? userData.full_name[0].toUpperCase() : 'C'}
      </Text>
    </View>
  )}
</TouchableOpacity>
        </View>
        <Text style={styles.welcomeText}>Hi {firstName}, <Text style={styles.orderLabelText}>Don't Wait, Order Your Food!</Text></Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.mainScroll, { paddingBottom: 120 }]}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#AAA" />
          <TextInput placeholder="Search delicacies..." style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Categories</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveTab(cat)} style={styles.categoryCard}>
              <View style={[styles.categoryIconBg, activeTab === cat && styles.categoryIconBgActive]}>
                <Ionicons name={CAT_ICONS[cat] as any} size={24} color={activeTab === cat ? "#FFF" : COLORS.secondary} />
              </View>
              <Text style={[styles.categoryName, activeTab === cat && styles.categoryNameActive]}>{cat.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredProducts.length > 0 && (
          <>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>🔥 Popular Items</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularScroll}>
              {filteredProducts.map((item: any) => (<ProductCard key={item.id} item={item} onPress={setSelectedProduct} />))}
            </ScrollView>
          </>
        )}

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Nearby Vendors</Text></View>
        {filteredVendors.length > 0 ? (
          filteredVendors.map((vendor: any) => (
            <VendorCard key={vendor.id} item={vendor} isSynced={vendor.isSynced} liveProfile={vendorProfile} onOpen={() => router.push({ pathname: '/customer/VendorDetails', params: { ...vendor } })} />
          ))
        ) : (
          <View style={styles.emptyContainer}><Text style={styles.emptyText}>No vendors found</Text></View>
        )}
      </ScrollView>

      {showWelcome && recentLoginStatus && (
        <RNAnimated.View style={[styles.welcomeOverlay, { opacity: welcomeAnim, transform: [{ translateY: welcomeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]} pointerEvents="none">
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeCardTitle}>{recentLoginStatus.isNew ? 'Welcome!' : `Welcome back, ${firstName}!`}</Text>
            {recentLoginStatus.isNew ? (
              <Text style={styles.welcomeCardSubtitle}>Check your email ({recentLoginStatus.email}) to verify your account.</Text>
            ) : (
              <Text style={styles.welcomeCardSubtitle}>Good to see you again. Enjoy your day!</Text>
            )}
          </View>
        </RNAnimated.View>
      )}
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
  searchBar: { flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 15, paddingHorizontal: 15, height: 50, alignItems: 'center', marginVertical: 15 },
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
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
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
  emptyText: { color: '#AAA' }
  ,
  welcomeOverlay: { position: 'absolute', left: 20, right: 20, top: 80, alignItems: 'center', zIndex: 9999 },
  welcomeCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, width: '100%', alignItems: 'center' },
  welcomeCardTitle: { fontSize: 18, fontWeight: '900', color: COLORS.secondary },
  welcomeCardSubtitle: { marginTop: 6, color: '#666', textAlign: 'center' }
});