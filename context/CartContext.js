import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [userProfile, setUserProfile] = useState({
    name: "Claire Labadlabad",
    email: "claire.it@cctc.edu.ph",
    phone: "0912 345 6789",
    profileImage: null,
    address: "Poblacion, Toledo City, Cebu",
  });

  const { userData } = useAuth();

  useEffect(() => {
    if (userData) {
      setUserProfile((prev) => ({
        ...prev,
        name: userData.full_name || prev.name,
        email: userData.email || prev.email,
        phone: userData.phone || prev.phone,
        profileImage: userData.avatar_url || prev.profileImage,
        address: userData.address || prev.address,
      }));
    }
  }, [userData]);

  // --- Helper Functions ---
  const updateProfile = (updates) => setUserProfile((prev) => ({ ...prev, ...updates }));
  const addToCart = (product) => {
    setCartItems((prev) => {
      // Normalize image fields to ensure cart always contains usable src
      const imgVal = (product.img && (typeof product.img === 'string' ? product.img : (product.img?.uri || null)))
        || (product.image && (typeof product.image === 'string' ? product.image : (product.image?.uri || null)))
        || (product.image_url && (typeof product.image_url === 'string' ? product.image_url : (product.image_url?.uri || null)))
        || null;

      const normalizedProduct = {
        ...product,
        img: imgVal,
        image: imgVal,
        image_url: imgVal,
        qty: product.qty || 1,
        vendorName: product.vendorName || 'Independent Vendor',
      };

      const existing = prev.find(item => item.id === normalizedProduct.id && item.vendorName === normalizedProduct.vendorName);
      if (existing) {
        return prev.map(item => (item.id === normalizedProduct.id && item.vendorName === normalizedProduct.vendorName)
          ? { ...item, qty: (item.qty || 1) + 1 }
          : item
        );
      }
      return [...prev, normalizedProduct];
    });
  };

  const updateQty = (id, change, vendorName) => {
    setCartItems((prev) => 
      prev.map((item) => {
        if (item.id === id && (vendorName ? item.vendorName === vendorName : true)) {
          const newQty = (item.qty || 1) + change;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };
  const removeFromCart = (id, vendorName) => setCartItems(prev => prev.filter(item => !(item.id === id && (vendorName ? item.vendorName === vendorName : true))));
  const clearCart = () => setCartItems([]);
  const clearOrderHistory = () => setOrders([]);
  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
    );
  };

  // --- Place Order Logic ---
  const placeOrder = async (pickupPointId) => {
    if (cartItems.length === 0) return null;

    const checkoutId = `CH-${Date.now().toString().slice(-6)}`;
    const now = new Date();

    // Compute total for the whole checkout
    const total = cartItems.reduce((sum, i) => sum + (Number(i.price || 0) * (i.qty || 1)), 0);

    // Parent order record that OrderSuccess expects to find by id
    const vendorNames = Array.from(new Set((cartItems || []).map((item) => String(item.vendorName || 'Unknown'))));

    // Determine seller-provided pickup point (prefer first vendor's merchant setting)
    let sellerPickup = null;
    const vendorId = cartItems?.[0]?.vendorId || cartItems?.[0]?.vendor_id || null;
    if (vendorId) {
      try {
        const { data: merchant } = await supabase.from('merchants').select('pickup_landmark').eq('id', vendorId).maybeSingle();
        if (merchant) sellerPickup = merchant.pickup_landmark || null;
      } catch (e) {
        // ignore and fallback to provided pickupPointId
      }
    }

    // Ensure we persist a sensible vendor_name: prefer vendorName from cart, otherwise resolve merchant name by vendorId
    let resolvedVendorName = vendorNames[0] || 'Vendor';
    if ((!resolvedVendorName || resolvedVendorName === 'Vendor' || resolvedVendorName === 'Independent Vendor') && vendorId) {
      try {
        const { data: merchant } = await supabase.from('merchants').select('name').eq('id', vendorId).maybeSingle();
        if (merchant?.name) resolvedVendorName = merchant.name;
      } catch (e) {
        // ignore
      }
    }

    const orderPayload = {
      id: checkoutId,
      user_id: userData?.id || null,
      items: cartItems,
      total: total,
      // Store seller-provided pickup information in pickup_point_id (text column)
      pickup_point_id: sellerPickup || pickupPointId || null,
      status: 'Preparing',
      customer_name: userProfile.name,
      customerName: userProfile.name,
        // store items array under order_details for UI
        order_details: orderPayload.items,
        // include vendor_id when DB has the column (will be null if not present yet)
        vendor_id: vendorId || orderPayload.vendor_id || null,
      vendor_id: cartItems?.[0]?.vendorId || null,
      created_at: now.toISOString(),
    };

    try {
      // Only include columns that exist in the DB schema (snake_case).
      const itemCount = (orderPayload.items || []).reduce((s, it) => s + (Number(it.qty || 1) || 0), 0);

      const insertPayload = {
        id: orderPayload.id,
        user_id: orderPayload.user_id,
        items: orderPayload.items,
        total: orderPayload.total,
        pickup_point_id: orderPayload.pickup_point_id,
        status: orderPayload.status,
        customer_name: orderPayload.customer_name,
        // vendor_name is present in DB and required; vendor_id column does not exist in schema, omit it
        vendor_name: orderPayload.vendor_name || orderPayload.vendorName || 'Unknown Vendor',
        item_count: itemCount,
        // order_details expected by some UI: store items array under order_details as well
        order_details: orderPayload.items,
        created_at: orderPayload.created_at,
      };

      console.log('Placing order; vendorNames:', vendorNames, 'vendorId:', vendorId);
      console.log('Insert payload:', insertPayload);
      const { data: inserted, error: insertError } = await supabase.from('orders').insert([insertPayload]).select();
      if (insertError) {
        console.error('Failed to persist order:', insertError);
        // Return explicit error information for the caller and keep a local copy
        setOrders((prev) => [{ ...orderPayload, persisted: false, error: insertError }, ...prev]);
        setCartItems([]);
        return { checkoutId, success: false, error: insertError };
      }
      console.log('Insert result:', inserted);

      // inserted should contain the row we just created
      setOrders((prev) => [{ ...orderPayload, persisted: true, dbRow: inserted?.[0] || null }, ...prev]);
      setCartItems([]);
      return { checkoutId, success: true, inserted: inserted?.[0] || null };
    } catch (e) {
      console.error('Order insert exception:', e);
      setOrders((prev) => [{ ...orderPayload, persisted: false, error: e }, ...prev]);
      setCartItems([]);
      return { checkoutId, success: false, error: e };
    }
  };

  // --- Single Provider Return ---
  return (
    <CartContext.Provider value={{ 
      cartItems, orders, userProfile, setUserProfile, updateProfile,
      addToCart, removeFromCart, updateQty, clearCart,
      clearOrderHistory, placeOrder, updateOrderStatus 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);