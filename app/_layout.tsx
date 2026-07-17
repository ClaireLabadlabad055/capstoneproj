import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { CartProvider } from '../context/CartContext';
import { ProductProvider } from '../context/ProductContext';
import { VendorProvider } from '../context/VendorContext'; // ✅ Added this
import { AuthProvider } from '../context/AuthContext';


export default function RootLayout() {
  return (
  <View style={styles.rootWrapper}>
      {/* Wrap everything in VendorProvider to sync profile changes */}
    <AuthProvider>
      <VendorProvider> 
        <ProductProvider>
          <CartProvider>
            <ThemeProvider value={DarkTheme}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#000' }, 
                  animation: 'fade', 
                  animationDuration: 400,
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="vendor" options={{ title: 'Vendor' }} />
                <Stack.Screen name="customer" options={{ title: 'Customer' }} />
                <Stack.Screen name="admin/home" options={{ title: 'Admin Home' }} />
                <Stack.Screen name="admin/vendor" options={{ title: 'Admin Vendors' }} />
                <Stack.Screen name="admin/approvals" options={{ title: 'Admin Approvals' }} />
                <Stack.Screen name="admin/transactions" options={{ title: 'Transaction Overview' }} />
                <Stack.Screen name="admin/audits" options={{ title: 'Menu Audits' }} />
                <Stack.Screen name="admin/support" options={{ title: 'Support & Moderation' }} />
              </Stack>
            </ThemeProvider>
          </CartProvider>
        </ProductProvider>
      </VendorProvider>
    </AuthProvider>
  </View>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
});