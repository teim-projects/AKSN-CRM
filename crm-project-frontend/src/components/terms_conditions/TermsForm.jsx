import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { RxCross2 } from "react-icons/rx";
import Select from "react-select";

const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function TermsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;

  const queryParams = new URLSearchParams(location.search);
  const presetCategoryId = queryParams.get('category');

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: presetCategoryId || "",
    is_default: false,
    is_active: true,
    sort_order: 0,
  });

  // Get category name for display when preset
  const presetCategoryName = useMemo(() => {
    if (!presetCategoryId) return null;
    const category = categories.find(c => c.id === parseInt(presetCategoryId));
    return category ? category.name : null;
  }, [categories, presetCategoryId]);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await api.get(`quotation/term-categories/?is_active=true`);
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    const fetchTerm = async () => {
      setLoading(true);
      try {
        const res = await api.get(`quotation/terms/${id}/`);
        setFormData({
          name: res.data.name || "",
          description: res.data.description || "",
          category: res.data.category || "",
          is_default: res.data.is_default || false,
          is_active: res.data.is_active !== undefined ? res.data.is_active : true,
          sort_order: res.data.sort_order || 0,
        });
      } catch (err) {
        console.error("Error fetching term:", err);
        Swal.fire({ icon: "error", title: "Error", text: "Failed to load term" });
        navigate("/terms");
      } finally {
        setLoading(false);
      }
    };

    fetchTerm();
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const categoryOptions = useMemo(() => {
    return categories.map(cat => ({
      value: cat.id,
      label: cat.name,
    }));
  }, [categories]);

  const handleCategoryChange = (selected) => {
    setFormData((prev) => ({
      ...prev,
      category: selected ? selected.value : "",
    }));
  };

  const selectedCategoryOption = useMemo(() => {
    return categoryOptions.find(opt => opt.value === formData.category) || null;
  }, [categoryOptions, formData.category]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Term name is required" });
      return;
    }
    if (!formData.category) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please select a category" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: parseInt(formData.category),
        is_default: formData.is_default,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
      };

      if (isEdit) {
        await api.put(`quotation/terms/${id}/`, payload);
      } else {
        await api.post("quotation/terms/", payload);
      }

      Swal.fire({
        icon: "success",
        text: isEdit ? "Term updated successfully" : "Term created successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      navigate("/terms");
    } catch (err) {
      console.error("Error saving term:", err);
      let errorMsg = "Failed to save term";
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === "object") {
          const errors = Object.entries(data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
            .join("\n");
          errorMsg = errors || errorMsg;
        }
      }
      Swal.fire({ icon: "error", title: "Error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Determine if category should be hidden/disabled
  const isCategoryPreset = !!presetCategoryId && !isEdit;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-2xl w-full mx-auto my-8 relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white px-6 pt-6 pb-2 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {isEdit ? "Edit Term" : "Add New Term"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit 
                ? "Update term details" 
                : isCategoryPreset 
                  ? `Adding term to: ${presetCategoryName || "Selected Category"}` 
                  : "Create a new term & condition"}
            </p>
          </div>
          <button
            onClick={() => navigate("/terms")}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
          >
            <RxCross2 size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
          <form onSubmit={handleSubmit} className="space-y-6 text-slate-800">
            <div className="space-y-4">
              {/* ✅ Category Field - Hidden/Disabled when preset */}
              {isCategoryPreset ? (
                // Show category as disabled/read-only when preset
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={presetCategoryName || "Loading..."}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                      Auto-selected
                    </span>
                  </div>
                  <input
                    type="hidden"
                    name="category"
                    value={formData.category}
                  />
                </div>
              ) : (
                // Show category dropdown when not preset
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <Select
                    options={categoryOptions}
                    value={selectedCategoryOption}
                    onChange={handleCategoryChange}
                    placeholder={loadingCategories ? "Loading categories..." : "Select category..."}
                    isLoading={loadingCategories}
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: "38px",
                        borderColor: "#e2e8f0",
                        borderRadius: "0.5rem",
                        "&:hover": { borderColor: "#e2e8f0" },
                      }),
                    }}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Term Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. 30 Days Payment Terms"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Detailed description of the term..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">Sort Order</label>
                  <input
                    type="number"
                    name="sort_order"
                    value={formData.sort_order}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    min="0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">Default Term</label>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_default"
                        checked={formData.is_default}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      Auto-select in quotations
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  Active
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => navigate("/terms")}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/10"
              >
                {loading ? "Saving..." : isEdit ? "Update Term" : "Create Term"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}