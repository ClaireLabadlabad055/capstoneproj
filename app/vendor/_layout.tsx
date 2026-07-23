import { Stack } from 'expo-router';
import { COLORS } from '../../styles/globalStyles';

export default function VendorLayout() {
  return (
    <Stack
      screenOptions={{
        // Global header styling for all vendor screens
        headerStyle: {
          backgroundColor: '#FFF',
        },
        headerTintColor: COLORS.secondary,
        headerTitleStyle: {
          fontWeight: '800',
          color: '#222',
        },
        headerShadowVisible: false, // Keeps the clean, minimalist look
      }}
    >
      {/* The main Dashboard */}
      <Stack.Screen 
        name="home" 
        options={{ 
          headerShown: false,
        }} 
      />
      
      {/* The Inventory Screen */}
      <Stack.Screen 
        name="inventory" 
        options={{ 
          presentation: 'card',
          headerTitle: 'My Inventory',
          headerShown: false
        }} 
      />

      <Stack.Screen 
        name="profile-edit" 
        options={{
          presentation: 'card',
          headerTitle: 'Shop Profile',
          headerShown: false
        }} 
      />

      <Stack.Screen 
        name="history" 
        options={{
          presentation: 'card',
          headerTitle: 'Vendor Order History',
          headerShown: false
        }} 
      />

      
    </Stack>
  );
}