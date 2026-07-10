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
      const existing = prev.find(item => item.id === product.id && item.vendorName === product.vendorName);
      if (existing) {
        return prev.map(item => (item.id === product.id && item.vendorName === product.vendorName)
          ? { ...item, qty: (item.qty || 1) + 1 }
          : item
        );
      }
      return [...prev, { ...product, qty: product.qty || 1, vendorName: product.vendorName || 'Independent Vendor' }];
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
    const orderPayload = {
      id: checkoutId,
      user_id: userData?.id || null,
      items: cartItems,
      total: total,
      pickup_point_id: pickupPointId || null,
      status: 'Preparing',
      customer_name: userProfile.name,
      created_at: now.toISOString(),
    };

    try {
      const { data: inserted, error: insertError } = await supabase.from('orders').insert([orderPayload]).select();
      if (insertError) {
        console.error('Failed to persist order:', insertError);
        // Return explicit error information for the caller
        setOrders((prev) => [{ ...orderPayload, persisted: false, error: insertError }, ...prev]);
        setCartItems([]);
        return { checkoutId, success: false, error: insertError };
      }
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

    // Keep a local copy as well (could be used for order history UI)
    setOrders((prev) => [{ ...orderPayload }, ...prev]);
    setCartItems([]);

    return { checkoutId };
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