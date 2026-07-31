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

  const { user, userData } = useAuth();

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

  // Fetch latest avatar_url from profiles table and sync into local userProfile
  useEffect(() => {
    const fetchAvatar = async () => {
      const userId = user?.id || userData?.id;
      if (!userId) return;
      try {
        const { data, error } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle();
        if (!error && data?.avatar_url) {
          setUserProfile((prev) => ({ ...prev, profileImage: data.avatar_url }));
        }
      } catch (e) {
        console.warn('Failed to fetch profile avatar:', e);
      }
    };

    fetchAvatar();
  }, [user?.id, userData?.id]);

  // --- Helper Functions ---
  const updateProfile = (updates) => setUserProfile((prev) => ({ ...prev, ...updates }));

  const syncCustomerProfile = async () => {
    const userId = user?.id || userData?.id;
    if (!userId) return;

    const profilePayload = {
      id: userId,
      full_name: userProfile.name,
      email: userProfile.email,
      phone: userProfile.phone,
      avatar_url: userProfile.profileImage,
      address: userProfile.address,
    };

    try {
      await supabase.from('customers').upsert([profilePayload]);
      await supabase.from('profiles').upsert([profilePayload]);
    } catch (e) {
      console.warn('Customer profile sync failed:', e);
    }
  };

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
  const placeOrder = async (pickupPointId, paymentMethod = 'COD', batchSchedule = 'Batch 1') => {
    if (cartItems.length === 0) return null;

    const checkoutId = `CH-${Date.now().toString().slice(-6)}`;
    const now = new Date();

    // Compute amounts for the whole checkout
    const subtotal = cartItems.reduce((sum, i) => sum + (Number(i.price || 0) * (i.qty || 1)), 0);
    const SERVICE_FEE_RATE = 0.05; // 5% service fee
    const serviceFee = Number((subtotal * SERVICE_FEE_RATE).toFixed(2));
    const total = Number((subtotal + serviceFee).toFixed(2));

    const vendorNames = Array.from(new Set((cartItems || []).map((item) => String(item.vendorName || 'Unknown'))));
    const vendorId = cartItems?.[0]?.vendorId || cartItems?.[0]?.vendor_id || null;

    // Ensure we persist a sensible vendor_name
    let resolvedVendorName = vendorNames[0] || 'Vendor';
    if ((!resolvedVendorName || resolvedVendorName === 'Vendor' || resolvedVendorName === 'Independent Vendor') && vendorId) {
      try {
        const { data: merchant } = await supabase.from('merchants').select('name').eq('id', vendorId).maybeSingle();
        if (merchant?.name) resolvedVendorName = merchant.name;
      } catch (e) {
        // ignore
      }
    }

    const firstItem = cartItems?.[0] || {};
    if (!resolvedVendorName || resolvedVendorName === 'Vendor' || resolvedVendorName === 'Independent Vendor') {
      resolvedVendorName = (firstItem.vendorName && firstItem.vendorName !== 'Independent Vendor')
        ? firstItem.vendorName
        : (firstItem.vendor_name || firstItem.vendorName || 'Unknown Vendor');
    }

    // Embed paymentMethod safely inside the items JSON array so merchants can see it
    const itemsWithPayment = cartItems.map(item => ({
      ...item,
      paymentMethod,
    }));

    const orderPayload = {
      id: checkoutId,
      user_id: userData?.id || null,
      items: itemsWithPayment,
      subtotal,
      serviceFee,
      total,
      pickup_point_id: pickupPointId || null, 
      batch_schedule: batchSchedule, // ✅ Syncs the selected batch schedule (e.g. Batch 2)
      status: 'Pending', // Forced to Pending so vendors can review and approve it
      paymentMethod,
      customer_name: userProfile.name,
      customerName: userProfile.name,
      vendor_name: resolvedVendorName,
      vendorName: resolvedVendorName,
      vendor_id: vendorId || firstItem.vendorId || null,
      order_details: itemsWithPayment,
      created_at: now.toISOString(),
    };

    try {
      await syncCustomerProfile();

      const itemCount = (orderPayload.items || []).reduce((s, it) => s + (Number(it.qty || 1) || 0), 0);

      const insertPayload = {
        id: orderPayload.id,
        user_id: user?.id || orderPayload.user_id,
        items: orderPayload.items,
        total: orderPayload.total,
        pickup_point_id: orderPayload.pickup_point_id, 
        batch_schedule: orderPayload.batch_schedule, // ✅ Writes exact batch choice straight to Supabase
        status: orderPayload.status,
        customer_name: orderPayload.customer_name,
        vendor_name: orderPayload.vendor_name || orderPayload.vendorName || 'Unknown Vendor',
        vendor_id: orderPayload.vendor_id || null,
        item_count: itemCount,
        order_details: orderPayload.items,
        created_at: orderPayload.created_at,
      };

      console.log('Placing order; pickupPointId:', pickupPointId, 'Batch:', batchSchedule);
      console.log('Insert payload:', insertPayload);
      
      const { data: inserted, error: insertError } = await supabase.from('orders').insert([insertPayload]).select();
      
      if (insertError) {
        console.error('Failed to persist order:', insertError);
        setOrders((prev) => [{ ...orderPayload, persisted: false, error: insertError }, ...prev]);
        setCartItems([]);
        return { checkoutId, success: false, error: insertError };
      }
      
      const savedOrder = inserted?.[0] || null;
      setOrders((prev) => [{ ...orderPayload, persisted: true, dbRow: savedOrder }, ...prev]);
      setCartItems([]);

      if (savedOrder && savedOrder.vendor_id && (user?.id || orderPayload.user_id)) {
        const customerId = user?.id || orderPayload.user_id;
        const customerName = userProfile.name || userData?.full_name || 'Customer';
        const pickupText = (typeof pickupPointId === 'string')
          ? pickupPointId
          : (pickupPointId && (pickupPointId.label || pickupPointId.name || String(pickupPointId))) || '';
        const pickupMessage = `Order ${checkoutId} is confirmed. Please schedule your pickup at ${pickupText || 'your selected location'} during ${batchSchedule}. Payment method: ${paymentMethod}. Reply here when you're ready to confirm your pickup time.`;

        await supabase.from('messages').insert([
          {
            conversation_id: `vendor:${savedOrder.vendor_id}`,
            sender_id: savedOrder.vendor_id,
            receiver_id: customerId,
            sender_name: resolvedVendorName,
            receiver_name: customerName,
            content: pickupMessage,
          },
        ]);
      }

      return { checkoutId, success: true, inserted: savedOrder };
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