import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SmartProductSelect = ({ 
  baseApi, 
  authToken, 
  onSelect, 
  placeholder = "Search products: LG 1.5 ton, Daikin split, etc...",
  value = null 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(value);
  
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // API instance
  const api = axios.create({
    baseURL: `${baseApi}/`,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
  });

  // Debounced search function
  const searchProducts = async (query) => {
    if (query.length < 2) {
      setProducts([]);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Searching for:', query);
      console.log('🌐 API URL:', `${baseApi}/product/product-search-all/?search=${encodeURIComponent(query)}`);
      
      const response = await api.get(`product/product-search-all/?search=${encodeURIComponent(query)}`);
      
      console.log('✅ API Response:', response.data);
      console.log('📊 Results count:', response.data.length);
      
      setProducts(response.data);
    } catch (error) {
      console.error('❌ Error searching products:', error);
      console.error('❌ Error details:', error.response?.data);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchProducts(query);
    }, 300);
  };

  // Handle product selection
  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setSearchQuery(product.display_text);
    setIsOpen(false);
    onSelect(product);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
    if (searchQuery.length >= 2) {
      searchProducts(searchQuery);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Search Input */}
      <input
        ref={inputRef}
        type="text"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
      />

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute right-3 top-3 pointer-events-none">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Searching products...
            </div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="px-4 py-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                onClick={() => handleProductSelect(product)}
              >
                <div className="font-medium text-gray-900">
                  {product.display_text}
                </div>
                <div className="text-sm text-gray-500">
                  SKU: {product.sku}
                </div>
              </div>
            ))
          ) : searchQuery.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No products found for "{searchQuery}"
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              Type at least 2 characters to search...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartProductSelect;