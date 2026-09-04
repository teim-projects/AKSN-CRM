import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const ProductForm = ({ open, onClose, productId, baseApi, token, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const fileInputRef = useRef(null);
    
    const [formData, setFormData] = useState({
        name: '',
        product_code: '',
        category: '',
        unit_price: '0',
        hsn_sac_code: '',
        status: 'ACTIVE',
        description: '',
        product_image_url: '',
        gst_percentage: 18,
        is_active: true,
        is_service: false,
        extra_attributes: {}
    });

    const authHeadersJson = useMemo(() => ({
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
        }
    }), [token]);

    useEffect(() => {
        if (!open) return;
        
        // Reset state on modal open
        setImageFile(null);
        setImagePreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        setFormData({
            name: '',
            product_code: '',
            category: '',
            unit_price: '0',
            hsn_sac_code: '',
            status: 'ACTIVE',
            description: '',
            product_image_url: '',
            gst_percentage: 18,
            is_active: true,
            is_service: false,
            extra_attributes: {}
        });

        const fetchCategories = async () => {
            try {
                const response = await axios.get(`${baseApi}/product/categories/?is_active=true`, authHeadersJson);
                setCategories(response.data.results || response.data || []);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };

        const fetchProduct = async () => {
            try {
                const response = await axios.get(`${baseApi}/product/products/${productId}/`, authHeadersJson);
                const data = response.data;
                setFormData({
                    ...data,
                    category: data.category || '',
                    unit_price: data.unit_price || '0',
                    gst_percentage: data.gst_percentage || 18
                });
                if (data.product_image_url) {
                    setImagePreview(data.product_image_url);
                }
            } catch (error) {
                console.error('Error fetching product:', error);
            }
        };

        fetchCategories();
        if (productId) {
            fetchProduct();
        }
    }, [open, productId, baseApi, authHeadersJson]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview('');
        setFormData({ ...formData, product_image_url: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let submitData = {
                ...formData,
                unit_price: parseFloat(formData.unit_price) || 0,
                gst_percentage: parseFloat(formData.gst_percentage) || 0
            };
            
            if (imageFile) {
                const formDataObj = new FormData();
                formDataObj.append('image', imageFile);
                
                const uploadResponse = await axios.post(
                    `${baseApi}/product/upload-image/`,
                    formDataObj,
                    {
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );
                submitData.product_image_url = uploadResponse.data.image_url;
            }
            
            if (productId) {
                await axios.put(`${baseApi}/product/products/${productId}/`, submitData, authHeadersJson);
                Swal.fire({ icon: "success", text: "Product updated successfully", timer: 1000, showConfirmButton: false });
            } else {
                await axios.post(`${baseApi}/product/products/`, submitData, authHeadersJson);
                Swal.fire({ icon: "success", text: "Product created successfully", timer: 1000, showConfirmButton: false });
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving product:', error);
            const errData = error.response?.data;
            let errMsg = "Please review form fields parameters.";
            if (errData && typeof errData === 'object') {
                errMsg = Object.entries(errData)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                    .join('\n');
            } else if (typeof errData === 'string') {
                errMsg = errData;
            }
            Swal.fire({ icon: "error", title: "Save failed", text: errMsg });
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            {/* Parent Modal Window - flex structure with overflow-hidden ensures perfect curved edges on all sides identical to the left */}
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-2xl w-full mx-auto my-8 relative max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Fixed Top Section Header */}
                <div className="bg-white px-6 pt-6 pb-2 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">
                            {productId ? 'Edit Product' : 'Add New Product'}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Configure system product and catalog classification metrics.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 font-bold text-lg transition-colors p-1"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Inner Form Scroll Area - Scrollbar track respects outer borders cleanly */}
                <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
                    <form onSubmit={handleSubmit} className="space-y-4 text-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Product Name */}
                            <div className="md:col-span-2 space-y-1">
                                <label className="block text-xs font-semibold text-slate-600">
                                    Product / Service Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. ERP Suite — Enterprise"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
                                />
                            </div>

                            {/* Product Code */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-600">
                                    Product Code
                                </label>
                                <input
                                    type="text"
                                    name="product_code"
                                    value={formData.product_code}
                                    onChange={handleChange}
                                    placeholder="Enter custom product code (e.g. PRD-001)"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
                                />
                                <p className="text-[10px] text-slate-400">Enter custom code manually, or leave blank to auto-generate.</p>
                            </div>

                            {/* Category */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-600">
                                    Category *
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white h-[38px]"
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Unit Price */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-600">
                                    Unit Price (₹) *
                                </label>
                                <input
                                    type="number"
                                    name="unit_price"
                                    value={formData.unit_price}
                                    onChange={handleChange}
                                    required
                                    step="0.01"
                                    min="0"
                                    placeholder="0"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
                                />
                            </div>

                            {/* HSN Code */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-600">
                                    HSN / SAC Code
                                </label>
                                <input
                                    type="text"
                                    name="hsn_sac_code"
                                    value={formData.hsn_sac_code}
                                    onChange={handleChange}
                                    placeholder="e.g. 99831"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
                                />
                            </div>

                            {/* GST Percentage */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-600">
                                    GST Percentage (%)
                                </label>
                                <input
                                    type="number"
                                    name="gst_percentage"
                                    value={formData.gst_percentage}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    placeholder="18"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
                                />
                            </div>

                            {/* Status */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-600">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white h-[38px]"
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="DRAFT">Draft</option>
                                    <option value="DISCONTINUED">Discontinued</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2 space-y-1">
                                <label className="block text-xs font-semibold text-slate-600">
                                    Product Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="e.g. Hello. Hii. Say something."
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    💡 <strong className="text-slate-600">Bullet Format:</strong> End each point/sentence with a period (<code className="bg-slate-100 px-1 rounded text-blue-600 font-bold">.</code>) to format it into separate bullet points in Quotations & PDFs.
                                </p>

                                {formData.description && formData.description.trim().length > 0 && (
                                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Live Bullet Preview:</p>
                                        <ul className="space-y-1">
                                            {(() => {
                                                const raw = formData.description.trim();
                                                const parts = raw.split('.');
                                                const bullets = [];
                                                parts.forEach(p => {
                                                    const c = p.replace(/\s+/g, ' ').trim();
                                                    if (c) bullets.push(c + '.');
                                                });
                                                if (!raw.endsWith('.') && bullets.length > 0) {
                                                    bullets[bullets.length - 1] = bullets[bullets.length - 1].replace(/\.$/, '');
                                                }
                                                return bullets.map((b, i) => (
                                                    <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                                        <span className="text-blue-500 font-bold leading-none mt-0.5">•</span>
                                                        <span>{b}</span>
                                                    </li>
                                                ));
                                            })()}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Image Upload Row */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-xs font-semibold text-slate-600">
                                    Product Image
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        accept="image/*"
                                        className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 flex-1 border border-slate-200 rounded-lg p-1 bg-white"
                                    />
                                    {imagePreview && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                {imagePreview && (
                                    <div className="pt-1">
                                        <img 
                                            src={imagePreview} 
                                            alt="Preview" 
                                            className="h-20 w-20 object-cover rounded-xl border border-slate-200 shadow-xs"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Checkboxes Row */}
                            <div className="md:col-span-2 flex gap-6 pt-2">
                                <label className="flex items-center cursor-pointer select-none text-xs font-semibold text-slate-600">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2 cursor-pointer"
                                    />
                                    Active
                                </label>
                                <label className="flex items-center cursor-pointer select-none text-xs font-semibold text-slate-600">
                                    <input
                                        type="checkbox"
                                        name="is_service"
                                        checked={formData.is_service}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2 cursor-pointer"
                                    />
                                    Service Product (AMC)
                                </label>
                            </div>
                        </div>

                        {/* Actions Control Area */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {loading ? 'Saving...' : (productId ? 'Update Item' : 'Create Item')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProductForm;