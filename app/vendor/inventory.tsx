import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Linking,
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
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../styles/globalStyles';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2;

const VendorProductCard = ({ item, onDelete }: { item: any, onDelete: (id: string) => void }) => {
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
        <TouchableOpacity style={styles.deleteBadge} onPress={() => onDelete(item.id)}>
          <Feather name="trash-2" size={12} color="#FFF" />
        </TouchableOpacity>
        <View style={[styles.stockTag, { backgroundColor: item.stock === 0 ? '#FF4D4D' : COLORS.secondary }]}>
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
          <Text style={styles.popularItemPrice}>₱{item.price}</Text>
          <View style={styles.editIconSmall}><Feather name="edit-3" size={14} color={COLORS.primary} /></View>
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
  const [newCategory, setNewCategory] = useState('Snacks'); // Category state preserved
  const [orderType, setOrderType] = useState('Single Order'); 
  const [newProductImage, setNewProductImage] = useState<string | null>(null);

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
    const currentVendorName = vendorProfile?.name || vendorProfile?.business_name || userData?.business_name || userData?.full_name || '';

    const vendorItems = (products || []).filter((p: any) => {
      const productVendorId = p.vendorId || p.vendor_id || null;
      const productVendorName = p.vendorName || p.vendor_name || '';
      const matchesVendorId = Boolean(currentVendorId) && Boolean(productVendorId) && String(productVendorId) === String(currentVendorId);
      const matchesVendorName = Boolean(currentVendorName) && Boolean(productVendorName) && String(productVendorName).toLowerCase() === String(currentVendorName).toLowerCase();
      return matchesVendorId || matchesVendorName;
    });

    return [
      { title: 'Special Packages', icon: 'gift-outline', data: vendorItems.filter((p: any) => p.orderType === 'Special Package') },
      { title: 'Single Orders', icon: 'food-variant', data: vendorItems.filter((p: any) => p.orderType !== 'Special Package') },
    ].filter(section => section.data.length > 0);
  }, [products, user?.id, vendorProfile?.id, vendorProfile?.name, vendorProfile?.business_name, userData?.business_name, userData?.full_name]);

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
      sender_name: vendorProfile?.name || 'Vendor',
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

  const handleAddProduct = async () => {
    if (!newName || !newPrice) return Alert.alert('Error', 'Required fields missing');

    const productId = Date.now().toString();
    let imageUrl = null;

    if (newProductImage) {
      const uploadResult = await uploadProductImage({ uri: newProductImage, productId });
      if (!uploadResult.success) {
        Alert.alert('Upload failed', uploadResult.error?.message || 'Unable to upload the product photo.');
        return;
      }
      imageUrl = uploadResult.publicUrl;
    }

    const result = await addProduct({
      id: productId,
      name: newName,
      price: newPrice,
      stock: parseInt(newStock) || 0,
      desc: newDesc || 'A local favorite.',
      category: newCategory,
      orderType,
      vendorName: vendorProfile.name,
      vendorId: vendorProfile?.id || null,
      img: imageUrl || (newProductImage ? { uri: newProductImage } : null),
    });

    if (result?.success !== false) {
      setModalVisible(false);
      setNewName('');
      setNewPrice('');
      setNewStock('');
      setNewDesc('');
      setNewProductImage(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View>
        <View style={styles.inventoryHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={COLORS.secondary} /></TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.inventoryTitle}>Inventory</Text>
            <Text style={styles.inventorySubtitle}>Products and stock only</Text>
          </View>
          <TouchableOpacity style={styles.profileActionBtn} onPress={() => router.push('/vendor/profile-edit')}>
            <Feather name="settings" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addMainBtn} onPress={() => setModalVisible(true)}>
          <Feather name="plus" size={18} color="#FFF" /><Text style={styles.addMainBtnText}>Add New Product</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={groupedProducts}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="box" size={32} color="#CCC" />
            <Text style={styles.emptyStateTitle}>{loading ? 'Loading inventory...' : 'No products yet'}</Text>
            <Text style={styles.emptyStateSubtitle}>Add your first product to start syncing with the database.</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
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
              <VendorProductCard item={section.data[index]} onDelete={deleteProduct} />
              {nextItem ? <VendorProductCard item={nextItem} onDelete={deleteProduct} /> : <View style={{ width: CARD_WIDTH }} />}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <Modal visible={showChat} animationType="slide" transparent>
        <View style={styles.chatOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>{vendorProfile?.name || 'Vendor'}</Text>
              <TouchableOpacity onPress={() => setShowChat(false)}>
                <Ionicons name="close" size={22} color="#444" />
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
              <TextInput value={chatInput} onChangeText={setChatInput} placeholder="Type a message..." style={styles.chatTextInput} />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL WITH CATEGORY RESTORED */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>New Product Entry</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.productPhotoPicker} onPress={async () => {
                         let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1, base64: true });
                         if (!result.canceled && result.assets?.[0]) setNewProductImage(result.assets[0].uri);
                    }}>
                        {newProductImage ? <Image source={{ uri: newProductImage }} style={styles.pickedImage} /> : (
                            <View style={styles.photoPlaceholder}><Feather name="image" size={30} color="#AAA" /><Text style={styles.photoPlaceholderText}>Add Product Photo</Text></View>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.fieldLabel}>Service Type</Text>
                    <View style={styles.rowSelector}>
                        {['Single Order', 'Special Package'].map(t => (
                            <TouchableOpacity key={t} onPress={() => setOrderType(t)} style={[styles.selectorBtn, orderType === t && styles.selectorBtnActive]}>
                                <Text style={[styles.selectorBtnText, orderType === t && styles.selectorBtnTextActive]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.fieldLabel}>Item Name</Text>
                    <TextInput style={styles.inputField} placeholder="e.g. Special Takoyaki" value={newName} onChangeText={setNewName} />
                    
                    {/* --- CATEGORY SECTION ADDED BACK --- */}
                    <Text style={styles.fieldLabel}>Category</Text>
                    <View style={styles.catRow}>
                      {['Snacks', 'Sweets', 'Beverages', 'Meals'].map(cat => (
                        <TouchableOpacity key={cat} onPress={() => setNewCategory(cat)} style={[styles.catChip, newCategory === cat && styles.catChipActive]}>
                          <Text style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.fieldLabel}>Description</Text>
                    <TextInput style={[styles.inputField, { height: 60 }]} placeholder="What's included?" value={newDesc} onChangeText={setNewDesc} multiline />

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Price (₱)</Text>
                            <TextInput style={styles.inputField} placeholder="0" keyboardType="numeric" value={newPrice} onChangeText={setNewPrice} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Stock</Text>
                            <TextInput style={styles.inputField} placeholder="10" keyboardType="numeric" value={newStock} onChangeText={setNewStock} />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleAddProduct}><Text style={styles.saveBtnText}>Save Product</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelBtnText}>Discard</Text></TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 14,
    paddingBottom: 10,
    marginTop: Platform.OS === 'android' ? 8 : 6,
    backgroundColor: '#FFF'
  },
  headerContent: { flex: 1, marginLeft: 8, justifyContent: 'center' },
  inventoryTitle: { fontSize: 22, fontWeight: '900', color: COLORS.secondary, lineHeight: 24 },
  inventorySubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  backBtn: { backgroundColor: '#FFF', padding: 10, borderRadius: 15, elevation: 5, marginTop: 0 },
  profileActionBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginLeft: 8, marginTop: 0 },
  addMainBtn: { backgroundColor: COLORS.secondary, flexDirection: 'row', padding: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 12, marginBottom: 8 },
  addMainBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  sectionHeader: { paddingHorizontal: 25, marginTop: 35, marginBottom: 15 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyStateTitle: { fontSize: 16, fontWeight: '800', color: COLORS.secondary, marginTop: 12 },
  emptyStateSubtitle: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 6 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.secondary },
  accentLine: { width: 40, height: 4, backgroundColor: COLORS.primary, marginTop: 5, borderRadius: 2 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  popularCard: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 24, elevation: 6 },
  imageContainer: { width: '100%', height: 120 },
  popularItemImg: { width: '100%', height: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  deleteBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255, 77, 77, 0.9)', padding: 8, borderRadius: 12 },
  stockTag: { position: 'absolute', bottom: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockTagText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  popularCardContent: { padding: 12 },
  promoBadgeInline: { alignSelf: 'flex-start', backgroundColor: '#FFF0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  promoBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '900' },
  popularItemName: { fontSize: 15, fontWeight: '800', color: COLORS.secondary },
  popularItemDesc: { fontSize: 10, color: '#AAA', marginTop: 3, marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  popularItemPrice: { fontSize: 17, fontWeight: '900', color: COLORS.primary },
  editIconSmall: { backgroundColor: '#F0F0F0', padding: 8, borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 35, padding: 25, maxHeight: '90%' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.secondary, marginBottom: 20, textAlign: 'center' },
  productPhotoPicker: { width: '100%', height: 160, backgroundColor: '#F8F8F8', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  pickedImage: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center' },
  photoPlaceholderText: { fontSize: 12, color: '#AAA', fontWeight: '700', marginTop: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: COLORS.secondary, marginBottom: 8, marginTop: 15 },
  rowSelector: { flexDirection: 'row', gap: 10 },
  selectorBtn: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#EEE', alignItems: 'center' },
  selectorBtnActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  selectorBtnText: { fontSize: 12, color: '#777', fontWeight: '800' },
  selectorBtnTextActive: { color: '#FFF' },
  inputField: { backgroundColor: '#F7F7F7', padding: 16, borderRadius: 16, fontSize: 14, color: '#333' },
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  chatContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderColor: '#F2F2F2' },
  chatTitle: { fontSize: 16, fontWeight: '800', color: '#222' },
  chatBody: { padding: 14, paddingBottom: 0 },
  chatBubble: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '80%' },
  chatBubbleVendor: { backgroundColor: '#F4F6F8', alignSelf: 'flex-start' },
  chatBubbleCustomer: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' },
  chatBubbleText: { color: '#111' },
  chatEmpty: { color: '#666', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderColor: '#F2F2F2' },
  chatTextInput: { flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  sendBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  sendBtnText: { color: '#FFF', fontWeight: '700' },
  
  // Category styles added back
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  catChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F0F0F0' },
  catChipActive: { backgroundColor: COLORS.primary },
  catChipText: { fontSize: 12, color: '#777', fontWeight: '700' },
  catChipTextActive: { color: '#FFF' },

  saveBtn: { backgroundColor: COLORS.primary, padding: 20, borderRadius: 22, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 18 },
  cancelBtn: { padding: 15, alignItems: 'center' },
  cancelBtnText: { color: '#BBB', fontWeight: '700' }
});