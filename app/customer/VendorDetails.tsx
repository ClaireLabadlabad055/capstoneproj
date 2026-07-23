import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, Text, Image, TouchableOpacity, SafeAreaView, StyleSheet, Alert,
  Dimensions, SectionList, Modal, StatusBar, Linking, TextInput, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useVendor } from '../../context/VendorContext'; 
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabaseClient';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2; 

const resolveStorageUrlSync = (value: any) => {
  if (!value) return null;
  if (typeof value === 'object' && value.uri) return value.uri;
  if (typeof value === 'string') {
    if (value.startsWith('http')) return value;

    const path = value;
    const bucketsToTry: string[] = [];
    if (path.includes('/products/') || path.startsWith('products/')) bucketsToTry.push('products');
    if (path.includes('/covers/') || path.startsWith('covers/')) bucketsToTry.push('covers');
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
            activeOpacity={0.8}
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

    const [merchantResponse, customerResponse, profileResponse] = await Promise.all([
      supabase.from('merchants').select('*').eq('id', params.id).maybeSingle(),
      supabase.from('customers').select('*').eq('id', params.id).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', params.id).maybeSingle(),
    ]);

    if (!merchantResponse.error && merchantResponse.data) {
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

    if (!customerResponse.error || !profileResponse.error) {
      const mergedContactProfile = {
        ...(customerResponse.data || {}),
        ...(profileResponse.data || {}),
      };
      setMerchantContactProfile(mergedContactProfile);
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

  const displayName = merchantProfile?.business_name || merchantProfile?.full_name || (params.name as string) || vendorProfile?.name || 'Vendor';
  const displayDesc = merchantProfile?.delicacy_type || merchantProfile?.description || (params.description as string) || vendorProfile?.description || 'Fresh local delicacies.';
  const displayLoc = merchantProfile?.barangay ? `${merchantProfile.barangay}, Toledo City` : ((params.location as string) || vendorProfile?.location || 'Toledo City, Cebu');
  const phoneNumber = merchantContactProfile?.phone || merchantProfile?.phone || (params.mobile as string) || vendorProfile?.mobile || 'Not available';
  const meetupPoint = merchantProfile?.pickup_landmark || (params.meetupPoint as string) || vendorProfile?.meetupPoint || 'Meetup point not specified.';
  const meetupDetails = merchantProfile?.pickup_details || (params.meetupDetails as string) || vendorProfile?.meetupDetails || 'Meetup details are not available.';
  const profileSummary = useMemo(() => ({
    name: displayName,
    description: displayDesc,
    location: displayLoc,
    phone: phoneNumber,
    meetupPoint,
    meetupDetails,
  }), [displayName, displayDesc, displayLoc, phoneNumber, meetupPoint, meetupDetails]);

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
                  setHeaderImage(require('../../assets/images/cstbg.jpg'));
                }}
              />
              <LinearGradient
                colors={['rgba(69,26,3,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
                style={styles.imageOverlay}
              />
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
                <Feather name="arrow-left" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.titleRowMinimal}>
                <Text style={styles.vendorName}>{profileSummary.name}</Text>
                <TouchableOpacity
                  style={[styles.favBtn, isFav && styles.favBtnActive]}
                  activeOpacity={0.8}
                  onPress={async () => {
                    const newVal = !isFav;
                    setIsFav(newVal);
                    try {
                      updateProfile({ favorite: newVal });

                      if (params.id) {
                        const { error } = await supabase
                          .from('vendors')
                          .update({ favorite: newVal })
                          .eq('id', params.id);
                          if (error) {
                            console.error('Failed to persist favorite:', error);
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
                  <Feather name="heart" size={20} color={isFav ? '#EF4444' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <Text style={styles.description}>{profileSummary.description}</Text>

              <View style={styles.locationDetail}>
                <Ionicons name="location-outline" size={14} color="#64748B" />
                <Text style={styles.locationText}>{profileSummary.location}</Text>
              </View>

              <View style={styles.contactCard}>
                <View style={styles.contactRow}>
                  <View style={styles.contactLabelRow}>
                    <Ionicons name="call" size={16} color="#C2410C" style={styles.contactIcon} />
                    <Text style={styles.contactLabel}>Phone</Text>
                  </View>
                  <Text style={styles.contactValue}>{profileSummary.phone}</Text>
                </View>
                <View style={styles.contactRow}>
                  <View style={styles.contactLabelRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color="#C2410C" style={styles.contactIcon} />
                    <Text style={styles.contactLabel}>Meet-up</Text>
                  </View>
                  <Text style={styles.contactValue}>{profileSummary.meetupPoint}</Text>
                </View>
                <View style={styles.contactRow}>
                  <View style={styles.contactLabelRow}>
                    <Feather name="map-pin" size={16} color="#C2410C" style={styles.contactIcon} />
                    <Text style={styles.contactLabel}>Details</Text>
                  </View>
                  <Text style={styles.contactValue}>{profileSummary.meetupDetails}</Text>
                </View>
                <View style={styles.contactActions}>
                  {(vendorProfile?.mobile || params.mobile) && (
                    <TouchableOpacity
                      style={styles.contactActionBtn}
                      activeOpacity={0.8}
                      onPress={() => Linking.openURL(`tel:${phoneNumber}`)}
                    >
                      <Feather name="phone-call" size={14} color="#FFF" />
                      <Text style={styles.contactActionText}>Call</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.contactActionBtn, styles.messageActionBtn]}
                    activeOpacity={0.8}
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
              <MaterialCommunityIcons name={icon as any} size={20} color="#C2410C" />
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
                <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8} onPress={() => setSelectedProduct(null)}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.modalBody}>
                  <View style={styles.modalTitleRow}>
                    <Text style={styles.modalName}>{selectedProduct.name}</Text>
                    <Text style={styles.modalPriceText}>₱{selectedProduct.price}</Text>
                  </View>
                  <Text style={styles.modalDescTitle}>Description</Text>
                  <Text style={styles.modalDescText}>{selectedProduct.desc || "A must-try dish in Toledo!"}</Text>

                  <TouchableOpacity activeOpacity={0.8} style={{ width: '100%' }} onPress={() => {
                    handleAddItem(selectedProduct);
                    setSelectedProduct(null);
                  }} disabled={selectedProduct.stock === 0}>
                    <LinearGradient
                      colors={['#C2410C', '#9A3412']}
                      style={[styles.addBtnLarge, { opacity: selectedProduct.stock === 0 ? 0.5 : 1 }]}
                    >
                      <Text style={styles.addBtnLargeText}>
                        {selectedProduct.stock === 0 ? "Currently Unavailable" : "Add to Cart"}
                      </Text>
                    </LinearGradient>
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
              <TouchableOpacity onPress={() => setShowChat(false)} activeOpacity={0.8} style={styles.chatCloseBtn}>
                <Ionicons name="close" size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.chatBody}>
              {loadingMessages ? <Text style={styles.chatEmpty}>Loading messages...</Text> : chatMessages.length === 0 ? (
                <Text style={styles.chatEmpty}>No messages yet. Start the conversation.</Text>
              ) : chatMessages.map((m, idx) => (
                <View key={m.id || idx} style={[styles.chatBubble, m.sender_id === user?.id ? styles.chatBubbleUser : styles.chatBubbleVendor]}>
                  <Text style={[styles.chatBubbleText, m.sender_id === user?.id && styles.chatBubbleTextUser]}>{m.content}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message..."
                placeholderTextColor="#94A3B8"
                style={styles.chatTextInput}
              />
              <TouchableOpacity activeOpacity={0.8} onPress={handleSendMessage}>
                <LinearGradient
                  colors={['#C2410C', '#9A3412']}
                  style={styles.sendBtn}
                >
                  <Text style={styles.sendBtnText}>Send</Text>
                </LinearGradient>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerImageWrapper: { height: 260, width: '100%' },
  headerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  backBtn: { 
    position: 'absolute', 
    top: Platform.OS === 'android' ? 40 : 50, 
    left: 20, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    padding: 8, 
    borderRadius: 14, 
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  infoBox: { 
    paddingHorizontal: 20, 
    paddingTop: 28, 
    paddingBottom: 24, 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    marginTop: -32, 
    elevation: 8,
    shadowColor: '#C2410C',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  titleRowMinimal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorName: { fontSize: 24, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  favBtn: { 
    backgroundColor: '#F8FAFC', 
    padding: 10, 
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  favBtnActive: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' },
  description: { fontSize: 14, color: '#64748B', marginTop: 8, lineHeight: 20, fontWeight: '600' },
  locationDetail: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  locationText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  
  sectionHeader: { paddingHorizontal: 20, marginTop: 32, marginBottom: 16 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  accentLine: { width: 36, height: 4, backgroundColor: '#C2410C', marginTop: 6, borderRadius: 2 },
  
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  
  popularCard: { 
    width: CARD_WIDTH, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    elevation: 4, 
    shadowColor: '#C2410C', 
    shadowOpacity: 0.08, 
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden'
  },
  imageContainer: { width: '100%', height: 130 },
  popularItemImg: { width: '100%', height: '100%' },
  soldOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center' },
  soldOutText: { color: '#C2410C', fontWeight: '900', fontSize: 12 },
  
  popularCardContent: { padding: 12 },
  promoBadgeInline: { alignSelf: 'flex-start', backgroundColor: '#FFEDD5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6 },
  promoBadgeText: { color: '#C2410C', fontSize: 10, fontWeight: '900' },
  popularItemName: { fontSize: 15, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  popularItemDesc: { fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 10, fontWeight: '600' },
  
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  popularItemPrice: { fontSize: 16, fontWeight: '900', color: '#C2410C' },
  addToCartSmallBtn: { 
    backgroundColor: '#C2410C', 
    width: 32, 
    height: 32, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#C2410C',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2
  },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    height: height * 0.78, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  modalImg: { width: '100%', height: 300 },
  closeBtn: { 
    position: 'absolute', 
    top: 20, 
    right: 20, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    padding: 8, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  modalBody: { padding: 24, flex: 1, justifyContent: 'space-between' },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalName: { fontSize: 24, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3, flex: 1, marginRight: 10 },
  modalPriceText: { fontSize: 24, fontWeight: '900', color: '#C2410C' },
  modalDescTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginTop: 16 },
  modalDescText: { fontSize: 14, color: '#64748B', marginTop: 8, lineHeight: 22, fontWeight: '600' },
  
  addBtnLarge: { 
    paddingVertical: 16, 
    borderRadius: 18, 
    alignItems: 'center', 
    marginTop: 20,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnLargeText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  
  contactCard: { marginTop: 16, padding: 16, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  contactLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactIcon: { marginRight: 4 },
  contactLabel: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  contactValue: { flex: 1, textAlign: 'right', fontSize: 13, color: '#1E293B', fontWeight: '700' },
  
  contactActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  contactActionBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6, 
    backgroundColor: '#C2410C', 
    paddingVertical: 12, 
    borderRadius: 14,
    shadowColor: '#C2410C',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  messageActionBtn: { backgroundColor: '#7C2D12' },
  contactActionText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  chatContainer: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#C2410C',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10
  },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  chatTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  chatCloseBtn: { padding: 4, backgroundColor: '#F1F5F9', borderRadius: 12 },
  
  chatBody: { padding: 16, paddingBottom: 20 },
  chatBubble: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '80%' },
  chatBubbleVendor: { backgroundColor: '#F1F5F9', alignSelf: 'flex-start' },
  chatBubbleUser: { backgroundColor: '#C2410C', alignSelf: 'flex-end' },
  chatBubbleText: { color: '#1E293B', fontSize: 14, fontWeight: '600' },
  chatBubbleTextUser: { color: '#FFFFFF' },
  chatEmpty: { color: '#64748B', fontSize: 13, textAlign: 'center', paddingVertical: 20, fontWeight: '600' },
  
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#FFFFFF' },
  chatTextInput: { 
    flex: 1, 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 16, 
    marginRight: 10, 
    fontSize: 14, 
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontWeight: '600'
  },
  sendBtn: { 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C2410C',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  sendBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  
  toastContainer: { position: 'absolute', top: 50, left: 20, right: 20, alignItems: 'center', zIndex: 9999 },
  toastBubble: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  toastText: { color: '#FFF', fontWeight: '800', fontSize: 13 }
});