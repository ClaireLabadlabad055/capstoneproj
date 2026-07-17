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
import { MOCK_VENDORS, MOCK_PRODUCTS } from '../mockData';
import { CUSTOMER_HOME_CATEGORIES } from '../utils/vendorCategories';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.45;

const CATEGORIES = ['All Vendors', ...CUSTOMER_HOME_CATEGORIES];
const CAT_ICONS: { [key: string]: string } = {
  'All Vendors': 'grid-outline',
  'Snacks': 'fast-food-outline',
  'Sweets': 'ice-cream-outline',
  'Beverages': 'beer-outline',
  'Meals': 'restaurant-outline'
};

const getImageSource = (value: any) => {
  if (typeof value === 'number') return value;
  if (value?.uri) return { uri: value.uri };
  if (typeof value === 'string') {
    // If already a public URL, use it
    if (value.startsWith('http')) return { uri: value };

    // Try to infer bucket and get public URL via Supabase helper
    try {
      let bucket = 'covers';
      const path = value;
      if (path.includes('/products/') || path.startsWith('products/')) bucket = 'products';
      if (path.includes('/covers/') || path.startsWith('covers/')) bucket = 'covers';

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) return { uri: data.publicUrl };
    } catch (e) {
      // fallthrough to return raw value
    }

    // Fallback - return raw value as uri (may be handled elsewhere)
    return { uri: value };
  }
  return require('../../assets/images/cstbg.jpg');
};

// Resolve a DB-stored image value (public URL, storage path, or object) to a usable public URL string
const resolveStorageUrl = async (value: any) => {
  if (!value) return null;
  if (typeof value === 'object' && value.uri) return value.uri;
  if (typeof value === 'string') {
    if (value.startsWith('http')) return value;

    // Try to infer bucket from path
    const path = value;
    let bucket = 'covers';
    if (path.includes('/products/') || path.startsWith('products/')) bucket = 'products';
    if (path.includes('/covers/') || path.startsWith('covers/')) bucket = 'covers';

    try {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    } catch (e) {
      // ignore and continue to try other buckets
    }

    // Try both common buckets as a fallback
    for (const b of ['covers', 'products']) {
      try {
        const { data } = supabase.storage.from(b).getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      } catch (e) {
        // continue
      }
    }

    // Fallback: return original path so getImageSource can handle it
    return path;
  }
  return null;
};

