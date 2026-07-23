import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    SectionList,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../context/ProductContext';
import { useVendor } from '../../context/VendorContext';
import GradientHeader from '../_components/GradientHeader';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../styles/globalStyles';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2;

const VendorProductCard = ({ item, onDelete, onEdit, onToggleAvailability }: { item: any, onDelete: (id: string) => void, onEdit: (item: any) => void, onToggleAvailability: (item: any) => void }) => {
  const renderImg = () => {
    if (typeof item.img === 'number') return item.img;
    if (item.img?.uri) return { uri: item.img.uri };
    if (typeof item.img === 'string') return { uri: item.img };
    if (typeof item.image_url === 'string') return { uri: item.image_url };
    if (typeof item.image === 'string') return { uri: item.image };
    return require('../../assets/images/octo.png');
  };

  return (
    <View style={styles.popularCard}>
      <View style={styles.imageContainer}>
        <Image source={renderImg()} style={styles.popularItemImg} />
        <TouchableOpacity style={styles.deleteBadge} onPress={() => onDelete(item.id)} activeOpacity={0.8}>
          <Feather name="trash-2" size={13} color="#FFF" />
        </TouchableOpacity>
        <View style={[styles.stockTag, { backgroundColor: item.stock === 0 ? '#B91C1C' : '#C2410C' }]}>
          <Text style={styles.stockTagText}>{item.stock === 0 ? 'OUT' : `QTY: ${item.stock}`}</Text>
        </View>
      </View>
      <View style={styles.popularCardContent}>
        {item.orderType === 'Special Package' && (
          <View style={styles.promoBadgeInline}><Text style={styles.promoBadgeText}>PROMO</Text></View>
        )}
        <Text style={styles.popularItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.popularItemDesc} numberOfLines={1}>{item.desc || "Toledo's finest."}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.popularItemPrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
          <View style={styles.cardActionsRow}>
            <TouchableOpacity style={styles.editIconSmall} onPress={() => onEdit(item)} activeOpacity={0.8}>
              <Feather name="edit-3" size={14} color="#C2410C" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.availabilityToggle, item.stock === 0 ? styles.availabilityToggleOff : styles.availabilityToggleOn]} onPress={() => onToggleAvailability(item)} activeOpacity={0.8}>
              <Text style={[styles.availabilityToggleText, { color: item.stock === 0 ? '#B91C1C' : '#15803D' }]}>{item.stock === 0 ? 'Out' : 'In'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function VendorInventory() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { products, addProduct, deleteProduct, loading, uploadProductImage } = useProducts();
  const { vendorProfile } = useVendor();

  const [modalVisible, setModalVisible] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newDesc, setNewDesc] = useState(''); 
  const [newCategory, setNewCategory] = useState('Snacks');
  const [orderType, setOrderType] = useState('Single Order'); 
  const [newProductImage, setNewProductImage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [fetchedMerchantName, setFetchedMerchantName] = useState<string>('');

  const fetchMerchantDetails = useCallback(async () => {
    const activeVendorId = vendorProfile?.id || user?.id;
    if (!activeVendorId) return;

    try {
      // Query merchants matching id safely without user_id column error
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', activeVendorId)
        .maybeSingle();

      if (merchantData) {
        const foundName = merchantData.business_name || merchantData.name || merchantData.store_name;
        if (foundName) setFetchedMerchantName(String(foundName));
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('business_name, full_name, store_name')
        .eq('id', activeVendorId)
        .maybeSingle();

      if (profileData) {
        const profileName = profileData.business_name || profileData.store_name || profileData.full_name;
        if (profileName) setFetchedMerchantName(String(profileName));
      }
    } catch (error) {
      console.warn('Merchant fetch exception:', error);
    }
  }, [vendorProfile?.id, user?.id]);

  useEffect(() => {
    fetchMerchantDetails();
  }, [fetchMerchantDetails]);

  const resolvedVendorName = useMemo(() => {
    return (
      vendorProfile?.business_name ||
      vendorProfile?.name ||
      fetchedMerchantName ||
      userData?.business_name ||
      userData?.full_name ||
      user?.full_name ||
      user?.email ||
      'Your Kitchen'
    );
  }, [vendorProfile, fetchedMerchantName, userData, user]);

  const refreshChatMessages = async (vendorId = user?.id) => {
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
    if (!showChat || !user?.id) return;
    refreshChatMessages(user.id);

    const channel = supabase.channel(`vendor-chat-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload: any) => {
        const newConversationId = payload?.new?.conversation_id;
        const oldConversationId = payload?.old?.conversation_id;
        if (newConversationId === `vendor:${user.id}` || oldConversationId === `vendor:${user.id}`) {
          refreshChatMessages(user.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [showChat, user?.id]);

  const groupedProducts = useMemo(() => {
    const currentVendorId = user?.id || vendorProfile?.id || null;
    const currentVendorNames = [
      vendorProfile?.name,
      vendorProfile?.business_name,
      fetchedMerchantName,
      userData?.business_name,
      userData?.full_name
    ].filter(Boolean).map(n => String(n).toLowerCase());

    const vendorItems = (products || []).filter((p: any) => {
      const productVendorId = p.vendorId || p.vendor_id || null;
      const productVendorName = p.vendorName || p.vendor_name || '';
      const matchesVendorId = Boolean(currentVendorId) && Boolean(productVendorId) && String(productVendorId) === String(currentVendorId);
      const matchesVendorName = Boolean(productVendorName) && currentVendorNames.includes(String(productVendorName).toLowerCase());
      return matchesVendorId || matchesVendorName;
    });

    return [
      { title: 'Special Packages', icon: 'gift-outline', data: vendorItems.filter((p: any) => p.orderType === 'Special Package') },
      { title: 'Single Orders', icon: 'food-variant', data: vendorItems.filter((p: any) => p.orderType !== 'Special Package') },
    ].filter(section => section.data.length > 0);
  }, [products, user?.id, vendorProfile?.id, vendorProfile?.name, vendorProfile?.business_name, fetchedMerchantName, userData?.business_name, userData?.full_name]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user?.id) return;

    const content = chatInput.trim();
    const recipientId = chatMessages?.[chatMessages.length - 1]?.sender_id && chatMessages[chatMessages.length - 1]?.sender_id !== user.id
      ? chatMessages[chatMessages.length - 1].sender_id
      : null;

    const { error } = await supabase.from('messages').insert([{
      conversation_id: `vendor:${user.id}`,
      sender_id: user.id,
      receiver_id: recipientId,
      sender_name: resolvedVendorName,
      receiver_name: recipientId ? 'Customer' : 'Customer',
      content,
    }]);

    if (error) {
      Alert.alert('Message failed', error.message);
      return;
    }

    setChatInput('');
    await refreshChatMessages(user.id);
  };

  const resetProductForm = () => {
    setNewName('');
    setNewPrice('');
    setNewStock('');
    setNewDesc('');
    setNewCategory('Snacks');
    setOrderType('Single Order');
    setNewProductImage(null);
    setEditMode(false);
    setEditingProductId(null);
  };

  const openEditProduct = (item: any) => {
    setEditMode(true);
    setEditingProductId(item.id);
    setNewName(item.name || '');
    setNewPrice(String(item.price ?? ''));
    setNewStock(String(item.stock ?? ''));
    setNewDesc(item.desc || '');
    setNewCategory(item.category || 'Snacks');
    setOrderType(item.orderType || 'Single Order');
    setNewProductImage(typeof item.img === 'string' ? item.img : (item.image_url || item.image || null));
    setModalVisible(true);
  };

  const handleToggleAvailability = async (item: any) => {
    const nextStock = item.stock === 0 ? 1 : 0;
    try {
      const { error } = await supabase.from('products').update({ stock: nextStock }).eq('id', item.id);
      if (error) throw error;

      if (typeof (item as any).id === 'string') {
        await supabase.from('products').update({ stock: nextStock }).eq('id', item.id);
      }

      Alert.alert('Availability updated', nextStock === 0 ? 'Item marked out of stock.' : 'Item marked available.');
    } catch (error: any) {
      Alert.alert('Update failed', error?.message || 'Unable to change availability.');
    }
  };

  const handleSaveProduct = async () => {
    if (!newName || !newPrice) return Alert.alert('Error', 'Required fields missing');

    try {
      let imageUrl = null;
      if (newProductImage && typeof newProductImage === 'string' && !newProductImage.startsWith('http') && !newProductImage.startsWith('data:')) {
        const uploadResult = await uploadProductImage({ uri: newProductImage, productId: editingProductId || Date.now().toString() });
        if (!uploadResult.success) {
          Alert.alert('Upload failed', uploadResult.error?.message || 'Unable to upload the product photo.');
          return;
        }
        imageUrl = uploadResult.publicUrl;
      }

      const payload = {
        name: newName,
        price: String(newPrice),
        stock: Number(newStock || 0),
        desc: newDesc || "Toledo's finest.",
        category: newCategory,
        orderType,
        vendorName: resolvedVendorName,
        vendor_name: resolvedVendorName,
        vendor_id: vendorProfile?.id || user?.id || null,
        ...(imageUrl ? { img: imageUrl, image_url: imageUrl } : {}),
      };

      if (editMode && editingProductId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProductId);
        if (error) throw error;
      } else {
        const productId = Date.now().toString();
        const result = await addProduct({
          id: productId,
          ...payload,
          img: imageUrl || (newProductImage ? { uri: newProductImage } : null),
        });
        if (result?.success === false) throw new Error('Unable to add product.');
      }

      setModalVisible(false);
      resetProductForm();
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Unable to save the product.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <GradientHeader
        colors={['#C2410C', '#9A3412', '#7C2D12']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#C2410C" />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity style={styles.profileActionBtn} onPress={() => router.push('/vendor/profile-edit')} activeOpacity={0.8}>
            <Feather name="settings" size={15} color="#C2410C" />
          </TouchableOpacity>
        }
        style={{ paddingVertical: 24, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 44 : 54, marginBottom: 10 }}
      >
        <View style={styles.inventoryTitleWrapper}>
          <Text style={styles.inventoryTitle}>Inventory</Text>
          <Text style={styles.inventorySubtitle}>Products and stock management</Text>
        </View>
      </GradientHeader>

      <TouchableOpacity style={styles.addMainBtn} onPress={() => setModalVisible(true)} activeOpacity={0.9}>
        <Feather name="plus" size={18} color="#FFF" />
        <Text style={styles.addMainBtnText}>Add New Product</Text>
      </TouchableOpacity>

      <SectionList
        sections={groupedProducts}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="box" size={40} color="#C2410C" />
            <Text style={styles.emptyStateTitle}>{loading ? 'Loading inventory...' : 'No products yet'}</Text>
            <Text style={styles.emptyStateSubtitle}>Add your first product to start syncing with your storefront.</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
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
              <VendorProductCard item={section.data[index]} onDelete={deleteProduct} onEdit={openEditProduct} onToggleAvailability={handleToggleAvailability} />
              {nextItem ? <VendorProductCard item={nextItem} onDelete={deleteProduct} onEdit={openEditProduct} onToggleAvailability={handleToggleAvailability} /> : <View style={{ width: CARD_WIDTH }} />}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <Modal visible={showChat} animationType="slide" transparent>
        <View style={styles.chatOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>{resolvedVendorName}</Text>
              <TouchableOpacity onPress={() => setShowChat(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.chatBody}>
              {loadingMessages ? <Text style={styles.chatEmpty}>Loading messages...</Text> : chatMessages.length === 0 ? (
                <Text style={styles.chatEmpty}>No messages yet. Start the conversation.</Text>
              ) : chatMessages.map((message, index) => (
                <View key={message.id || index} style={[styles.chatBubble, message.sender_id === user?.id ? styles.chatBubbleVendor : styles.chatBubbleCustomer]}>
                  <Text style={styles.chatBubbleText}>{message.content}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput value={chatInput} onChangeText={setChatInput} placeholder="Type a message..." style={styles.chatTextInput} placeholderTextColor="#94A3B8" />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage} activeOpacity={0.8}>
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{editMode ? 'Edit Product' : 'New Product Entry'}</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.productPhotoPicker} onPress={async () => {
                         let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1, base64: true });
                         if (!result.canceled && result.assets?.[0]) setNewProductImage(result.assets[0].uri);
                    }} activeOpacity={0.8}>
                        {newProductImage ? <Image source={{ uri: newProductImage }} style={styles.pickedImage} /> : (
                            <View style={styles.photoPlaceholder}><Feather name="image" size={30} color="#C2410C" /><Text style={styles.photoPlaceholderText}>Add Product Photo</Text></View>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.fieldLabel}>Service Type</Text>
                    <View style={styles.rowSelector}>
                        {['Single Order', 'Special Package'].map(t => (
                            <TouchableOpacity key={t} onPress={() => setOrderType(t)} style={[styles.selectorBtn, orderType === t && styles.selectorBtnActive]} activeOpacity={0.8}>
                                <Text style={[styles.selectorBtnText, orderType === t && styles.selectorBtnTextActive]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.fieldLabel}>Item Name</Text>
                    <TextInput style={styles.inputField} placeholder="e.g. Special Takoyaki" placeholderTextColor="#94A3B8" value={newName} onChangeText={setNewName} />
                    
                    <Text style={styles.fieldLabel}>Category</Text>
                    <View style={styles.catRow}>
                      {['Snacks', 'Sweets', 'Beverages', 'Meals'].map(cat => (
                        <TouchableOpacity key={cat} onPress={() => setNewCategory(cat)} style={[styles.catChip, newCategory === cat && styles.catChipActive]} activeOpacity={0.8}>
                          <Text style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.fieldLabel}>Description</Text>
                    <TextInput style={[styles.inputField, { height: 70, textAlignVertical: 'top' }]} placeholder="What's included?" placeholderTextColor="#94A3B8" value={newDesc} onChangeText={setNewDesc} multiline />

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Price (₱)</Text>
                            <TextInput style={styles.inputField} placeholder="0" placeholderTextColor="#94A3B8" keyboardType="numeric" value={newPrice} onChangeText={setNewPrice} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Stock</Text>
                            <TextInput style={styles.inputField} placeholder="10" placeholderTextColor="#94A3B8" keyboardType="numeric" value={newStock} onChangeText={setNewStock} />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct} activeOpacity={0.9}><Text style={styles.saveBtnText}>{editMode ? 'Save Changes' : 'Save Product'}</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); resetProductForm(); }} activeOpacity={0.8}><Text style={styles.cancelBtnText}>Discard</Text></TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inventoryTitleWrapper: { alignItems: 'flex-start', width: '100%' },
  inventoryTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  inventorySubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2, fontWeight: '700' },
  backBtn: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA' },
  profileActionBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' },
  addMainBtn: { backgroundColor: '#C2410C', flexDirection: 'row', padding: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 16, marginBottom: 8, shadowColor: '#C2410C', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  addMainBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  sectionHeader: { paddingHorizontal: 20, marginTop: 28, marginBottom: 14 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, paddingHorizontal: 24 },
  emptyStateTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginTop: 12, letterSpacing: -0.3 },
  emptyStateSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, fontWeight: '600' },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  accentLine: { width: 40, height: 4, backgroundColor: '#C2410C', marginTop: 6, borderRadius: 2 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  popularCard: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#C2410C', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 120 },
  popularItemImg: { width: '100%', height: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  deleteBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(185, 28, 28, 0.9)', padding: 8, borderRadius: 12 },
  stockTag: { position: 'absolute', bottom: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockTagText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  popularCardContent: { padding: 14 },
  promoBadgeInline: { alignSelf: 'flex-start', backgroundColor: '#FFEDD5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  promoBadgeText: { color: '#C2410C', fontSize: 10, fontWeight: '900' },
  popularItemName: { fontSize: 15, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  popularItemDesc: { fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 10, fontWeight: '600' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  popularItemPrice: { fontSize: 16, fontWeight: '900', color: '#C2410C', letterSpacing: -0.3 },
  cardActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editIconSmall: { backgroundColor: '#FFEDD5', padding: 8, borderRadius: 12 },
  availabilityToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  availabilityToggleOn: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
  availabilityToggleOff: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  availabilityToggleText: { fontSize: 11, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24, maxHeight: '90%', borderWidth: 1, borderColor: '#F1F5F9' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B', marginBottom: 18, textAlign: 'center', letterSpacing: -0.3 },
  productPhotoPicker: { width: '100%', height: 160, backgroundColor: '#F8FAFC', borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
  pickedImage: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center' },
  photoPlaceholderText: { fontSize: 12, color: '#64748B', fontWeight: '800', marginTop: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '900', color: '#1E293B', marginBottom: 6, marginTop: 12 },
  rowSelector: { flexDirection: 'row', gap: 10 },
  selectorBtn: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
  selectorBtnActive: { backgroundColor: '#C2410C', borderColor: '#C2410C' },
  selectorBtnText: { fontSize: 12, color: '#64748B', fontWeight: '800' },
  selectorBtnTextActive: { color: '#FFF' },
  inputField: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0', fontWeight: '600' },
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  chatContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  chatTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  chatBody: { padding: 16, paddingBottom: 0 },
  chatBubble: { padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '80%' },
  chatBubbleVendor: { backgroundColor: '#F8FAFC', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0' },
  chatBubbleCustomer: { backgroundColor: '#C2410C', alignSelf: 'flex-end' },
  chatBubbleText: { color: '#1E293B', fontWeight: '600', fontSize: 13 },
  chatEmpty: { color: '#64748B', fontSize: 13, textAlign: 'center', paddingVertical: 12, fontWeight: '600' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: '#F1F5F9' },
  chatTextInput: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0', color: '#1E293B' },
  sendBtn: { backgroundColor: '#C2410C', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  sendBtnText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  catChipActive: { backgroundColor: '#C2410C', borderColor: '#C2410C' },
  catChipText: { fontSize: 12, color: '#64748B', fontWeight: '800' },
  catChipTextActive: { color: '#FFF' },
  saveBtn: { backgroundColor: '#C2410C', padding: 16, borderRadius: 18, alignItems: 'center', marginTop: 24, shadowColor: '#C2410C', shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  cancelBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#64748B', fontWeight: '800', fontSize: 13 }
});