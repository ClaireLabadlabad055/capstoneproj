import React, { useState, useMemo } from 'react';
import { 
  View, Text, Image, TouchableOpacity, SafeAreaView, StyleSheet, 
  Dimensions, SectionList, Modal, StatusBar 
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../context/ProductContext'; 
import { useVendor } from '../../context/VendorContext'; 
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2; 

// --- PRODUCT CARD COMPONENT ---
const ProductCard = ({ item, onAdd, onPress }: { item: any, onAdd: (p: any) => void, onPress: (p: any) => void }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handleAdd = () => {
    scale.value = withTiming(1.1, { duration: 150 }, () => {
      scale.value = withTiming(1, { duration: 150 });
    });
    onAdd(item);
  };

  const renderImg = () => {
    if (typeof item.img === 'number') return item.img;
    if (item.img?.uri) return { uri: item.img.uri };
    if (typeof item.img === 'string') return { uri: item.img };
    return require('../../assets/images/octo.png');
  };

  return (
    <Animated.View style={[styles.popularCard, animatedStyle]}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(item)}>
        <Image source={renderImg()} style={styles.popularItemImg} />
        {item.stock === 0 && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.popularCardContent}>
        {/* ✅ PROMO BADGE: Positioned inline so it never covers the name */}
        {item.orderType === 'Special Package' && (
          <View style={styles.promoBadgeInline}>
            <Text style={styles.promoBadgeText}>PROMO</Text>
          </View>
        )}
        
        <Text style={styles.popularItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.popularItemDesc} numberOfLines={1}>{item.desc || "Toledo's finest."}</Text>
        
        <View style={styles.priceRow}>
          <Text style={styles.popularItemPrice}>₱{item.price}</Text>
          <TouchableOpacity 
            onPress={handleAdd} 
            style={[styles.addToCartSmallBtn, { opacity: item.stock === 0 ? 0.4 : 1 }]}
            disabled={item.stock === 0}
          >
            <Ionicons name={item.stock === 0 ? "close" : "add"} size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export default function VendorDetails() {
  const { vendorProfile } = useVendor(); 
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addToCart } = useCart();
  const { products } = useProducts(); 
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // ✅ SYNC LOGIC: Checking if viewing own store
  const isTargetVendor = params.name === vendorProfile.name || params.id === "v2";
  const displayName = isTargetVendor ? vendorProfile.name : (params.name as string);
  const displayDesc = isTargetVendor ? vendorProfile.description : (params.description || "Fresh local delicacies.");
  const displayLoc = isTargetVendor ? vendorProfile.location : (params.location || "Toledo City, Cebu");
  
  // RESTORED PARAMS
  const distance = params.distance || "1.2 km";
  const time = params.time || "15-20 mins";
  const rating = params.rating || "4.8";

  // ✅ GROUPING LOGIC: Priority to Special Packages
  const groupedProducts = useMemo(() => {
    const vendorProducts = products.filter(p => 
        p.vendorId === params.id || p.vendorName === displayName
    );
    
    return [
      { 
        title: 'Special Packages', 
        icon: 'gift-outline', 
        data: vendorProducts.filter(p => p.orderType === 'Special Package') 
      },
      { 
        title: 'Single Orders', 
        icon: 'food-variant', 
        data: vendorProducts.filter(p => p.orderType !== 'Special Package') 
      }
    ].filter(section => section.data.length > 0);
  }, [products, params.id, displayName]);

  const handleAddItem = (product: any) => {
    addToCart({ ...product, vendorName: displayName || 'Vendor', qty: 1 });
  };

  const renderHeaderImage = () => {
    if (isTargetVendor) {
      return typeof vendorProfile.coverImage === 'string' 
        ? { uri: vendorProfile.coverImage } 
        : vendorProfile.coverImage;
    }
    if (!params.image) return require('../../assets/images/cstbg.jpg');
    const isNumber = !isNaN(Number(params.image));
    return isNumber ? Number(params.image) : { uri: params.image as string };
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SectionList
        sections={groupedProducts}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.headerImageWrapper}>
              <Image source={renderHeaderImage()} style={styles.headerImage} />
              <View style={styles.imageOverlay} />
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.titleRow}>
                <Text style={styles.vendorName}>{displayName}</Text>
                <TouchableOpacity style={styles.favBtn}>
                  <Feather name="heart" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.description}>{displayDesc}</Text>
              
              {/* ✅ RESTORED METADATA ROW */}
              <View style={styles.statsRow}>
                <View style={styles.statTag}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.statText}>{rating}</Text>
                </View>

                <View style={styles.statTag}>
                  <MaterialCommunityIcons name="map-marker-distance" size={14} color={COLORS.primary} />
                  <Text style={styles.statText}>{distance}</Text>
                </View>

                <View style={styles.statTag}>
                  <Feather name="clock" size={14} color="#4CAF50" />
                  <Text style={styles.statText}>{time}</Text>
                </View>
              </View>

              <View style={styles.locationDetail}>
                <Ionicons name="location-outline" size={14} color="#888" />
                <Text style={styles.locationText}>{displayLoc}</Text>
              </View>
            </View>
          </View>
        )}
        renderSectionHeader={({ section: { title, icon } }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLabelRow}>
              <MaterialCommunityIcons name={icon as any} size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.accentLine} />
          </View>
        )}
        renderItem={({ section, index }) => {
          if (index % 2 !== 0) return null;
          const nextItem = section.data[index + 1];
          return (
            <View style={styles.gridRow}>
              <ProductCard item={section.data[index]} onAdd={handleAddItem} onPress={setSelectedProduct} />
              {nextItem ? (
                <ProductCard item={nextItem} onAdd={handleAddItem} onPress={setSelectedProduct} />
              ) : <View style={{ width: CARD_WIDTH }} />}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* --- DETAIL MODAL --- */}
      <Modal visible={!!selectedProduct} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProduct && (
              <>
                <Image 
                  source={typeof selectedProduct.img === 'number' ? selectedProduct.img : { uri: selectedProduct.img?.uri || selectedProduct.img }} 
                  style={styles.modalImg} 
                />
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedProduct(null)}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.modalBody}>
                  <View style={styles.modalTitleRow}>
                    <Text style={styles.modalName}>{selectedProduct.name}</Text>
                    <Text style={styles.modalPriceText}>₱{selectedProduct.price}</Text>
                  </View>
                  <Text style={styles.modalDescTitle}>Description</Text>
                  <Text style={styles.modalDescText}>{selectedProduct.desc || "A must-try dish in Toledo!"}</Text>

                  <TouchableOpacity 
                    style={[styles.addBtnLarge, { opacity: selectedProduct.stock === 0 ? 0.5 : 1 }]}
                    onPress={() => {
                      handleAddItem(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    disabled={selectedProduct.stock === 0}
                  >
                    <Text style={styles.addBtnLargeText}>
                      {selectedProduct.stock === 0 ? "Currently Unavailable" : "Add to Cart"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  headerImageWrapper: { height: 240, width: '100%' },
  headerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: '#FFF', padding: 10, borderRadius: 15, elevation: 5 },
  infoBox: { paddingHorizontal: 25, paddingTop: 30, paddingBottom: 25, backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, elevation: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorName: { fontSize: 26, fontWeight: '900', color: COLORS.secondary },
  favBtn: { backgroundColor: '#F8F8F8', padding: 12, borderRadius: 50 },
  description: { fontSize: 13, color: '#666', marginTop: 10, lineHeight: 20 },
  
  // STATS
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 10 },
  statTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F6F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  statText: { fontWeight: '800', color: COLORS.secondary, fontSize: 12 },
  locationDetail: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 5, paddingLeft: 2 },
  locationText: { fontSize: 12, color: '#888', fontWeight: '600' },

  // SECTIONS
  sectionHeader: { paddingHorizontal: 25, marginTop: 35, marginBottom: 15 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.secondary },
  accentLine: { width: 40, height: 4, backgroundColor: COLORS.primary, marginTop: 5, borderRadius: 2 },

  // PRODUCT CARD
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  popularCard: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 24, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  popularItemImg: { width: '100%', height: 120, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  soldOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  soldOutText: { color: COLORS.primary, fontWeight: '900', fontSize: 12 },
  
  popularCardContent: { padding: 12 },
  promoBadgeInline: { alignSelf: 'flex-start', backgroundColor: '#FFF0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  promoBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '900' },
  
  popularItemName: { fontSize: 15, fontWeight: '800', color: COLORS.secondary },
  popularItemDesc: { fontSize: 10, color: '#AAA', marginTop: 3, marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  popularItemPrice: { fontSize: 17, fontWeight: '900', color: COLORS.primary },
  addToCartSmallBtn: { backgroundColor: COLORS.secondary, width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, height: height * 0.78, overflow: 'hidden' },
  modalImg: { width: '100%', height: 320 },
  closeBtn: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25 },
  modalBody: { padding: 30, flex: 1 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalName: { fontSize: 26, fontWeight: '900', color: COLORS.secondary },
  modalPriceText: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  modalDescTitle: { fontSize: 17, fontWeight: '800', color: COLORS.secondary, marginTop: 25 },
  modalDescText: { fontSize: 15, color: '#666', marginTop: 12, lineHeight: 24 },
  addBtnLarge: { backgroundColor: COLORS.primary, padding: 22, borderRadius: 22, alignItems: 'center', marginTop: 'auto', marginBottom: 15 },
  addBtnLargeText: { color: '#FFF', fontSize: 18, fontWeight: '900' }
});