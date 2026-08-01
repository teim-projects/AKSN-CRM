import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Base from '../Base';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 
import { MdEdit, MdDelete, MdFilterList, MdZoomIn } from 'react-icons/md';
import { Package } from 'lucide-react'; 
import Swal from 'sweetalert2';
import ProductForm from './ProductForm'; 
import AdvancedTableFilter from '../AdvancedTableFilter';
import RecordViewer from '../RecordViewer';
import { useUserRole } from '../../hooks/useAuth';

const ProductList = () => {
    const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
    const { hasPermission } = useUserRole(BASE_API);
    const canCreateProduct = hasPermission("products", "create");
    const canEditProduct = hasPermission("products", "edit");
    const canDeleteProduct = hasPermission("products", "delete");
    const navigate = useNavigate(); 
    const [products, setProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal interaction states 
    const [showProductForm, setShowProductForm] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState(null);

    // Active Selected Filter Pill State
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Filter state
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filteredData, setFilteredData] = useState([]);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Record Viewer state
    const [viewOpen, setViewOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const token = useMemo(() => (
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        ""
    ), []);

    // Create axios instance with auth header
    const apiClient = useMemo(() => {
        return axios.create({
            baseURL: BASE_API,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        });
    }, [BASE_API, token]);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/product/products/?limit=1000');
            
            let results = [];
            if (response.data && Array.isArray(response.data.results)) {
                results = response.data.results;
            } else if (Array.isArray(response.data)) {
                results = response.data;
            } else {
                throw new Error("Unexpected product list payload structure");
            }
            
            setAllProducts(results);
            setFilteredData(results);
            setProducts(results);
            setTotalCount(results.length);
            setTotalPages(Math.max(1, Math.ceil(results.length / itemsPerPage)));
            setCurrentPage(1);
        } catch (err) {
            console.error('Error fetching products:', err);
            // Check if it's an authentication error
            if (err.response && err.response.status === 401) {
                setError("Authentication failed. Please login again.");
                // Optionally redirect to login
                // navigate('/login');
            } else {
                setError(err.message || String(err));
            }
            setProducts([]);
            setAllProducts([]);
            setFilteredData([]);
            setTotalCount(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [apiClient, itemsPerPage]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Update pagination when filtered data changes
    useEffect(() => {
        setProducts(filteredData);
        setTotalCount(filteredData.length);
        setTotalPages(Math.max(1, Math.ceil(filteredData.length / itemsPerPage)));
        setCurrentPage(1);
    }, [filteredData, itemsPerPage]);

    // Get current page data
    const getCurrentPageData = useCallback(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return products.slice(startIndex, startIndex + itemsPerPage);
    }, [products, currentPage, itemsPerPage]);

    const handleDelete = async (id) => {
        const res = await Swal.fire({
            title: "Delete Product?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Delete",
            confirmButtonColor: "#e11d48",
            cancelButtonColor: "#64748b"
        });
        if (!res.isConfirmed) return;

        try {
            await apiClient.delete(`/product/products/${id}/`);
            Swal.fire({ icon: "success", text: "Product deleted", timer: 1000, showConfirmButton: false });
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            if (error.response && error.response.status === 401) {
                Swal.fire({ icon: "error", title: "Authentication Error", text: "Please login again." });
            } else {
                Swal.fire({ icon: "error", title: "Delete failed", text: "Could not remove product resource." });
            }
        }
    };

    const categoriesNavigation = useMemo(() => {
        const counts = {};
        allProducts.forEach(p => {
            const catName = p.category_name || (p.is_service ? "Service" : "Product");
            counts[catName] = (counts[catName] || 0) + 1;
        });

        return [
            { name: "All", count: allProducts.length },
            ...Object.keys(counts).map(name => ({ name, count: counts[name] }))
        ];
    }, [allProducts]);

    // Also filter by selected category on top of advanced filter
    const getFilteredAndCategorizedData = useCallback(() => {
        let data = filteredData;
        if (selectedCategory !== "All") {
            data = data.filter(p => {
                const catName = p.category_name || (p.is_service ? "Service" : "Product");
                return catName === selectedCategory;
            });
        }
        return data;
    }, [filteredData, selectedCategory]);

    const formatCurrency = (amount) => {
        if (!amount) return "₹0.00";
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const currentPageData = getCurrentPageData();
    const displayData = getFilteredAndCategorizedData();

    // Update products when filter or category changes
    useEffect(() => {
        setProducts(displayData);
        setTotalCount(displayData.length);
        setTotalPages(Math.max(1, Math.ceil(displayData.length / itemsPerPage)));
        setCurrentPage(1);
    }, [displayData, itemsPerPage]);

    // Columns for the filter (using product fields)
    const filterColumns = [
        { key: "name", label: "Product Name" },
        { key: "product_code", label: "Product Code" },
        { key: "category_name", label: "Category" },
        { key: "unit_price", label: "Unit Price" },
        { key: "hsn_sac_code", label: "HSN Code" },
        { key: "gst_percentage", label: "GST Percentage" },
        { key: "status", label: "Status" },
        { key: "is_service", label: "Is Service" },
    ];

    return (
        <Base title="">
            <div className="w-full space-y-5 font-sans antialiased text-slate-800 -mt-5 px-1">
                
                {/* HEADER BLOCK */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
                    <div className="flex items-center gap-3">
                        <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Product & Service Master</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {loading ? "Synchronizing catalog records..." : `${totalCount} products / services`}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 md:mt-0 flex items-center gap-2.5">
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="px-3.5 py-1.5 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5"
                        >
                            <MdFilterList className="text-slate-400" />
                            Filter
                        </button>
                        <button 
                            onClick={() => navigate('/categories')}
                            className="px-3.5 py-1.5 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
                        >
                            Manage Categories
                        </button>
                        {canCreateProduct && (
                            <button 
                                onClick={() => {
                                    setSelectedProductId(null);
                                    setShowProductForm(true);
                                }}
                                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 cursor-pointer"
                            >
                                + Add Product
                            </button>
                        )}
                    </div>
                </div>

                {/* DYNAMIC CATEGORY FILTER PILLS BAR */}
                {!loading && allProducts.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none">
                        {categoriesNavigation.map((cat) => {
                            const isActive = selectedCategory === cat.name;
                            return (
                                <button
                                    key={cat.name}
                                    onClick={() => setSelectedCategory(cat.name)}
                                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                                        isActive
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.01]'
                                            : 'bg-white text-slate-600 border-slate-200 shadow-xs hover:shadow-md hover:bg-slate-50/80'
                                    }`}
                                >
                                    <span>{cat.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {cat.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* VISUAL CARDS GRID DISPLAY AREA */}
                {loading ? (
                    <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-slate-200/80 shadow-sm text-sm text-slate-500">
                        Loading production catalog...
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-20 bg-rose-50 rounded-xl border border-rose-200 text-sm text-rose-600 font-medium">
                        {error}
                    </div>
                ) : currentPageData.length === 0 ? (
                    <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-slate-200/80 shadow-sm text-sm text-slate-500">
                        No products available under the selected criteria category pill.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
                        {currentPageData.map((product) => (
                            <div 
                                key={product.id} 
                                className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 transform hover:-translate-y-0.5"
                            >
                                <div className="flex gap-4 items-start">
                                    {product.product_image_url ? (
                                        <img 
                                            src={product.product_image_url} 
                                            alt={product.name} 
                                            className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-xs flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0 shadow-xs">
                                            <Package size={32} strokeWidth={1.5} />
                                        </div>
                                    )}

                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-bold text-slate-900 text-sm md:text-base leading-snug">
                                                {product.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                                    product.status === 'ACTIVE'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : product.status === 'DRAFT'
                                                        ? 'bg-amber-50 text-amber-600'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {product.status ? product.status.toLowerCase() : 'active'}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold tracking-wide whitespace-nowrap">
                                                    {product.is_service ? "Service" : product.category_name || "Product"}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="text-xs text-blue-600 font-semibold tracking-wide uppercase">
                                            {product.product_code || "—"}
                                        </div>

                                        <p className="text-xs text-slate-500 font-normal line-clamp-2 pt-1 leading-relaxed">
                                            {product.description || "No item description overview configured inside system metadata parameters."}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100/80 my-1"></div>

                                <div className="flex items-end justify-between pt-1">
                                    <div className="grid grid-cols-4 gap-x-4 gap-y-0.5 text-left max-w-md">
                                        <div>
                                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Unit Price</div>
                                            <div className="text-xs md:text-sm font-bold text-slate-900 mt-0.5">
                                                {formatCurrency(product.unit_price)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">HSN Code</div>
                                            <div className="text-xs md:text-sm font-semibold text-slate-700 mt-0.5">
                                                {product.hsn_sac_code || "—"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Tax Rate</div>
                                            <div className="text-xs md:text-sm font-semibold text-slate-700 mt-0.5 whitespace-nowrap">
                                                {product.gst_percentage ? `${parseFloat(product.gst_percentage)}% GST` : "18% GST"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Unit</div>
                                            <div className="text-xs md:text-sm font-semibold text-slate-700 mt-0.5">
                                                {product.is_service ? "Project" : "License"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => {
                                                setSelectedProduct(product);
                                                setViewOpen(true);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-purple-600 rounded-md hover:bg-purple-50 transition-colors"
                                            title="View Full Record"
                                        >
                                            <MdZoomIn size={16} />
                                        </button>

                                        {canEditProduct && (
                                            <button 
                                                onClick={() => {
                                                    setSelectedProductId(product.id);
                                                    setShowProductForm(true);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                                                title="Edit Catalog Item"
                                            >
                                                <MdEdit size={16} />
                                            </button>
                                        )}
                                        {canDeleteProduct && (
                                            <button 
                                                onClick={() => handleDelete(product.id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                                title="Delete Catalog Item"
                                            >
                                                <MdDelete size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* PAGINATION PANEL */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700 disabled:opacity-50 transition-colors shadow-xs"
                            >
                                &lt;
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-2.5 py-1 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700 disabled:opacity-50 transition-colors shadow-xs"
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* FILTER DRAWER - DARK OVERLAY WITHOUT BLUR */}
            {isFilterOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-[999]" 
                    onClick={() => setIsFilterOpen(false)} 
                />
            )}
            
            <div className={`fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl z-[1000] transition-transform duration-300 ease-in-out ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex items-center justify-between p-5 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">Filters</h3>
                    <button 
                        onClick={() => setIsFilterOpen(false)}
                        className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1"
                    >
                        ×
                    </button>
                </div>
                <div className="p-5 overflow-y-auto h-[calc(100%-80px)]">
                    <AdvancedTableFilter
                        data={allProducts}
                        onFilter={setFilteredData}
                        setItemsPerPage={setItemsPerPage}
                        columns={filterColumns}
                    />
                </div>
            </div>

            {/* RECORD VIEWER - Slides in from right */}
            <RecordViewer
                isOpen={viewOpen}
                onClose={() => {
                    setViewOpen(false);
                    setSelectedProduct(null);
                }}
                record={selectedProduct}
                title="Product Details"
            />

            {/* Product Add / Edit Pop-up Modal Wrapper */}
            <ProductForm
                open={showProductForm}
                onClose={() => setShowProductForm(false)}
                productId={selectedProductId}
                baseApi={BASE_API}
                token={token}
                onSuccess={() => {
                    fetchProducts();
                    setShowProductForm(false);
                    setSelectedProductId(null);
                }}
            />
        </Base>
    );
};

export default ProductList;