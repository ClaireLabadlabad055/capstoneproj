import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, Image, TouchableOpacity, SafeAreaView, StyleSheet, 
  Dimensions, SectionList, Modal, StatusBar, Linking, TextInput, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { COLORS } from '../../styles/globalStyles';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../context/ProductContext'; 
import { useVendor } from '../../context/VendorContext'; 
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { supabase } from '../../lib/supabaseClient'; // Make sure this path is correct

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
        {item.orderType === 'Special Package' && (
          <View style={styles.promoBadgeInline}>
            <Text style={styles.promoBadgeText}>PROMO</Text>
          </View>
        )}
        
        <Text style={styles.popularItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.popularItemDesc}>{item.product_description || "Toledo's finest."}</Text>
        
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
  const { vendorProfile, updateProfile } = useVendor(); 
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addToCart } = useCart();
  const { products: contextProducts } = useProducts(); 
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [isFav, setIsFav] = useState<boolean>(!!(vendorProfile?.favorite || params.favorite));
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<any>>([]);
  const [chatInput, setChatInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Fetch products from database
  useEffect(() => {
    const fetchVendorProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', params.id);

      if (data) setDbProducts(data);
      if (error) console.error("Error fetching vendor products:", error);
    };

    if (params.id) fetchVendorProducts();
  }, [params.id]);

  // Combine DB products with existing context/mock products
  const allProducts = [...dbProducts, ...contextProducts];

  const isTargetVendor = params.name === vendorProfile.name || params.id === "v2";
  const displayName = isTargetVendor ? vendorProfile.name : (params.name as string);
  const displayDesc = isTargetVendor ? vendorProfile.description : (params.description || "Fresh local delicacies.");
  const displayLoc = isTargetVendor ? vendorProfile.location : (params.location || "Toledo City, Cebu");
  
  const distance = params.distance || "1.2 km";
  const time = params.time || "15-20 mins";
  const rating = params.rating || "4.8";

  const groupedProducts = useMemo(() => {
    const vendorProducts = allProducts.filter(p => 
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
  }, [allProducts, params.id, displayName]);

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
    return isNaN(Number(params.image)) ? { uri: params.image as string } : Number(params.image);
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
              <View style={styles.titleRowMinimal}>
                <Text style={styles.vendorName}>{displayName}</Text>
                <TouchableOpacity
                  style={[styles.favBtn, isFav && styles.favBtnActive]}
                  onPress={async () => {
                    const newVal = !isFav;
                    // optimistic UI
                    setIsFav(newVal);
                    try {
                      // update local context
                      updateProfile({ favorite: newVal });

                      // try persist to DB if vendor id available
                      if (params.id) {
                        const { error } = await supabase
                          .from('vendors')
                          .update({ favorite: newVal })
                          .eq('id', params.id);
                          if (error) {
                            console.error('Failed to persist favorite:', error);
                            // rollback
                            setIsFav(!newVal);
                            updateProfile({ favorite: !newVal });
                            setToastMsg('Unable to save favorite. Please try again.');
                            setTimeout(() => setToastMsg(null), 3000);
                          }
                      }
                    } catch (err) {
                      console.error('Error toggling favorite:', err);
                      setIsFav(!newVal);
                      updateProfile({ favorite: !newVal });
                    }
                  }}
                >
                  <Feather name="heart" size={20} color={isFav ? '#E74C3C' : '#999'} />
                </TouchableOpacity>
              </View>

              <Text style={styles.description}>{displayDesc}</Text>

              <View style={styles.locationDetail}>
                <Ionicons name="location-outline" size={14} color="#888" />
                <Text style={styles.locationText}>{displayLoc}</Text>
              </View>

              <View style={styles.contactBox}>
                <Text style={styles.bookingText}>For bookings — call or message</Text>

                <View style={styles.contactRow}>
                  <Ionicons name="call" size={16} color={COLORS.primary} />
                  <Text style={styles.contactNumber}>{vendorProfile?.mobile || params.mobile || 'Not available'}</Text>

                  {(vendorProfile?.mobile || params.mobile) && (
                    <>
                      <TouchableOpacity
                        style={[styles.contactBtn, styles.callBtn]}
                        onPress={() => Linking.openURL(`tel:${vendorProfile?.mobile || params.mobile}`)}
                      >
                        <Text style={styles.contactBtnText}>Call</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.contactBtn, styles.msgBtn]}
                        onPress={() => {
                          setShowChat(true);
                          // seed a greeting if empty
                          if (chatMessages.length === 0) {
                            setChatMessages([{ from: 'vendor', text: `Hi! This is ${displayName}. How can we help?` }]);
                          }
                        }}
                      >
                        <Text style={[styles.contactBtnText, styles.msgBtnText]}>Message</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <View style={styles.contactRowMinimal}>
                  <MaterialCommunityIcons name="map-marker-outline" size={16} color="#888" />
                  <Text style={styles.contactText}>{vendorProfile?.meetupPoint || params.meetup || 'Meetup point not specified'}</Text>
                </View>
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

      <Modal visible={showChat} animationType="slide" transparent={true}>
        <View style={styles.chatOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>{displayName}</Text>
              <TouchableOpacity onPress={() => setShowChat(false)}>
                <Ionicons name="close" size={22} color="#444" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.chatBody}>
              {chatMessages.map((m, idx) => (
                <View key={idx} style={[styles.chatBubble, m.from === 'vendor' ? styles.chatBubbleVendor : styles.chatBubbleUser]}>
                  <Text style={styles.chatBubbleText}>{m.text}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message..."
                style={styles.chatTextInput}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => {
                  if (!chatInput.trim()) return;
                  setChatMessages(prev => [...prev, { from: 'user', text: chatInput.trim() }]);
                  setChatInput('');
                  // simple automated vendor reply stub
                  setTimeout(() => {
                    setChatMessages(prev => [...prev, { from: 'vendor', text: 'Thanks! We will get back to you shortly.' }]);
                  }, 800);
                }}
              >
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {toastMsg && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={styles.toastBubble}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        </View>
      )}
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
  titleRowMinimal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorName: { fontSize: 26, fontWeight: '900', color: COLORS.secondary },
  favBtn: { backgroundColor: '#F8F8F8', padding: 12, borderRadius: 50 },
  favBtnActive: { backgroundColor: '#FFF0F0' },
  description: { fontSize: 13, color: '#666', marginTop: 10, lineHeight: 20 },
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 10 },
  statTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F6F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  statText: { fontWeight: '800', color: COLORS.secondary, fontSize: 12 },
  locationDetail: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 5, paddingLeft: 2 },
  locationText: { fontSize: 12, color: '#888', fontWeight: '600' },
  sectionHeader: { paddingHorizontal: 25, marginTop: 35, marginBottom: 15 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.secondary },
  accentLine: { width: 40, height: 4, backgroundColor: COLORS.primary, marginTop: 5, borderRadius: 2 },
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
  ,
  contactBox: { marginTop: 14, padding: 10, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  bookingText: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 8 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  contactRowMinimal: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  contactNumber: { fontSize: 13, color: '#222', fontWeight: '700', marginLeft: 6 },
  contactBtn: { marginLeft: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  callBtn: { backgroundColor: COLORS.primary },
  msgBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.primary },
  contactBtnText: { color: '#FFF', fontWeight: '800' },
  contactText: { fontSize: 13, color: '#666' }
  ,
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  chatContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderColor: '#F2F2F2' },
  chatTitle: { fontSize: 16, fontWeight: '800', color: '#222' },
  chatBody: { padding: 14, paddingBottom: 0 },
  chatBubble: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '80%' },
  chatBubbleVendor: { backgroundColor: '#F4F6F8', alignSelf: 'flex-start' },
  chatBubbleUser: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' },
  chatBubbleText: { color: '#111' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderColor: '#F2F2F2' },
  chatTextInput: { flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  sendBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  sendBtnText: { color: '#FFF', fontWeight: '800' },
  msgBtnText: { color: COLORS.primary, fontWeight: '700' }
  ,
  toastContainer: { position: 'absolute', top: 50, left: 20, right: 20, alignItems: 'center', zIndex: 9999 },
  toastBubble: { backgroundColor: '#111', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, opacity: 0.95 },
  toastText: { color: '#FFF', fontWeight: '700' }
});