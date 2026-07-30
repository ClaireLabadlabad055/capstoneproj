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

const normalizePickupLandmarks = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          return trimmed ? { landmark: trimmed, details: '' } : null;
        }

        if (item && typeof item === 'object') {
          const landmark = String(item?.landmark || item?.name || item?.place || item?.spot || '').trim();
          const details = String(item?.details || item?.description || item?.instructions || '').trim();
          return landmark ? { landmark, details } : null;
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return normalizePickupLandmarks(parsed);
    } catch (e) {
      return [{ landmark: trimmed, details: '' }];
    }
  }

  return [];
};

const serializePickupLandmarks = (value) => {
  const normalized = normalizePickupLandmarks(value);
  return normalized.length > 0 ? JSON.stringify(normalized) : '';
};

export const buildVendorProfile = ({
  targetUserId,
  merchantData,
  customerData,
  profileData,
  persistedProfile,
  userData,
  defaultProfile = defaultVendorProfile,
}) => {
  // Explicitly extract the location/barangay with all casing variations
  const rawBarangay = merchantData?.Brangay || merchantData?.barangay || merchantData?.BRANGAY;
  const resolvedLocation = rawBarangay 
    ? (rawBarangay.toLowerCase().includes('toledo') ? rawBarangay : `${rawBarangay}, Toledo City`)
    : (customerData?.address || profileData?.address || persistedProfile?.location || defaultProfile.location);

  const rawPickupDetails = merchantData?.pickup_details || merchantData?.landmark_details || merchantData?.Landmark_details || merchantData?.meetup_details || persistedProfile?.meetupDetails || '';
  const rawPickupLandmark = merchantData?.pickup_landmark || merchantData?.Pickup_landmark || merchantData?.meetup_point || persistedProfile?.meetupPoint || '';
  const rawPickupLandmarks = merchantData?.pickup_landmarks || merchantData?.pickupLandmarks || persistedProfile?.pickupLandmarks || persistedProfile?.pickup_landmarks || [];
  const normalizedPickupLandmarks = normalizePickupLandmarks(rawPickupLandmarks);
  const firstPickupOption = normalizedPickupLandmarks[0];
  const resolvedMeetupPoint = firstPickupOption?.landmark || rawPickupLandmark || persistedProfile?.meetupPoint || defaultProfile.meetupPoint;
  const resolvedMeetupDetails = firstPickupOption?.details || rawPickupDetails || persistedProfile?.meetupDetails || defaultProfile.meetupDetails;

  return {
    ...defaultProfile,
    ...(persistedProfile || {}),
    id: targetUserId,
    business_name: merchantData?.business_name || persistedProfile?.business_name || userData?.business_name || '',
    name: merchantData?.business_name || persistedProfile?.business_name || customerData?.full_name || profileData?.full_name || userData?.full_name || persistedProfile?.name || defaultProfile.name,
    description: persistedProfile?.description || (merchantData?.delicacy_type ? `${merchantData.delicacy_type}` : defaultProfile.description),
    location: resolvedLocation,
    favorite: persistedProfile?.favorite || false,
    meetupPoint: resolvedMeetupPoint,
    meetupDetails: resolvedMeetupDetails,
    pickupLandmarks: normalizedPickupLandmarks,
    mobile: customerData?.phone || profileData?.phone || merchantData?.phone || persistedProfile?.mobile || defaultProfile.mobile,
    coverImage: persistedProfile?.coverImage || defaultProfile.coverImage,
    qrImage: merchantData?.qr_code_url || persistedProfile?.qrImage || null,
    gcashName: merchantData?.gcash_name || merchantData?.gcashName || persistedProfile?.gcashName || '',
    gcashNumber: merchantData?.gcash_number || merchantData?.gcashNumber || persistedProfile?.gcashNumber || '',
    approvalStatus: normalizeApprovalStatus(merchantData?.approval_status || customerData?.approval_status || merchantData?.status || customerData?.status || persistedProfile?.approvalStatus || persistedProfile?.approval_status || ''),
    approval_status: normalizeApprovalStatus(merchantData?.approval_status || customerData?.approval_status || merchantData?.status || customerData?.status || persistedProfile?.approval_status || persistedProfile?.approvalStatus || ''),
  };
};

const getVendorStorageKey = (userId) => `vendor_profile_${userId}`;

