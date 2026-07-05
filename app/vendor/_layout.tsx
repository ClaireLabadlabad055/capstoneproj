import { Stack } from 'expo-router';
import { COLORS } from '../../styles/globalStyles';

export default function VendorLayout() {
  return (
    <Stack
      screenOptions={{
        // Global header styling for all vendor screens
        headerStyle: {
          backgroundColor: COLORS.secondary,
        },
        headerTintColor: '#FFF',
        headerTitleStyle: {
          fontWeight: '800',
        },
        headerShadowVisible: false, // Keeps the clean, minimalist look
        headerBackTitleVisible: false, // Hides the "Back" text for a cleaner UI
      }}
    >
      {/* The main Dashboard */}
      <Stack.Screen 
        name="home" 
        options={{ 
          headerShown: false // We keep this hidden because your home.tsx has a custom header
        }} 
      />
      
      {/* The Inventory Screen */}
      <Stack.Screen 
        name="inventory" 
        options={{ 
          presentation: 'card', // Standard slide transition
          headerTitle: 'My Inventory',
          headerShown: false // Set to false if you want to keep your custom top bar
        }} 
      />

      
    </Stack>
  );
}