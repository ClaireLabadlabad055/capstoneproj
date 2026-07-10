import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, Text, Image, TouchableOpacity, SafeAreaView, StyleSheet, Alert,
  Dimensions, SectionList, Modal, StatusBar, Linking, TextInput, ScrollView, KeyboardAvoidingView, Platform, Share
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../styles/globalStyles';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useVendor } from '../../context/VendorContext'; 
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { supabase } from '../../lib/supabaseClient'; // Make sure this path is correct

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2; 

// Resolve simple storage paths to public URLs (synchronous helper using supabase.getPublicUrl)
const resolveStorageUrlSync = (value: any) => {
  if (!value) return null;
  if (typeof value === 'object' && value.uri) return value.uri;
  if (typeof value === 'string') {
    if (value.startsWith('http')) return value;

    const path = value;
    const bucketsToTry: string[] = [];
    if (path.includes('/products/') || path.startsWith('products/')) bucketsToTry.push('products');
    if (path.includes('/covers/') || path.startsWith('covers/')) bucketsToTry.push('covers');
    // Ensure defaults
    bucketsToTry.push('covers', 'products');

    const buckets = Array.from(new Set(bucketsToTry));
    for (const b of buckets) {
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
    if (typeof item.image_url === 'string') return { uri: item.image_url };
    if (typeof item.image === 'string') return { uri: item.image };
    return require('../../assets/images/octo.png');
  };

  return (
    <Animated.View style={[styles.popularCard, animatedStyle]}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(item)}>
        <View style={styles.imageContainer}>
          <Image source={renderImg()} style={styles.popularItemImg} />
          {item.stock === 0 && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>SOLD OUT</Text>
            </View>
          )}

        </View>
      </TouchableOpacity>

      <View style={styles.popularCardContent}>
        {item.orderType === 'Special Package' && (
          <View style={styles.promoBadgeInline}>
            <Text style={styles.promoBadgeText}>PROMO</Text>
          </View>
        )}

        <Text style={styles.popularItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.popularItemDesc} numberOfLines={1}>{item.product_description || "Toledo's finest."}</Text>

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
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addToCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [merchantProfile, setMerchantProfile] = useState<any>(null);
  const [headerImage, setHeaderImage] = useState<any>(null);
  const [merchantContactProfile, setMerchantContactProfile] = useState<any>(null);
  const [isFav, setIsFav] = useState<boolean>(!!(vendorProfile?.favorite || params.favorite));
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<any>>([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchVendorProducts = useCallback(async () => {
    if (!params.id) return;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', params.id);

    if (data) setDbProducts(data);
    if (error) console.error('Error fetching vendor products:', error);
  }, [params.id]);

  const fetchMerchantProfile = useCallback(async () => {
    if (!params.id) return;

    const [merchantResponse, customerResponse] = await Promise.all([
      supabase.from('merchants').select('*').eq('id', params.id).maybeSingle(),
      supabase.from('customers').select('*').eq('id', params.id).maybeSingle(),
    ]);

    if (!merchantResponse.error && merchantResponse.data) {
      // Normalize cover_image to a usable public URL if needed
      const mp = { ...merchantResponse.data };
      try {
        if (mp?.cover_image && typeof mp.cover_image === 'string' && !mp.cover_image.startsWith('http')) {
          const resolved = resolveStorageUrlSync(mp.cover_image);
          mp.cover_image = resolved || mp.cover_image;
        }
      } catch (e) {
        // ignore
      }
      setMerchantProfile(mp);
    }

    if (!customerResponse.error && customerResponse.data) {
      setMerchantContactProfile(customerResponse.data);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchVendorProducts();
      fetchMerchantProfile();
    }
  }, [params.id, fetchVendorProducts, fetchMerchantProfile]);

  useFocusEffect(
    useCallback(() => {
      if (params.id) {
        fetchVendorProducts();
        fetchMerchantProfile();
      }
    }, [params.id, fetchVendorProducts, fetchMerchantProfile])
  );

  // Keep a derived header image state that prefers merchantProfile.cover_image
  useEffect(() => {
    const preferred = merchantProfile?.cover_image || params.coverImage || params.image || null;
    try {
      const resolved = resolveStorageUrlSync(preferred);
      if (resolved) setHeaderImage(isNaN(Number(resolved)) ? { uri: resolved } : Number(resolved));
      else setHeaderImage(preferred ? (isNaN(Number(preferred)) ? { uri: String(preferred) } : Number(preferred)) : require('../../assets/images/cstbg.jpg'));
    } catch (e) {
      setHeaderImage(preferred ? (isNaN(Number(preferred)) ? { uri: String(preferred) } : Number(preferred)) : require('../../assets/images/cstbg.jpg'));
    }
  }, [merchantProfile, params.coverImage, params.image]);

  const refreshChatMessages = async (vendorId = params.id as string | undefined) => {
    if (!vendorId) return;
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', `vendor:${vendorId}`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setChatMessages(data);
    }
    setLoadingMessages(false);
  };

  useEffect(() => {
    if (!showChat || !params.id) return;
    refreshChatMessages(params.id as string);

    const channel = supabase.channel(`customer-chat-${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload: any) => {
        const newConversationId = payload?.new?.conversation_id;
        const oldConversationId = payload?.old?.conversation_id;
        if (newConversationId === `vendor:${params.id}` || oldConversationId === `vendor:${params.id}`) {
          refreshChatMessages(params.id as string);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [showChat, params.id]);

  const allProducts = dbProducts;

  const displayName = merchantProfile?.business_name || merchantProfile?.full_name || (params.name as string) || 'Vendor';
  const displayDesc = vendorProfile?.description || (params.description as string) || merchantProfile?.delicacy_type || 'Fresh local delicacies.';
  const displayLoc = merchantProfile?.barangay ? `${merchantProfile.barangay}, Toledo City` : ((params.location as string) || 'Toledo City, Cebu');
  const phoneNumber = merchantContactProfile?.phone || merchantProfile?.phone || (params.mobile as string) || 'Not available';
  const meetupPoint = merchantProfile?.pickup_landmark || (params.meetupPoint as string) || 'Meetup point not specified.';
  const meetupDetails = merchantProfile?.pickup_details || (params.meetupDetails as string) || 'Meetup details are not available.';

  const distance = params.distance || '1.2 km';
  const time = params.time || '15-20 mins';
  const rating = params.rating || '4.8';

  const groupedProducts = useMemo(() => {
    const vendorProducts = allProducts.filter((p: any) => {
      const productVendorId = p.vendor_id || p.vendorId || null;
      const vendorNameValue = p.vendor_name || p.vendorName || '';
      const matchesVendorId = String(productVendorId || '') === String(params.id || '');
      const matchesVendorName = !!vendorNameValue && String(vendorNameValue).toLowerCase() === String(displayName || '').toLowerCase();
      return matchesVendorId || matchesVendorName;
    });
    
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

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !params.id || !user?.id) return;

    const content = chatInput.trim();
    const { error } = await supabase.from('messages').insert([{
      conversation_id: `vendor:${params.id}`,
      sender_id: user.id,
      receiver_id: params.id as string,
      sender_name: user?.email || 'Customer',
      receiver_name: displayName || 'Vendor',
      content,
    }]);

    if (error) {
      Alert.alert('Message failed', error.message);
      return;
    }

    setChatInput('');
    await refreshChatMessages(params.id as string);
  };

  const renderHeaderImage = () => {
    if (!headerImage) return require('../../assets/images/cstbg.jpg');
    return headerImage;
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
              <Image
                key={typeof headerImage === 'object' && headerImage?.uri ? headerImage.uri : String(headerImage)}
                source={renderHeaderImage()}
                style={styles.headerImage}
                onError={() => {
                  setToastMsg('Cover image failed to load');
                  // fallback to default background
                  setHeaderImage(require('../../assets/images/cstbg.jpg'));
                }}
              />
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

              <View style={styles.contactCard}>
                <View style={styles.contactRow}>
                  <View style={styles.contactLabelRow}>
                    <Ionicons name="call" size={16} color={COLORS.primary} style={styles.contactIcon} />
                    <Text style={styles.contactLabel}>Phone</Text>
                  </View>
                  <Text style={styles.contactValue}>{phoneNumber}</Text>
                </View>
                <View style={styles.contactRow}>
                  <View style={styles.contactLabelRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={COLORS.primary} style={styles.contactIcon} />
                    <Text style={styles.contactLabel}>Meet-up</Text>
                  </View>
                  <Text style={styles.contactValue}>{meetupPoint}</Text>
                </View>
                <View style={styles.contactRow}>
                  <View style={styles.contactLabelRow}>
                    <Feather name="map-pin" size={16} color={COLORS.primary} style={styles.contactIcon} />
                    <Text style={styles.contactLabel}>Details</Text>
                  </View>
                  <Text style={styles.contactValue}>{meetupDetails}</Text>
                </View>
                <View style={styles.contactActions}>
                  {(vendorProfile?.mobile || params.mobile) && (
                    <TouchableOpacity
                      style={styles.contactActionBtn}
                      onPress={() => Linking.openURL(`tel:${phoneNumber}`)}
                    >
                      <Feather name="phone-call" size={14} color="#FFF" />
                      <Text style={styles.contactActionText}>Call</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.contactActionBtn, styles.messageActionBtn]}
                    onPress={() => setShowChat(true)}
                  >
                    <Feather name="message-circle" size={14} color="#FFF" />
                    <Text style={styles.contactActionText}>Message</Text>
                  </TouchableOpacity>
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
              {loadingMessages ? <Text style={styles.chatEmpty}>Loading messages...</Text> : chatMessages.length === 0 ? (
                <Text style={styles.chatEmpty}>No messages yet. Start the conversation.</Text>
              ) : chatMessages.map((m, idx) => (
                <View key={m.id || idx} style={[styles.chatBubble, m.sender_id === user?.id ? styles.chatBubbleUser : styles.chatBubbleVendor]}>
                  <Text style={styles.chatBubbleText}>{m.content}</Text>
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
                onPress={handleSendMessage}
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
  locationDetail: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 15, gap: 5, paddingLeft: 2, flexWrap: 'wrap' },
  locationText: { flex: 1, fontSize: 12, color: '#888', fontWeight: '600', flexWrap: 'wrap' },
  sectionHeader: { paddingHorizontal: 25, marginTop: 35, marginBottom: 15 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.secondary },
  accentLine: { width: 40, height: 4, backgroundColor: COLORS.primary, marginTop: 5, borderRadius: 2 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  popularCard: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 24, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  imageContainer: { width: '100%', height: 120 },
  popularItemImg: { width: '100%', height: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  soldOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  soldOutText: { color: COLORS.primary, fontWeight: '900', fontSize: 12 },
  stockTag: { position: 'absolute', bottom: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockTagText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
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
  contactCard: { marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EEE' },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  contactLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactIcon: { marginRight: 8 },
  contactLabel: { fontSize: 12, fontWeight: '800', color: COLORS.secondary },
  contactValue: { flex: 1, textAlign: 'right', fontSize: 13, color: '#666', fontWeight: '600', lineHeight: 20 },
  contactActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  contactActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  messageActionBtn: { backgroundColor: COLORS.secondary },
  contactActionText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  chatContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderColor: '#F2F2F2' },
  chatTitle: { fontSize: 16, fontWeight: '800', color: '#222' },
  chatBody: { padding: 14, paddingBottom: 0 },
  chatBubble: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '80%' },
  chatBubbleVendor: { backgroundColor: '#F4F6F8', alignSelf: 'flex-start' },
  chatBubbleUser: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' },
  chatBubbleText: { color: '#111' },
  chatEmpty: { color: '#666', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
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