import React, { createContext, useState, useContext } from 'react';

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
    landmark: "Near Toledo City Science High School"
  });

  const updateProfile = (updates) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
  };

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find(item => item.id === product.id && item.vendorName === product.vendorName);
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && item.vendorName === product.vendorName) 
            ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1, vendorName: product.vendorName || 'Independent Vendor' }];
    });
  };

  const updateQty = (id, change) => {
    setCartItems((prev) => 
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.qty + change;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCartItems([]);
  const clearOrderHistory = () => setOrders([]);

  const placeOrder = (deliveryMethod = 'Delivery') => {
    if (cartItems.length === 0) return null;

    const checkoutId = `CH-${Date.now().toString().slice(-4)}`;
    const now = new Date(); // Single reference point for time

    const groupedByVendor = cartItems.reduce((acc, item) => {
      const vName = item.vendorName; 
      if (!acc[vName]) acc[vName] = [];
      acc[vName].push(item);
      return acc;
    }, {});

    const newlyCreatedOrders = Object.keys(groupedByVendor).map((vName) => {
      const vendorItems = groupedByVendor[vName];
      const subtotal = vendorItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
      
      const vendorPrefix = vName.substring(0, 2).toUpperCase().replace(/\s/g, 'X');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);

      return {
        id: `TG-${vendorPrefix}-${randomSuffix}`, 
        checkoutId: checkoutId,
        vendorName: vName,
        items: JSON.parse(JSON.stringify(vendorItems)), 
        total: deliveryMethod === 'Delivery' ? subtotal + 45 : subtotal,
        method: deliveryMethod,
        // ✅ NEW: Precise ISO string for the Live Timer logic
        createdAt: now.toISOString(), 
        date: now.toLocaleDateString('en-GB'),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.getTime(),
        status: 'Preparing',
        customerName: userProfile.name,
        shippingAddress: userProfile.address
      };
    });

    setOrders((prev) => [...newlyCreatedOrders, ...prev]);
    setCartItems([]);
    
    return { checkoutId }; 
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

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