const isMissingColumnError = (error) => {
  const message = error?.message || '';
  return message.includes('Could not find the') || message.includes('column') || message.includes('schema cache');
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

      const mergedCoverImage = (() => {
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

  const uploadQrImage = useCallback(async ({ uri, base64 }) => {
    if (!user?.id) return { success: false, error: new Error('No active vendor session.') };

    try {
      let fileBuffer;
      if (base64) {
        fileBuffer = decode(base64);
      } else if (uri) {
        const response = await fetch(uri);
        fileBuffer = await response.arrayBuffer();
      } else {
        throw new Error('No QR image data was provided.');
      }

      const filePath = `${user.id}/qrs/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('covers').getPublicUrl(filePath);
      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) throw new Error('The QR code URL could not be generated.');

      const nextProfile = { ...vendorProfile, qrImage: publicUrl };
      setVendorProfile(nextProfile);
      await saveVendorProfileToStorage(user.id, nextProfile);

      const { error: merchantUpdateError } = await supabase
        .from('merchants')
        .update({ qr_code_url: publicUrl })
        .eq('id', user.id);

      if (merchantUpdateError) {
        console.warn('Vendor QR code saved locally but the database update failed:', merchantUpdateError.message);
      }

      await syncVendorProfile(user.id);
      return { success: true, qrImage: publicUrl, storedPath: filePath };
    } catch (error) {
      console.error('Failed to upload vendor QR image:', error);
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
      const normalizedPickupLandmarks = normalizePickupLandmarks(updates.pickupLandmarks ?? nextProfile.pickupLandmarks ?? vendorProfile.pickupLandmarks);
      const firstPickupOption = normalizedPickupLandmarks[0];

      if (typeof updates.name !== 'undefined') merchantUpdates.business_name = updates.name;
      if (typeof updates.location !== 'undefined') {
        merchantUpdates.barangay = updates.location;
        merchantUpdates.Brangay = updates.location; // Support uppercase schema column
        profileUpdates.address = updates.location;
        customerUpdates.address = updates.location;
      }
      if (typeof updates.meetupDetails !== 'undefined') {
        merchantUpdates.pickup_details = updates.meetupDetails;
        merchantUpdates.landmark_details = updates.meetupDetails; // Support alternate column
        nextProfile.meetupDetails = updates.meetupDetails;
      }
      if (typeof updates.description !== 'undefined') {
        merchantUpdates.delicacy_type = updates.description;
        nextProfile.description = updates.description;
      }
      if (typeof updates.mobile !== 'undefined') {
        profileUpdates.phone = updates.mobile;
        customerUpdates.phone = updates.mobile;
        merchantUpdates.phone = updates.mobile;
        nextProfile.mobile = updates.mobile;
      }
      if (typeof updates.meetupPoint !== 'undefined') {
        merchantUpdates.pickup_landmark = updates.meetupPoint;
        merchantUpdates.pickup_details = updates.meetupDetails || nextProfile.meetupDetails || vendorProfile.meetupDetails || '';
        merchantUpdates.landmark_details = merchantUpdates.pickup_details;
        nextProfile.meetupPoint = updates.meetupPoint;
      }
      if (typeof updates.pickupLandmarks !== 'undefined' || normalizedPickupLandmarks.length > 0) {
        const serializedPickupLandmarks = serializePickupLandmarks(normalizedPickupLandmarks);
        merchantUpdates.pickup_landmarks = serializedPickupLandmarks;
        merchantUpdates.pickup_landmark = firstPickupOption?.landmark || updates.meetupPoint || nextProfile.meetupPoint || vendorProfile.meetupPoint || '';
        merchantUpdates.pickup_details = firstPickupOption?.details || updates.meetupDetails || nextProfile.meetupDetails || vendorProfile.meetupDetails || '';
        merchantUpdates.landmark_details = merchantUpdates.pickup_details;
        nextProfile.pickupLandmarks = normalizedPickupLandmarks;
        nextProfile.meetupPoint = firstPickupOption?.landmark || updates.meetupPoint || nextProfile.meetupPoint || vendorProfile.meetupPoint;
        nextProfile.meetupDetails = firstPickupOption?.details || updates.meetupDetails || nextProfile.meetupDetails || vendorProfile.meetupDetails;
      }
      const nextGcashName = typeof updates.gcashName !== 'undefined' ? updates.gcashName : updates.gcash_name;
      if (typeof nextGcashName !== 'undefined') {
        merchantUpdates.gcash_name = nextGcashName;
        nextProfile.gcashName = nextGcashName;
      }
      const nextGcashNumber = typeof updates.gcashNumber !== 'undefined' ? updates.gcashNumber : updates.gcash_number;
      if (typeof nextGcashNumber !== 'undefined') {
        merchantUpdates.gcash_number = nextGcashNumber;
        nextProfile.gcashNumber = nextGcashNumber;
      }
      if (typeof updates.qrImage !== 'undefined' || typeof updates.qr_code_url !== 'undefined') {
        const resolvedQrImage = typeof updates.qrImage !== 'undefined' ? updates.qrImage : updates.qr_code_url;
        merchantUpdates.qr_code_url = resolvedQrImage;
        nextProfile.qrImage = resolvedQrImage;
      }

      let wroteToDatabase = false;

      if (Object.keys(merchantUpdates).length > 0) {
        const { error: fullUpdateError } = await supabase
          .from('merchants')
          .update(merchantUpdates)
          .eq('id', user.id);

        if (!fullUpdateError) {
          wroteToDatabase = true;
        } else {
          console.warn('Batch merchant update failed, attempting individual column syncs:', fullUpdateError.message);
          
          for (const [key, val] of Object.entries(merchantUpdates)) {
            const { error: singleError } = await supabase
              .from('merchants')
              .update({ [key]: val })
              .eq('id', user.id);
            
            if (!singleError) {
              wroteToDatabase = true;
            } else if (!isMissingColumnError(singleError)) {
              console.error(`Failed to update merchant column ${key}:`, singleError.message);
            }
          }
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);

        if (!profileError) wroteToDatabase = true;
      }

      if (Object.keys(customerUpdates).length > 0) {
        const { error: customerError } = await supabase
          .from('customers')
          .update(customerUpdates)
          .eq('id', user.id);

        if (!customerError) wroteToDatabase = true;
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
    <VendorContext.Provider value={{ vendorProfile, updateProfile, saveVendorProfile, syncVendorProfile, uploadCoverImage, uploadQrImage, loading }}>
      {children}
    </VendorContext.Provider>
  );
};

export const useVendor = () => useContext(VendorContext);