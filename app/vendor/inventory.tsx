import React, { useState, useMemo } from 'react';
import { 
  View, Text, Image, TouchableOpacity, SafeAreaView, StyleSheet, 
  Dimensions, SectionList, Modal, StatusBar, TextInput, Alert, ScrollView 
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../styles/globalStyles';
import { useProducts } from '../../context/ProductContext'; 
import { useVendor } from '../../context/VendorContext'; 

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2;

const VendorProductCard = ({ item, onDelete }: { item: any, onDelete: (id: string) => void }) => {
  const renderImg = () => {
    if (typeof item.img === 'number') return item.img;
    if (item.img?.uri) return { uri: item.img.uri };
    if (typeof item.img === 'string') return { uri: item.img };
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
  const { products, addProduct, deleteProduct } = useProducts();
  const { vendorProfile, updateProfile } = useVendor();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(vendorProfile.name);
  const [tempDesc, setTempDesc] = useState(vendorProfile.description);

  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newDesc, setNewDesc] = useState(''); 
  const [newCategory, setNewCategory] = useState('Snacks'); // Category state preserved
  const [orderType, setOrderType] = useState('Single Order'); 
  const [newProductImage, setNewProductImage] = useState<string | null>(null);

  const groupedProducts = useMemo(() => {
    const vendorItems = products.filter(p => p.vendorName === vendorProfile.name || p.vendorId === "v2");
    return [
      { title: 'Special Packages', icon: 'gift-outline', data: vendorItems.filter((p: any) => p.orderType === 'Special Package') },
      { title: 'Single Orders', icon: 'food-variant', data: vendorItems.filter((p: any) => p.orderType !== 'Special Package') },
    ].filter(section => section.data.length > 0);
  }, [products, vendorProfile.name]);

  const handleAddProduct = () => {
    if (!newName || !newPrice) return Alert.alert("Error", "Required fields missing");
    addProduct({
      id: Date.now().toString(),
      name: newName,
      price: newPrice,
      stock: parseInt(newStock) || 0,
      desc: newDesc || "A local favorite.",
      category: newCategory, // Passing category logic preserved
      orderType: orderType,
      vendorName: vendorProfile.name, 
      vendorId: "v2",
      img: newProductImage ? { uri: newProductImage } : require('../../assets/images/octo.png'),
    });
    setModalVisible(false);
    setNewName(''); setNewPrice(''); setNewStock(''); setNewDesc(''); setNewProductImage(null);
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
              <Image source={typeof vendorProfile.coverImage === 'string' ? { uri: vendorProfile.coverImage } : vendorProfile.coverImage} style={styles.headerImage} />
              <View style={styles.imageOverlay} />
              <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={COLORS.secondary} /></TouchableOpacity>
              <TouchableOpacity style={styles.cameraOverlay} onPress={async () => {
                 let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 1 });
                 if (!result.canceled) updateProfile({ coverImage: result.assets[0].uri });
              }}><Feather name="camera" size={18} color="#FFF" /></TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.titleRow}>
                {isEditingProfile ? <TextInput style={styles.inputName} value={tempName} onChangeText={setTempName} autoFocus /> : <Text style={styles.vendorName}>{vendorProfile.name}</Text>}
                <TouchableOpacity style={[styles.editCircle, isEditingProfile && {backgroundColor: COLORS.primary}]} onPress={() => isEditingProfile ? (updateProfile({ name: tempName, description: tempDesc }), setIsEditingProfile(false)) : setIsEditingProfile(true)}>
                  <Feather name={isEditingProfile ? "check" : "edit-2"} size={16} color={isEditingProfile ? "#FFF" : COLORS.primary} />
                </TouchableOpacity>
              </View>
              {!isEditingProfile && <Text style={styles.description}>{vendorProfile.description}</Text>}
              {isEditingProfile && <TextInput style={styles.inputDesc} value={tempDesc} onChangeText={setTempDesc} multiline />}
              
              <View style={styles.statsRow}>
                <View style={styles.statTag}><Ionicons name="star" size={14} color="#FFD700" /><Text style={styles.statText}>4.8</Text></View>
                <View style={styles.statTag}><MaterialCommunityIcons name="map-marker-distance" size={14} color={COLORS.primary} /><Text style={styles.statText}>1.2 km</Text></View>
                <View style={styles.statTag}><Feather name="clock" size={14} color="#4CAF50" /><Text style={styles.statText}>15-20 min</Text></View>
              </View>
              
              <TouchableOpacity style={styles.addMainBtn} onPress={() => setModalVisible(true)}>
                  <Feather name="plus" size={18} color="#FFF" /><Text style={styles.addMainBtnText}>Add New Product</Text>
              </TouchableOpacity>
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
              <VendorProductCard item={section.data[index]} onDelete={deleteProduct} />
              {nextItem ? <VendorProductCard item={nextItem} onDelete={deleteProduct} /> : <View style={{ width: CARD_WIDTH }} />}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* MODAL WITH CATEGORY RESTORED */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>New Product Entry</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.productPhotoPicker} onPress={async () => {
                         let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
                         if (!result.canceled) setNewProductImage(result.assets[0].uri);
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
  headerImageWrapper: { height: 240, width: '100%' },
  headerImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  cameraOverlay: { position: 'absolute', bottom: 60, right: 25, backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 25 },
  backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: '#FFF', padding: 10, borderRadius: 15, elevation: 5 },
  infoBox: { paddingHorizontal: 25, paddingTop: 30, paddingBottom: 25, backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, elevation: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorName: { fontSize: 26, fontWeight: '900', color: COLORS.secondary },
  inputName: { fontSize: 24, fontWeight: '900', color: COLORS.primary, borderBottomWidth: 1, borderBottomColor: '#EEE', flex: 1 },
  editCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  description: { fontSize: 13, color: '#666', marginTop: 10, lineHeight: 20 },
  inputDesc: { fontSize: 13, backgroundColor: '#F9F9F9', padding: 10, borderRadius: 10, marginTop: 10 },
  statsRow: { flexDirection: 'row', marginTop: 18, gap: 10 },
  statTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F6F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  statText: { fontWeight: '800', color: COLORS.secondary, fontSize: 12 },
  addMainBtn: { backgroundColor: COLORS.secondary, flexDirection: 'row', padding: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 },
  addMainBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  sectionHeader: { paddingHorizontal: 25, marginTop: 35, marginBottom: 15 },
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