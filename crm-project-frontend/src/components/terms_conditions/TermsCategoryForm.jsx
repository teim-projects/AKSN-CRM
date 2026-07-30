import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { RxCross2 } from "react-icons/rx";

const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function TermsCategoryForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (!isEdit) return;

    const fetchCategory = async () => {
      setLoading(true);
      try {
        const res = await api.get(`quotation/term-categories/${id}/`);
        setFormData({
          name: res.data.name || "",
          description: res.data.description || "",
          is_active: res.data.is_active !== undefined ? res.data.is_active : true,
          sort_order: res.data.sort_order || 0,
        });
      } catch (err) {
        console.error("Error fetching category:", err);
        Swal.fire({ icon: "error", title: "Error", text: "Failed to load category" });
        navigate("/terms");
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Category name is required" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
      };

      if (isEdit) {
        await api.put(`quotation/term-categories/${id}/`, payload);
      } else {
        await api.post("quotation/term-categories/", payload);
      }

      Swal.fire({
        icon: "success",
        text: isEdit ? "Category updated successfully" : "Category created successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      navigate("/terms");
    } catch (err) {
      console.error("Error saving category:", err);
      let errorMsg = "Failed to save category";
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

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-2xl w-full mx-auto my-8 relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white px-6 pt-6 pb-2 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {isEdit ? "Edit Category" : "Add New Category"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? "Update category details" : "Create a new term category"}
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
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Payment Terms, AMC Warranty"
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
                  placeholder="Describe what this category is for..."
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

                <div className="space-y-1 flex items-center">
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
                {loading ? "Saving..." : isEdit ? "Update Category" : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}