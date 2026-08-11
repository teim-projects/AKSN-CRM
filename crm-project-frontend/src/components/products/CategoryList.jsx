import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Base from '../Base';
import TableView from "../TableView";
import axios from 'axios';
import { MdEdit, MdDelete } from 'react-icons/md';
import Swal from 'sweetalert2';

const CategoryList = () => {
    const BASE_API = import.meta.env.VITE_BASE_API_URL;
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true
    });

    const token = useMemo(() => (
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        ""
    ), []);

    const authHeaders = useCallback(() => ({
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
        }
    }), [token]);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_API}/product/categories/`, authHeaders());
            setCategories(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    }, [BASE_API, authHeaders]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingCategory) {
                await axios.put(
                    `${BASE_API}/product/categories/${editingCategory.id}/`,
                    formData,
                    authHeaders()
                );
            } else {
                await axios.post(`${BASE_API}/product/categories/`, formData, authHeaders());
            }
            await fetchCategories();
            setShowModal(false);
            setEditingCategory(null);
            setFormData({ name: '', description: '', is_active: true });
        } catch (error) {
            console.error('Error saving category:', error);
            Swal.fire({ icon: "error", title: "Save failed", text: "Error saving category details resource." });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const res = await Swal.fire({
            title: "Delete Category?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Delete",
            confirmButtonColor: "#e11d48",
            cancelButtonColor: "#64748b"
        });
        if (!res.isConfirmed) return;

        try {
            await axios.delete(`${BASE_API}/product/categories/${id}/`, authHeaders());
            Swal.fire({ icon: "success", text: "Category deleted", timer: 1000, showConfirmButton: false });
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
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
            <button
                onClick={() => handleEdit(row)}
                className="hover:text-amber-600 transition-colors p-0 bg-transparent border-none"
                title="Edit Category"
            >
                <MdEdit size={16} />
            </button>
            <button
                onClick={() => handleDelete(row.id)}
                className="hover:text-rose-600 transition-colors p-0 bg-transparent border-none"
                title="Delete Category"
            >
                <MdDelete size={16} />
            </button>
        </div>
    ), [handleDelete]);

    return (
        <Base title="">
            <div className="w-full space-y-4 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">
                
                {/* HEADER BLOCK */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
                    <div className="flex items-center gap-3">
                        <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Product Categories</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {loading ? "Synchronizing index records..." : `Total ${categories.length} category records active`}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 md:mt-0 flex items-center gap-3">
                        <button
                            onClick={() => {
                                setEditingCategory(null);
                                setFormData({ name: '', description: '', is_active: true });
                                setShowModal(true);
                            }}
                            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 flex-shrink-0"
                        >
                            <span>+</span> Add Category
                        </button>
                    </div>
                </div>

                {/* REUSABLE TABLE VIEW MODULE */}
                <TableView
                    columns={columns}
                    rows={categories}
                    loading={loading}
                    error={null}
                    page={1}
                    totalPages={1}
                    onPageChange={() => {}}
                    pageSize={categories.length || 10}
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
                                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/10"
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