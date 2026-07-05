import React, { createContext, useState, useContext } from 'react';

// Create the Context
const VendorContext = createContext();

export const VendorProvider = ({ children }) => {
  // This is the source of truth for the shop's details
  const [vendorProfile, setVendorProfile] = useState({
    name: "Takoyaki Corner",
    description: "Authentic Japanese delicacies in Toledo City. Freshly made every day.",
    location: "Poblacion, Toledo City",
    coverImage: require('../assets/images/cstbg.jpg'), // Default local image
  });

  // Function to update the profile from the Vendor side
  const updateProfile = (newData) => {
    setVendorProfile((prev) => ({
      ...prev,
      ...newData
    }));
  };

  return (
    <VendorContext.Provider value={{ vendorProfile, updateProfile }}>
      {children}
    </VendorContext.Provider>
  );
};

// Custom hook for easy access
export const useVendor = () => useContext(VendorContext);