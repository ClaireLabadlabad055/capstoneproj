import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabaseClient';
import storage from '../lib/storage';
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

const normalizeApprovalStatus = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (['approved', 'active', 'accepted', 'verified', 'complete'].includes(normalizedValue)) return 'approved';
  if (['rejected', 'declined', 'denied'].includes(normalizedValue)) return 'rejected';
  if (['pending', 'pending approval', 'pending review'].includes(normalizedValue)) return 'pending';
  return normalizedValue;
};

export const buildVendorProfile = ({
  targetUserId,
  merchantData,
  customerData,
  profileData,
  persistedProfile,
  userData,
  defaultProfile = defaultVendorProfile,
}) => ({
  ...defaultProfile,
  ...(persistedProfile || {}),
  id: targetUserId,
  name: merchantData?.business_name || customerData?.full_name || profileData?.full_name || userData?.full_name || persistedProfile?.name || defaultProfile.name,
  description: persistedProfile?.description || (merchantData?.delicacy_type ? `${merchantData.delicacy_type} from your kitchen.` : defaultProfile.description),
  location: merchantData?.barangay ? `${merchantData.barangay}, Toledo City` : customerData?.address || profileData?.address || persistedProfile?.location || defaultProfile.location,
  favorite: persistedProfile?.favorite || false,
  meetupPoint: merchantData?.pickup_landmark || persistedProfile?.meetupPoint || defaultProfile.meetupPoint,
  meetupDetails: persistedProfile?.meetupDetails || merchantData?.pickup_details || defaultProfile.meetupDetails,
  mobile: customerData?.phone || profileData?.phone || persistedProfile?.mobile || defaultProfile.mobile,
  coverImage: persistedProfile?.coverImage || defaultProfile.coverImage,
  approvalStatus: normalizeApprovalStatus(merchantData?.approval_status || customerData?.approval_status || merchantData?.status || customerData?.status || persistedProfile?.approvalStatus || persistedProfile?.approval_status || ''),
  approval_status: normalizeApprovalStatus(merchantData?.approval_status || customerData?.approval_status || merchantData?.status || customerData?.status || persistedProfile?.approval_status || persistedProfile?.approvalStatus || ''),
});

const getVendorStorageKey = (userId) => `vendor_profile_${userId}`;

const isMissingColumnError = (error) => {
  const message = error?.message || '';
  return message.includes('Could not find the') || message.includes('column') || message.includes('schema cache');
};

const updateWithFallback = async (table, id, payload, fallbackPayloads = []) => {
  const attempts = [payload, ...fallbackPayloads].filter((item) => item && Object.keys(item).length > 0);
  if (!attempts.length) return { success: true, skipped: true };

  let lastError = null;
  for (const attemptPayload of attempts) {
    const { error } = await supabase.from(table).update(attemptPayload).eq('id', id);
    if (!error) return { success: true };
    lastError = error;
    if (!isMissingColumnError(error)) throw error;
  }

  return { success: false, error: lastError };
};

const saveVendorProfileToStorage = async (userId, profile) => {
  if (!userId) return;
  try {
    await storage.setItem(getVendorStorageKey(userId), JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to persist vendor profile:', error);
  }
};

const readVendorProfileFromStorage = async (userId) => {
  if (!userId) return null;
  try {
    const raw = await storage.getItem(getVendorStorageKey(userId));
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

          const mergedProfile = buildVendorProfile({
        targetUserId,
        merchantData,
        customerData,
        profileData,
        persistedProfile,
        userData,
        defaultProfile: defaultVendorProfile,
      });

      const mergedCoverImage = ((): any => {
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
      })();

      const finalProfile = {
        ...mergedProfile,
        coverImage: mergedCoverImage,
      };

      setVendorProfile(finalProfile);
      await saveVendorProfileToStorage(targetUserId, finalProfile);

      setVendorProfile(finalProfile);
      await saveVendorProfileToStorage(targetUserId, finalProfile);
    } catch (error) {
      console.error('Vendor profile sync failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userData?.full_name]);

  useEffect(() => {
    if (!user?.id) {
      setVendorProfile(defaultVendorProfile);
      setLoading(false);
      return;
    }

    syncVendorProfile(user.id);

    const channel = supabase.channel(`vendor-profile-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchants', filter: `id=eq.${user.id}` }, () => {
        syncVendorProfile(user.id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'customers', filter: `id=eq.${user.id}` }, () => {
        syncVendorProfile(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, syncVendorProfile]);

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
      const profileUpdates = {};
      const customerUpdates = {};

      if (typeof updates.name !== 'undefined') merchantUpdates.business_name = updates.name;
      if (typeof updates.location !== 'undefined') {
        merchantUpdates.barangay = updates.location;
        profileUpdates.address = updates.location;
        customerUpdates.address = updates.location;
      }
      if (typeof updates.meetupDetails !== 'undefined') {
        merchantUpdates.pickup_details = updates.meetupDetails;
        nextProfile.meetupDetails = updates.meetupDetails;
      }
      if (typeof updates.description !== 'undefined') {
        merchantUpdates.delicacy_type = updates.description;
        nextProfile.description = updates.description;
      }
      if (typeof updates.mobile !== 'undefined') {
        profileUpdates.phone = updates.mobile;
        customerUpdates.phone = updates.mobile;
        nextProfile.mobile = updates.mobile;
      }
      if (typeof updates.meetupPoint !== 'undefined') {
        merchantUpdates.pickup_landmark = updates.meetupPoint;
      }

      let wroteToDatabase = false;

      if (Object.keys(merchantUpdates).length) {
        const result = await updateWithFallback(
          'merchants',
          user.id,
          merchantUpdates,
          [
            { business_name: merchantUpdates.business_name },
            { barangay: merchantUpdates.barangay },
            { pickup_details: merchantUpdates.pickup_details },
            { pickup_landmark: merchantUpdates.pickup_landmark },
            { delicacy_type: merchantUpdates.delicacy_type },
          ].filter((item) => item && Object.keys(item).length > 0)
        );
        wroteToDatabase = wroteToDatabase || result.success;
      }

      if (Object.keys(profileUpdates).length) {
        const result = await updateWithFallback(
          'profiles',
          user.id,
          profileUpdates,
          [{ address: profileUpdates.address }, { phone: profileUpdates.phone }].filter((item) => item && Object.keys(item).length > 0)
        );
        wroteToDatabase = wroteToDatabase || result.success;
      }

      if (Object.keys(customerUpdates).length) {
        const result = await updateWithFallback(
          'customers',
          user.id,
          customerUpdates,
          [{ address: customerUpdates.address }, { phone: customerUpdates.phone }].filter((item) => item && Object.keys(item).length > 0)
        );
        wroteToDatabase = wroteToDatabase || result.success;
      }

      await saveVendorProfileToStorage(user.id, nextProfile);
      await syncVendorProfile(user.id);
      return { success: true, savedLocally: true, syncedToDatabase: wroteToDatabase };
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