const VendorCard = ({ item, onOpen }: any) => {
  const displayName = item.name;
  const displayImage = item.image || item.coverImage || require('../../assets/images/cstbg.jpg');

  return (
    <TouchableOpacity style={styles.vendorCardVertical} onPress={onOpen}>
      <Image source={displayImage} style={styles.vendorLargeImage} />
      {typeof (item.coverImage) === 'string' && (
        <View style={{ padding: 6, backgroundColor: '#FFF', position: 'absolute', left: 10, bottom: 10, borderRadius: 6 }}>
          <Text style={{ fontSize: 10, maxWidth: 200 }} numberOfLines={1}>{item.coverImage}</Text>
        </View>
      )}
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
    const imageValue = item.img || item.image_url || item.image || null;
    if (typeof imageValue === 'number') return imageValue;
    if (imageValue?.uri) return { uri: imageValue.uri };
    if (typeof imageValue === 'string' && imageValue) return getImageSource(imageValue);
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
  const { userProfile } = useCart();
  const { userData } = useAuth();
  const { products } = useProducts(); 
  const router = useRouter();
  const { recentLoginStatus, setRecentLoginStatus } = useAuth();

  const [activeTab, setActiveTab] = useState('All Vendors');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null); 
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantCount, setMerchantCount] = useState(0);
  const [merchantError, setMerchantError] = useState<string | null>(null);
  const [vendorCount, setVendorCount] = useState(0);

  useEffect(() => {
    if (userData?.avatar_url) {
      setProfileImage(`${userData.avatar_url}?t=${new Date().getTime()}`);
    } else {
      setProfileImage(null);
    }
  }, [userData]);

  useEffect(() => {
    const fetchMerchants = async () => {
      // Fetch merchant records first.
      let { data, error } = await supabase.from('merchants').select('*');
      setMerchantError(error?.message || null);
      setMerchantCount(data?.length || 0);

      const merchantMap = new Map<string, any>();
      if (data && data.length > 0) {
        data.forEach((merchant: any) => merchantMap.set(String(merchant.id), merchant));
      }

      // If products exist, ensure we also fetch any referenced merchant IDs not already loaded.
      if (products && products.length > 0) {
        const vendorIds = Array.from(new Set((products || []).map((p: any) => p.vendor_id || p.vendorId).filter(Boolean))).map((id: any) => String(id));
        const missingIds = vendorIds.filter((id: string) => !merchantMap.has(id));
        if (missingIds.length > 0) {
          const res = await supabase.from('merchants').select('*').in('id', missingIds);
          if (!res.error && res.data) {
            res.data.forEach((merchant: any) => merchantMap.set(String(merchant.id), merchant));
          }
          setMerchantError((prev) => prev || res.error?.message || null);
        }
      }

      const allMerchants = Array.from(merchantMap.values());
      setMerchantCount(allMerchants.length);

      if (allMerchants.length > 0) {
        const normalized = await Promise.all(allMerchants.map(async (m: any) => {
          try {
            const possible = m?.cover_image || m?.cover_url || m?.cover || m?.image_url || m?.image || null;
            if (possible && typeof possible === 'string' && !possible.startsWith('http')) {
              const resolved = await resolveStorageUrl(possible);
              m.cover_image = resolved || possible;
            } else if (possible && typeof possible === 'string') {
              m.cover_image = possible;
            }
          } catch (e) {
            // leave original value on failure
          }
          return m;
        }));
        setMerchants(normalized);
      } else if (products && products.length > 0) {
        const fallbackMerchantMap = new Map<string, any>();
        products.forEach((product: any) => {
          const merchantId = product.vendor_id || product.vendorId || null;
          const merchantName = product.vendorName || product.vendor_name || 'Vendor';
          const vendorKey = merchantId ? String(merchantId) : `name:${merchantName}`;
          if (!fallbackMerchantMap.has(vendorKey)) {
            fallbackMerchantMap.set(vendorKey, {
              id: merchantId || vendorKey,
              business_name: merchantName,
              delicacy_type: product.category || 'General',
              pickup_details: product.desc || product.description || '',
              barangay: product.barangay || null,
              phone: null,
              cover_image: product.img || product.image_url || product.image || null,
            });
          }
        });

        const fallbackMerchants = Array.from(fallbackMerchantMap.values());
        setMerchantCount(fallbackMerchants.length);
        setMerchants(fallbackMerchants);
      } else {
        setMerchants([]);
      }
    };

    fetchMerchants();
  }, [products]);

  const VENDORS = useMemo(() => {
    const vendorMap = new Map<string, any>();

    (merchants || []).forEach((merchant: any) => {
      const merchantKey = String(merchant.id);
      vendorMap.set(merchantKey, {
        id: merchant.id,
        name: merchant.business_name || 'Vendor',
        category: merchant.delicacy_type || 'General',
        categoryType: merchant.delicacy_type || 'Others',
        rating: '4.5',
        distance: '1.2km',
        image: getImageSource(merchant?.cover_image || null),
        isSynced: true,
        coverImage: getImageSource(merchant?.cover_image || null),
        description: merchant.delicacy_type || 'Freshly prepared delicacies for your customers.',
        location: merchant.barangay ? `${merchant.barangay}, Toledo City` : 'Toledo City, Cebu',
        meetupPoint: merchant.pickup_landmark || null,
        meetupDetails: merchant.pickup_details || null,
        mobile: merchant.phone || null,
        merchant,
      });
    });

    (products || []).forEach((product: any) => {
      const merchantId = product.vendor_id || product.vendorId || null;
      // Try to find merchant by id first
      let merchant = (merchants || []).find((entry: any) => String(entry.id) === String(merchantId));

      // If no merchant found by id, try to match by business_name using vendorName from product
      if (!merchant && product.vendorName) {
        merchant = (merchants || []).find((entry: any) => String(entry.business_name || '').toLowerCase() === String(product.vendorName || '').toLowerCase());
      }

      // Build a stable, unique vendor key. Prefer merchant id, then vendor_id, then vendorName,
      // finally fall back to a product-specific key to avoid merging unrelated products into one vendor.
      let vendorKey: string;
      if (merchant?.id) vendorKey = String(merchant.id);
      else if (merchantId) vendorKey = `id:${String(merchantId)}`;
      else if (product.vendorName) vendorKey = `name:${String(product.vendorName)}`;
      else vendorKey = `product:${String(product.id || Date.now())}`;

      if (!vendorMap.has(vendorKey)) {
        const productImage = product.img || product.image_url || product.image || null;
        const chosenImage = merchant?.cover_image || productImage || null;

        vendorMap.set(vendorKey, {
          id: merchant?.id || merchantId || vendorKey,
          name: merchant?.business_name || product.vendorName || product.vendor_name || 'Vendor',
          category: merchant?.delicacy_type || product.category || 'General',
          categoryType: merchant?.delicacy_type || product.category || 'Others',
          rating: '4.5',
          distance: '1.2km',
          image: getImageSource(chosenImage),
          isSynced: !!merchant,
          coverImage: getImageSource(chosenImage),
          description: merchant?.delicacy_type || product.desc || product.description || 'Freshly prepared delicacies for your customers.',
          location: merchant?.barangay ? `${merchant.barangay}, Toledo City` : 'Toledo City, Cebu',
          meetupPoint: merchant?.pickup_landmark || null,
          meetupDetails: merchant?.pickup_details || null,
          mobile: merchant?.phone || null,
          merchant,
        });
      }
    });

    const vendorsArray = Array.from(vendorMap.values());
    return vendorsArray;
  }, [products, merchants]);

  useEffect(() => {
    setVendorCount(VENDORS.length);
  }, [VENDORS.length]);

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

        {(filteredProducts.length > 0 ? filteredProducts : MOCK_PRODUCTS).length > 0 && (
          <>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>🔥 Popular Items</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularScroll}>
              {(filteredProducts.length > 0 ? filteredProducts : MOCK_PRODUCTS).map((item: any) => (<ProductCard key={item.id} item={item} onPress={setSelectedProduct} />))}
            </ScrollView>
          </>
        )}

        <View style={[styles.sectionHeader, styles.sectionHeaderCompact]}><Text style={styles.sectionTitle}>Nearby Vendors</Text></View>
        {(filteredVendors.length > 0 ? filteredVendors : MOCK_VENDORS).length > 0 ? (
          (filteredVendors.length > 0 ? filteredVendors : MOCK_VENDORS).map((vendor: any) => (
            <VendorCard key={vendor.id} item={vendor} onOpen={() => router.push({
            pathname: '/customer/VendorDetails',
            params: {
              id: vendor.id,
              name: vendor.name,
              category: vendor.category,
              description: vendor.description || '',
              location: vendor.location || 'Toledo City, Cebu',
              meetupPoint: vendor.meetupPoint || '',
              meetupDetails: vendor.meetupDetails || '',
              mobile: vendor.mobile || '',
              image: typeof vendor.image === 'string' ? vendor.image : (vendor.image?.uri || ''),
              // Prefer the raw merchant.cover_image string from DB when available, else fall back to the computed coverImage uri
              coverImage: vendor.merchant?.cover_image ? vendor.merchant.cover_image : (typeof vendor.coverImage === 'string' ? vendor.coverImage : (vendor.coverImage?.uri || '')),
            },
          })} />
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
  sectionHeader: { marginTop: 10, marginBottom: 6 },
  sectionHeaderCompact: { marginTop: 8, marginBottom: 6 },
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
  vendorInfoContent: { padding: 12 },
  vendorTitleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vendorNameLarge: { fontSize: 18, fontWeight: '800' },
  vendorPriceRange: { color: '#AAA' },
  vendorCategorySubtitle: { color: COLORS.primary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  vendorDescription: { fontSize: 12, color: '#666', marginTop: 6, lineHeight: 16 },
  vendorMetaRow: { flexDirection: 'column', gap: 8, marginTop: 8 },
  metaItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: '#666', flexShrink: 1 },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#AAA' }
  ,
  welcomeOverlay: { position: 'absolute', left: 20, right: 20, top: 80, alignItems: 'center', zIndex: 9999 },
  welcomeCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, width: '100%', alignItems: 'center' },
  welcomeCardTitle: { fontSize: 18, fontWeight: '900', color: COLORS.secondary },
  welcomeCardSubtitle: { marginTop: 6, color: '#666', textAlign: 'center' }
});