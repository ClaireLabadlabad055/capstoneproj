import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../styles/globalStyles';
// ❌ REMOVE the CartProvider import here

export default function CustomerLayout() {
  return (
    /* ❌ REMOVE the <CartProvider> tags below */
    <Tabs
      screenOptions={{
        headerShown: false, 
        tabBarActiveTintColor: COLORS.primary, 
        tabBarInactiveTintColor: '#A8A8A8',
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 0,
          elevation: 20, 
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.05,
          shadowRadius: 15,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopLeftRadius: 30, 
          borderTopRightRadius: 30,
          position: 'absolute', 
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color }) => <Feather name="shopping-cart" size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />

      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="OrderSuccess" options={{ href: null }} />
      <Tabs.Screen name="VendorDetails" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
    </Tabs>
    /* ❌ REMOVE the </CartProvider> closing tag */
  );
}