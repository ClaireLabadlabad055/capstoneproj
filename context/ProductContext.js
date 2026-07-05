import React, { createContext, useContext, useState } from 'react';

const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  // Initial products - This matches what you had in VendorInventory
  const [products, setProducts] = useState([
    { 
      id: '1', 
      name: 'Classic Takoyaki', 
      price: '45.00', 
      desc: 'Classic Takoyaki with Octopus Filling.', 
      category: 'Single Orders',
      img: require('../assets/images/octo.png'), 
      stock: 24,
      vendorName: "Takoyaki Corner"
    },
    { 
      id: '2', 
      name: 'Cheesy Takoyaki', 
      price: '50.00', 
      desc: 'Cheesy Takoyaki with melted cheese.', 
      category: 'Special Packages',
      img: require('../assets/images/octo.png'), 
      stock: 12,
      vendorName: "Takoyaki Corner"
    },
    { 
      id: '11', 
      name: 'Classic Cookies', 
      price: '50.00', 
      desc: 'Classic cookies with chocolate chips.', 
      category: 'Single Orders',
      img: require('../assets/images/classic.png'), 
      stock: 12,
      vendorName: "Claire's Cookies"
    },
  ]);

  // Function to add a new product (Called by Vendor)
  const addProduct = (newProduct) => {
    setProducts((prevProducts) => [newProduct, ...prevProducts]);
  };

  // Function to update existing product (e.g., updating stock or price)
  const updateProduct = (id, updatedFields) => {
    setProducts((prevProducts) =>
      prevProducts.map((p) => (p.id === id ? { ...p, ...updatedFields } : p))
    );
  };

  // Function to delete a product
  const deleteProduct = (id) => {
    setProducts((prevProducts) => prevProducts.filter((p) => p.id !== id));
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct }}>
      {children}
    </ProductContext.Provider>
  );
};

// Custom hook for easy access
export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
};