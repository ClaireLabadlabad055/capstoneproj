import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, SafeAreaView, StatusBar, StyleSheet, Dimensions, Animated as RNAnimated } from 'react-native';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext'; 
import { useProducts } from '../../context/ProductContext'; 
import { MOCK_VENDORS, MOCK_PRODUCTS } from '../mockData';
import { CUSTOMER_HOME_CATEGORIES } from '../_utils/vendorCategories';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.45;

const CATEGORIES = ['All Vendors', ...CUSTOMER_HOME_CATEGORIES];
const CAT_ICONS: { [key: string]: string } = {
  'All Vendors': 'apps-outline',
  'Snacks': 'fast-food-outline',
  'Sweets': 'ice-cream-outline',
  'Beverages': 'cafe-outline',
  'Meals': 'restaurant-outline'
};

const getImageSource = (value: any) => {
  if (typeof value === 'number') return value;
  if (value?.uri) return { uri: value.uri };
  if (typeof value === 'string') {
    if (value.startsWith('http')) return { uri: value };

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

    return { uri: value };
  }
  return require('../../assets/images/cstbg.jpg');
};

const resolveStorageUrl = async (value: any) => {
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
      // ignore and continue to try other buckets
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

const VendorCard = ({ item, onOpen }: any) => {
  const displayName = item.name;
  const displayImage = item.image || item.coverImage || require('../../assets/images/cstbg.jpg');
  const vendorDescription = item.description && item.description !== item.category && item.description !== item.categoryType ? item.description : null;
  const vendorCategory = item.category || item.categoryType || 'Delicacies';
  const pickupLabel = item.meetupPoint ? `Pickup at ${item.meetupPoint}` : item.meetupDetails || null;

  return (
    <TouchableOpacity style={styles.vendorCardVertical} onPress={onOpen} activeOpacity={0.9}>
      <View style={styles.vendorImageWrapper}>
        <Image source={displayImage} style={styles.vendorLargeImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={styles.imageOverlayGradient}
        />
        <View style={styles.ratingBadgeFloating}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={styles.ratingBadgeText}>{item.rating}</Text>
        </View>
      </View>

      <View style={styles.vendorInfoContent}>
        <View style={styles.vendorTitleRow}>
          <Text style={styles.vendorNameLarge} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.vendorPriceRange}>₱₱</Text>
        </View>

        <Text style={styles.vendorCategorySubtitle}>{vendorCategory}</Text>
        {vendorDescription ? <Text style={styles.vendorDescription} numberOfLines={2}>{vendorDescription}</Text> : null}

        <View style={styles.vendorMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{item.location || 'Toledo City, Cebu'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="map-outline" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{pickupLabel || 'Pickup info unavailable'}</Text>
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
    scale.value = withTiming(1.08, { duration: 150 }, () => {
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
      <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.95}>
        <Image source={renderImg()} style={styles.popularItemImg} />
      </TouchableOpacity>
      <View style={styles.popularCardContent}>
        <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.95}>
          <Text style={styles.popularItemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.popularItemDesc} numberOfLines={1}>{item.desc || "A local favorite!"}</Text>
        </TouchableOpacity>
        <View style={styles.priceRow}>
          <Text style={styles.popularItemPrice}>₱{item.price}</Text>
          <TouchableOpacity onPress={handleAdd} style={styles.addToCartSmallBtn} activeOpacity={0.8}>
            <LinearGradient
              colors={['#C2410C', '#9A3412']}
              style={styles.btnMiniGradient}
            >
              <Ionicons name="add" size={16} color="#FFF" />
            </LinearGradient>
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
      let { data, error } = await supabase.from('merchants').select('*');
      setMerchantError(error?.message || null);
      setMerchantCount(data?.length || 0);

      const merchantMap = new Map<string, any>();
      if (data && data.length > 0) {
        data.forEach((merchant: any) => merchantMap.set(String(merchant.id), merchant));
      }

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
        rating: '4.8',
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
      let merchant = (merchants || []).find((entry: any) => String(entry.id) === String(merchantId));

      if (!merchant && product.vendorName) {
        merchant = (merchants || []).find((entry: any) => String(entry.business_name || '').toLowerCase() === String(product.vendorName || '').toLowerCase());
      }

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
          rating: '4.8',
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

  const displayDeals = (filteredProducts.length > 0 ? filteredProducts : MOCK_PRODUCTS).slice(0, 4);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.mainScroll, { paddingBottom: 140 }]}> 
        <View style={styles.topBar}>
          <View>
            <Text style={styles.timeText}>08:30</Text>
            <View style={styles.locationRow}>
              <MaterialIcons name="location-pin" size={16} color="#C2410C" />
              <Text style={styles.locationText}>Toledo City, Cebu</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push('/customer/profile')} style={styles.profileButton} activeOpacity={0.8}>
            {userData?.avatar_url ? (
              <Image key={userData.avatar_url} source={{ uri: userData.avatar_url }} style={styles.profileAvatar} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitial}>{userData?.full_name ? userData.full_name[0].toUpperCase() : 'C'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Hero Card with Warm Gradient Matching Register Screen */}
        <LinearGradient
          colors={['#451A03', '#7C2D12', '#C2410C']}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroLabel}>
            <Text style={styles.heroLabelText}>Fresh / Supplied</Text>
          </View>
          <Text style={styles.heroTitle}>All Needs For You</Text>
          <Text style={styles.heroSubtitle}>Fast delivery from trusted local vendors.</Text>
          <View style={styles.heroFeatureRow}>
            <View style={styles.heroFeatureChip}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#C2410C" />
              <Text style={styles.heroFeatureChipText}>Trusted vendors</Text>
            </View>
            <View style={[styles.heroFeatureChip, styles.heroFeatureChipSecondary]}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#FFF" />
              <Text style={[styles.heroFeatureChipText, styles.heroFeatureChipTextSecondary]}>Safe ordering</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Feather name="search" size={20} color="#94A3B8" />
            <TextInput placeholder="Search delicacies..." placeholderTextColor="#94A3B8" style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['#C2410C', '#9A3412']}
              style={styles.filterBtnGradient}
            >
              <Feather name="sliders" size={18} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Category</Text>
          <TouchableOpacity activeOpacity={0.7}><Text style={styles.sectionAction}>See All</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList} contentContainerStyle={styles.categoriesListContent}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveTab(cat)} style={[styles.categoryCard, activeTab === cat && styles.categoryCardActive]} activeOpacity={0.8}>
              <View style={[styles.categoryIconBg, activeTab === cat && styles.categoryIconBgActive]}>
                <Ionicons name={CAT_ICONS[cat] as any} size={22} color={activeTab === cat ? '#FFF' : '#7C2D12'} />
              </View>
              <Text style={[styles.categoryName, activeTab === cat && styles.categoryNameActive]}>{cat.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.sectionHeaderRow, styles.sectionHeaderCompact]}>
          <Text style={styles.sectionTitle}>Best Deal</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealScrollContent} style={styles.dealScroll}>
          {displayDeals.map((item: any) => (
            <View key={item.id || item.name} style={styles.dealCard}>
              <ProductCard item={item} onPress={setSelectedProduct} />
            </View>
          ))}
        </ScrollView>

        <View style={[styles.sectionHeaderRow, styles.sectionHeaderCompact]}>
          <Text style={styles.sectionTitle}>Nearby Vendors</Text>
        </View>

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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  mainScroll: { paddingHorizontal: 20, paddingTop: 20, flexGrow: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  timeText: { fontSize: 16, color: '#1E293B', fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  locationText: { color: '#C2410C', fontSize: 13, fontWeight: '700' },
  profileButton: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22 },
  profilePlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C2D12', justifyContent: 'center', alignItems: 'center' },
  profileInitial: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  heroCard: { borderRadius: 28, padding: 22, overflow: 'hidden', marginBottom: 20, position: 'relative', shadowColor: '#C2410C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 8 },
  heroLabel: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 14, marginBottom: 10 },
  heroLabelText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', lineHeight: 32, maxWidth: '75%', marginBottom: 6 },
  heroSubtitle: { color: '#FFEDD5', fontSize: 13, marginBottom: 16, maxWidth: '80%', lineHeight: 18 },
  heroFeatureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap', gap: 8 },
  heroFeatureChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, alignSelf: 'flex-start', gap: 6, minHeight: 34, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  heroFeatureChipSecondary: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  heroFeatureChipText: { color: '#7C2D12', fontSize: 12, fontWeight: '700' },
  heroFeatureChipTextSecondary: { color: '#FFF' },
  searchSection: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  searchBar: { flex: 1, flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, height: 50, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.02, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, marginLeft: 10, color: '#1E293B', fontSize: 14 },
  filterButton: { width: 50, height: 50, borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#C2410C', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6 },
  filterBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionHeaderCompact: { marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  sectionAction: { fontSize: 13, color: '#C2410C', fontWeight: '700' },
  categoriesList: { marginBottom: 20 },
  categoriesListContent: { paddingRight: 20 },
  categoryCard: { alignItems: 'center', marginRight: 16 },
  categoryCardActive: { opacity: 1 },
  categoryIconBg: { width: 62, height: 62, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1 },
  categoryIconBgActive: { backgroundColor: '#C2410C', borderColor: '#C2410C', shadowColor: '#C2410C', shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  categoryName: { fontSize: 12, marginTop: 8, color: '#64748B', fontWeight: '600' },
  categoryNameActive: { color: '#1E293B', fontWeight: '800' },
  dealScroll: { marginBottom: 20 },
  dealScrollContent: { paddingRight: 20 },
  dealCard: { width: 210, marginRight: 14 },
  popularCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  popularItemImg: { width: '100%', height: 120, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  popularCardContent: { padding: 14 },
  popularItemName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  popularItemDesc: { fontSize: 11, color: '#64748B', marginTop: 4 },
  popularItemPrice: { fontSize: 15, fontWeight: '900', color: '#C2410C' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  addToCartSmallBtn: { width: 28, height: 28, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-end' },
  btnMiniGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vendorCardVertical: { backgroundColor: '#FFFFFF', borderRadius: 24, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', borderLeftWidth: 5, borderLeftColor: '#C2410C' },
  vendorImageWrapper: { position: 'relative', width: '100%', height: 160, backgroundColor: '#F8FAFC' },
  vendorLargeImage: { width: '100%', height: '100%' },
  imageOverlayGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  ratingBadgeFloating: { position: 'absolute', top: 12, right: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  ratingBadgeText: { fontSize: 12, fontWeight: '800', marginLeft: 4, color: '#1E293B' },
  vendorInfoContent: { padding: 18, backgroundColor: '#FFFFFF', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  vendorTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  vendorNameLarge: { fontSize: 17, fontWeight: '800', color: '#1E293B', flexShrink: 1 },
  vendorPriceRange: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  vendorCategorySubtitle: { color: '#C2410C', fontSize: 11, fontWeight: '700', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  vendorDescription: { fontSize: 12, color: '#64748B', marginTop: 6, lineHeight: 18 },
  vendorMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  metaText: { fontSize: 11, color: '#64748B', flexShrink: 1, fontWeight: '500' },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14 },
  welcomeOverlay: { position: 'absolute', left: 20, right: 20, top: 80, alignItems: 'center', zIndex: 9999 },
  welcomeCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, elevation: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  welcomeCardTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  welcomeCardSubtitle: { marginTop: 6, color: '#64748B', textAlign: 'center', fontSize: 13 }
});