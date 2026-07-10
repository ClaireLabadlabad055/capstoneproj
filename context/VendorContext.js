import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const VendorContext = createContext();

const defaultVendorProfile = {
  name: 'Your Kitchen',
  description: 'Freshly prepared delicacies for your customers.',
  location: 'Toledo City',
  favorite: false,
  meetupPoint: 'Pickup Point',
  meetupDetails: '',
  mobile: '',
  coverImage: require('../assets/images/cstbg.jpg'),
};

const getVendorStorageKey = (userId) => `vendor_profile_${userId}`;

const saveVendorProfileToStorage = async (userId, profile) => {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(getVendorStorageKey(userId), JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to persist vendor profile:', error);
  }
};

const readVendorProfileFromStorage = async (userId) => {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(getVendorStorageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to read vendor profile from storage:', error);
    return null;
  }
};

export const VendorProvider = ({ children }) => {
  const { user, userData } = useAuth();
  const [vendorProfile, setVendorProfile] = useState(defaultVendorProfile);
  const [loading, setLoading] = useState(true);

  const syncVendorProfile = useCallback(async (targetUserId = user?.id) => {
    if (!targetUserId) {
      setVendorProfile(defaultVendorProfile);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const persistedProfile = await readVendorProfileFromStorage(targetUserId);
      const [merchantResponse, customerResponse, profileResponse] = await Promise.all([
        supabase.from('merchants').select('*').eq('id', targetUserId).maybeSingle(),
        supabase.from('customers').select('*').eq('id', targetUserId).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', targetUserId).maybeSingle(),
      ]);

      const merchantData = merchantResponse.data;
      const customerData = customerResponse.data;
      const profileData = profileResponse.data;

          const mergedProfile = {
        ...defaultVendorProfile,
        ...(persistedProfile || {}),
        id: targetUserId,
        name: merchantData?.business_name || customerData?.full_name || profileData?.full_name || userData?.full_name || persistedProfile?.name || 'Your Kitchen',
        description: persistedProfile?.description || (merchantData?.delicacy_type ? `${merchantData.delicacy_type} from your kitchen.` : 'Freshly prepared delicacies for your customers.'),
        location: merchantData?.barangay ? `${merchantData.barangay}, Toledo City` : customerData?.address || profileData?.address || persistedProfile?.location || 'Toledo City',
        favorite: persistedProfile?.favorite || false,
        meetupPoint: merchantData?.pickup_landmark || persistedProfile?.meetupPoint || 'Pickup Point',
        meetupDetails: persistedProfile?.meetupDetails || merchantData?.pickup_details || '',
        mobile: customerData?.phone || profileData?.phone || persistedProfile?.mobile || '',
        coverImage: ((): any => {
          const val = merchantData?.cover_image || persistedProfile?.coverImage || defaultVendorProfile.coverImage;
          if (typeof val === 'string' && !val.startsWith('http')) {
            try {
              let bucket = 'covers';
              const path = val;
              if (path.includes('/products/') || path.startsWith('products/')) bucket = 'products';
              const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
              return publicData?.publicUrl || val;
            } catch (e) {
              return val;
            }
          }
          return val;
        })(),
      };

      setVendorProfile(mergedProfile);
      await saveVendorProfileToStorage(targetUserId, mergedProfile);
    } catch (error) {
      console.error('Vendor profile sync failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userData?.full_name]);

  useEffect(() => {
    syncVendorProfile();
  }, [syncVendorProfile]);

  const updateProfile = (newData) => {
    setVendorProfile((prev) => {
      const nextProfile = {
        ...prev,
        ...newData,
      };

      if (user?.id) {
        saveVendorProfileToStorage(user.id, nextProfile);
      }

      return nextProfile;
    });
  };

  const uploadCoverImage = useCallback(async ({ uri, base64 }) => {
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

      const filePath = `${user.id}/covers/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('covers').getPublicUrl(filePath);
      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) throw new Error('The cover image URL could not be generated.');

      // Keep public URL in local profile for immediate UI display, but persist the raw storage path in the DB
      const nextProfile = { ...vendorProfile, coverImage: publicUrl };
      setVendorProfile(nextProfile);
      await saveVendorProfileToStorage(user.id, nextProfile);

      const { error: merchantUpdateError } = await supabase
        .from('merchants')
        .update({ cover_image: filePath })
        .eq('id', user.id);

      if (merchantUpdateError) {
        console.warn('Vendor cover image saved locally but the database update failed:', merchantUpdateError.message);
      }

      await syncVendorProfile(user.id);
      return { success: true, coverImage: publicUrl, storedPath: filePath };
    } catch (error) {
      console.error('Failed to upload vendor cover image:', error);
      return { success: false, error };
    }
  }, [syncVendorProfile, user?.id, vendorProfile]);

  const saveVendorProfile = async (updates = {}) => {
    if (!user?.id) return { success: false, error: new Error('No active vendor session.') };

    const nextProfile = { ...vendorProfile, ...updates };
    setVendorProfile(nextProfile);

    try {
      const merchantUpdates = {};
      const customerUpdates = {};
      const profileUpdates = {};

      if (typeof updates.name !== 'undefined') merchantUpdates.business_name = updates.name;
      if (typeof updates.location !== 'undefined') {
        merchantUpdates.barangay = updates.location;
        customerUpdates.address = updates.location;
        profileUpdates.address = updates.location;
      }
      if (typeof updates.meetupDetails !== 'undefined') {
        merchantUpdates.pickup_details = updates.meetupDetails;
        nextProfile.meetupDetails = updates.meetupDetails;
      }
      if (typeof updates.description !== 'undefined') {
        nextProfile.description = updates.description;
      }
      if (typeof updates.mobile !== 'undefined') {
        // Some schema variants keep phone in profiles instead of customers.
        profileUpdates.phone = updates.mobile;
      }
      if (typeof updates.meetupPoint !== 'undefined') {
        merchantUpdates.pickup_landmark = updates.meetupPoint;
      }

      const requests = [];
      if (Object.keys(merchantUpdates).length) {
        requests.push(supabase.from('merchants').update(merchantUpdates).eq('id', user.id));
      }
      if (Object.keys(customerUpdates).length) {
        requests.push(supabase.from('customers').update(customerUpdates).eq('id', user.id));
      }
      if (Object.keys(profileUpdates).length) {
        requests.push(supabase.from('profiles').update(profileUpdates).eq('id', user.id));
      }

      if (requests.length) {
        const results = await Promise.all(requests);
        const firstError = results.find((result) => result?.error);
        if (firstError) {
          throw firstError.error;
        }
      }

      await saveVendorProfileToStorage(user.id, nextProfile);
      await syncVendorProfile(user.id);
      return { success: true };
    } catch (error) {
      console.error('Failed to save vendor profile:', error);
      return { success: false, error };
    }
  };

  return (
    <VendorContext.Provider value={{ vendorProfile, updateProfile, saveVendorProfile, syncVendorProfile, uploadCoverImage, loading }}>
      {children}
    </VendorContext.Provider>
  );
};

export const useVendor = () => useContext(VendorContext);