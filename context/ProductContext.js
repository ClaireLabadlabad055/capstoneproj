import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { decode } from 'base64-arraybuffer';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const ProductContext = createContext();

const normalizeProduct = (row, fallbackVendorName = 'Vendor') => {
  const imageValue = row?.img || row?.image_url || row?.image || null;
  return {
    id: row?.id?.toString() || `${Date.now()}`,
    name: row?.name || 'Untitled Item',
    price: String(row?.price ?? '0'),
    desc: row?.desc || row?.description || 'Freshly prepared for your customers.',
    category: row?.category || row?.product_category || row?.item_tag || (row?.orderType === 'Special Package' ? 'Special Packages' : 'Single Orders'),
    orderType: row?.orderType || row?.order_type || 'Single Order',
    stock: Number(row?.stock || 0),
    vendorName: row?.vendorName || row?.vendor_name || fallbackVendorName,
    vendorId: row?.vendor_id || row?.vendorId || null,
    img: imageValue,
    image_url: imageValue,
    image: imageValue,
  };
};

export const ProductProvider = ({ children }) => {
  const { user, userData } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshProducts = useCallback(async () => {
    setLoading(true);

    try {
      const query = supabase.from('products').select('*').order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;

      const normalized = (data || []).map((row) => normalizeProduct(row, 'Vendor'));
      // Ensure product image fields that reference storage paths are converted to public URLs
      const normalizedWithImages = await Promise.all((data || []).map(async (row, idx) => {
        const base = normalizeProduct(row, 'Vendor');
        const imageValue = row?.img || row?.image_url || row?.image || null;
        if (imageValue && typeof imageValue === 'string' && !imageValue.startsWith('http')) {
          try {
            const { data: publicData } = supabase.storage.from('products').getPublicUrl(imageValue);
            base.img = publicData?.publicUrl || base.img;
            base.image_url = publicData?.publicUrl || base.image_url;
            base.image = publicData?.publicUrl || base.image;
          } catch (e) {
            // keep original
          }
        }
        return base;
      }));

      setProducts(normalizedWithImages);

      const rowsNeedingBackfill = (data || []).filter((row) => {
        const imageValue = row?.img || row?.image_url || row?.image;
        return Boolean(imageValue) && !row?.img && !row?.image_url;
      });

      if (rowsNeedingBackfill.length > 0) {
        await Promise.all(rowsNeedingBackfill.map(async (row) => {
          const imageValue = row?.img || row?.image_url || row?.image;
          if (!imageValue) return;
          await supabase.from('products').update({ img: imageValue, image_url: imageValue }).eq('id', row.id);
        }));
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [userData?.full_name]);

  useEffect(() => {
    refreshProducts();

    const channel = supabase.channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        refreshProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshProducts, user?.id]);

  const uploadProductImage = async ({ uri, base64, productId }) => {
    if (!user?.id) return { success: false, error: new Error('No active vendor session.') };

    try {
      let fileBuffer;
      if (base64) {
        fileBuffer = decode(base64);
      } else if (uri) {
        const response = await fetch(uri);
        fileBuffer = await response.arrayBuffer();
      } else {
        throw new Error('No image data was provided.');
      }

      const filePath = `${user.id}/products/${productId || Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('products').getPublicUrl(filePath);
      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) throw new Error('The product image URL could not be generated.');

      return { success: true, publicUrl };
    } catch (error) {
      console.error('Failed to upload product image:', error);
      return { success: false, error };
    }
  };

  const addProduct = async (newProduct) => {
    const localProductId = newProduct.id || `local-${Date.now()}`;
    const imageUrl = typeof newProduct.img === 'string' ? newProduct.img : null;
    const payload = {
      name: newProduct.name,
      price: String(newProduct.price ?? '0'),
      desc: newProduct.desc || 'Freshly prepared for your customers.',
      stock: Number(newProduct.stock || 0),
      category: newProduct.category || (newProduct.orderType === 'Special Package' ? 'Special Packages' : 'Single Orders'),
      orderType: newProduct.orderType || 'Single Order',
      vendor_id: user?.id || newProduct.vendorId || null,
      vendorName: newProduct.vendorName || userData?.business_name || userData?.full_name || 'Vendor',
      vendor_name: newProduct.vendorName || userData?.business_name || userData?.full_name || 'Vendor',
      created_at: new Date().toISOString(),
      ...(imageUrl ? { img: imageUrl, image_url: imageUrl } : {}),
    };

    try {
      const { error } = await supabase.from('products').insert([payload]);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to save product:', error);
      return { success: false, error };
    }

    const normalized = normalizeProduct({
      ...payload,
      id: localProductId,
      orderType: newProduct.orderType || 'Single Order',
      category: newProduct.category || (newProduct.orderType === 'Special Package' ? 'Special Packages' : 'Single Orders'),
      vendorName: newProduct.vendorName || userData?.full_name || 'Vendor',
      vendor_id: newProduct.vendorId || user?.id || null,
      img: typeof newProduct.img === 'object' && newProduct.img?.uri ? newProduct.img.uri : (typeof newProduct.img === 'string' ? newProduct.img : null),
    }, newProduct.vendorName || userData?.full_name || 'Vendor');
    setProducts((prevProducts) => [normalized, ...prevProducts]);
    return { success: true };
  };

  const updateProduct = async (id, updatedFields) => {
    const payload = {
      ...updatedFields,
      price: String(updatedFields.price ?? '0'),
      stock: Number(updatedFields.stock || 0),
    };

    try {
      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to update product:', error);
    }

    setProducts((prevProducts) =>
      prevProducts.map((p) => (p.id === id ? { ...p, ...payload } : p))
    );
  };

  const deleteProduct = async (id) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete product:', error);
    }

    setProducts((prevProducts) => prevProducts.filter((p) => p.id !== id));
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, loading, refreshProducts, uploadProductImage }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};