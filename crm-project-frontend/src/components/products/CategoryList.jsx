import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Base from '../Base';
import TableView from "../TableView";
import axios from 'axios';
import { MdEdit, MdDelete } from 'react-icons/md';
import { FaArrowLeft } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { useUserRole } from '../../hooks/useAuth';

const CategoryList = () => {
    const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
    const navigate = useNavigate();
    const { hasPermission } = useUserRole(BASE_API);
    const canCreateCategory = hasPermission("products", "create");
    const canEditCategory = hasPermission("products", "edit");
    const canDeleteCategory = hasPermission("products", "delete");

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true
    });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const token = useMemo(() => (
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        ""
    ), []);

    const apiClient = useMemo(() => {
        return axios.create({
            baseURL: BASE_API,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        });
    }, [BASE_API, token]);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/product/categories/');
            const results = response.data?.results || response.data || [];
            setCategories(Array.isArray(results) ? results : []);
            setCurrentPage(1);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError(err.response?.data?.detail || err.message || "Failed to load categories.");
        } finally {
            setLoading(false);
        }
    }, [apiClient]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingCategory) {
                await apiClient.put(`/product/categories/${editingCategory.id}/`, formData);
            } else {
                await apiClient.post('/product/categories/', formData);
            }
            await fetchCategories();
            setShowModal(false);
            setEditingCategory(null);
            setFormData({ name: '', description: '', is_active: true });
            Swal.fire({
                icon: "success",
                text: editingCategory ? "Category updated successfully" : "Category created successfully",
                timer: 1200,
                showConfirmButton: false
            });
        } catch (err) {
            console.error('Error saving category:', err);
            const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || "Error saving category details.";
            Swal.fire({ icon: "error", title: "Save failed", text: msg });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const res = await Swal.fire({
            title: "Delete Category?",
            text: "This action will remove the category from catalog classification.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Delete",
            confirmButtonColor: "#e11d48",
            cancelButtonColor: "#64748b"
        });
        if (!res.isConfirmed) return;

        try {
            await apiClient.delete(`/product/categories/${id}/`);
            Swal.fire({ icon: "success", text: "Category deleted", timer: 1000, showConfirmButton: false });
            fetchCategories();
        } catch (err) {
            console.error('Error deleting category:', err);
            Swal.fire({ icon: "error", title: "Delete failed", text: "Category resource might be currently bound to existing items." });
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
            is_active: category.is_active
        });
        setShowModal(true);
    };

    const totalPages = Math.max(1, Math.ceil(categories.length / itemsPerPage));
    const paginatedCategories = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return categories.slice(startIndex, startIndex + itemsPerPage);
    }, [categories, currentPage, itemsPerPage]);

    const columns = [
        { 
            key: "name", 
            label: "Name", 
            render: (r) => <span className="font-semibold text-slate-950">{r.name}</span> 
        },
        { 
            key: "description", 
            label: "Description", 
            render: (r) => <span>{r.description || "-"}</span> 
        },
        { 
            key: "product_count", 
            label: "Products Included", 
            render: (r) => <span className="font-medium">{r.product_count || 0}</span> 
        },
        { 
            key: "status", 
            label: "Status", 
            render: (r) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                    r.is_active 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                </span>
            ) 
        }
    ];

    const actionsRenderer = useCallback((row) => (
        <div className="flex items-center justify-center gap-2 text-slate-500">
            {canEditCategory && (
                <button
                    onClick={() => handleEdit(row)}
                    className="hover:text-amber-600 transition-colors p-1 bg-transparent border-none cursor-pointer"
                    title="Edit Category"
                >
                    <MdEdit size={16} />
                </button>
            )}
            {canDeleteCategory && (
                <button
                    onClick={() => handleDelete(row.id)}
                    className="hover:text-rose-600 transition-colors p-1 bg-transparent border-none cursor-pointer"
                    title="Delete Category"
                >
                    <MdDelete size={16} />
                </button>
            )}
        </div>
    ), [canEditCategory, canDeleteCategory, handleDelete]);

    return (
        <Base title="">
            <div className="w-full space-y-4 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">
                
                {/* HEADER BLOCK */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1 gap-3">
                    <div className="flex items-center gap-3">
                        <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Product Categories</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {loading ? "Synchronizing index records..." : `Total ${categories.length} category records active`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => navigate('/products')}
                            className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <FaArrowLeft className="text-slate-500 text-xs" />
                            <span>Back to Products</span>
                        </button>

                        {canCreateCategory && (
                            <button
                                onClick={() => {
                                    setEditingCategory(null);
                                    setFormData({ name: '', description: '', is_active: true });
                                    setShowModal(true);
                                }}
                                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 flex-shrink-0 cursor-pointer"
                            >
                                <span>+</span> Add Category
                            </button>
                        )}
                    </div>
                </div>

                {/* REUSABLE TABLE VIEW MODULE */}
                <TableView
                    columns={columns}
                    rows={paginatedCategories}
                    loading={loading}
                    error={error}
                    page={currentPage}
                    totalPages={totalPages}
                    onPageChange={(p) => setCurrentPage(p)}
                    pageSize={itemsPerPage}
                    actions={actionsRenderer}
                    emptyMessage="No categories found inside system records"
                />
            </div>

            {/* Modal Layer Layout */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-5 max-w-md w-full mx-4 space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                {editingCategory ? 'Edit Category' : 'Add New Category'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">Configure system catalog classification parameters.</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-600">
                                    Category Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                    placeholder="e.g. Software License"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all text-slate-800"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-600">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows={3}
                                    placeholder="Provide class overview metadata indicators..."
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all text-slate-800"
                                />
                            </div>

                            <div className="flex items-center pt-1">
                                <label className="flex items-center cursor-pointer select-none text-xs font-semibold text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2 cursor-pointer"
                                    />
                                    Mark category indicator active
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingCategory(null);
                                    }}
                                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/10 cursor-pointer"
                                >
                                    {loading ? 'Saving...' : (editingCategory ? 'Update Class' : 'Create Class')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Base>
    );
};

export default CategoryList;