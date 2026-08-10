import { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import { MdClose } from "react-icons/md";

export default function AddProjectForm({
  open,
  onClose,
  onSuccess,
  project = null,
  initialCustomer = null,
}) {
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const token = useMemo(
    () =>
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "",
    []
  );

  const PROJECT_API_URL = `${BASE_API.replace(/\/$/, "")}/lead/projects/`;
  const CUSTOMER_API_URL = `${BASE_API.replace(/\/$/, "")}/lead/customer/`;
  const PRODUCT_API_URL = `${BASE_API.replace(/\/$/, "")}/product/products/`;
  const STAFF_API_URL = `${BASE_API.replace(/\/$/, "")}/auth/staff/all/`;

  const stageOptions = [
    { id: "requirement_analysis", name: "Requirement Analysis" },
    { id: "installation", name: "Installation" },
    { id: "data_migration", name: "Data Migration" },
    { id: "customization", name: "Customization" },
    { id: "training", name: "Training" },
    { id: "uat", name: "UAT" },
    { id: "go_live", name: "Go Live" },
  ];

  const priorityOptions = [
    { id: "critical", name: "Critical" },
    { id: "high", name: "High" },
    { id: "medium", name: "Medium" },
    { id: "low", name: "Low" },
  ];

  const [formData, setFormData] = useState({
    customer: "",
    start_date: "",
    expected_to_go_live: "",
    amc_start_date: "",
    amc_end_date: "",
    project_stage: "requirement_analysis",
    priority: "medium",
    project_executive: "",
    no_of_user: "",
    project_value: "",
    project_scope_requirements: "",
    team_members: "",
  });

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch dropdown data
  useEffect(() => {
    if (!open) return;

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    fetch(`${CUSTOMER_API_URL}?limit=1000`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        setCustomers(list);
      })
      .catch(() => setCustomers([]));

    fetch(`${PRODUCT_API_URL}?limit=1000`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        setProducts(list);
      })
      .catch(() => setProducts([]));

    fetch(STAFF_API_URL, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setStaffOptions(list);
      })
      .catch(() => setStaffOptions([]));
  }, [open, token, CUSTOMER_API_URL, PRODUCT_API_URL, STAFF_API_URL]);

  // Set initial form data
  useEffect(() => {
    if (!open) return;

    if (project) {
      setFormData({
        customer: project.customer || "",
        start_date: project.start_date || "",
        expected_to_go_live: project.expected_to_go_live || "",
        amc_start_date: project.amc_start_date || "",
        amc_end_date: project.amc_end_date || "",
        project_stage: project.project_stage || "requirement_analysis",
        priority: project.priority || "medium",
        project_executive: project.project_executive || "",
        no_of_user: project.no_of_user || "",
        project_value: project.project_value ? String(project.project_value) : "",
        project_scope_requirements: project.project_scope_requirements || "",
        team_members: project.team_members || "",
      });

      if (Array.isArray(project.product)) {
        setSelectedProducts(project.product);
      } else if (typeof project.product === "string" && project.product.trim()) {
        try {
          const parsed = JSON.parse(project.product);
          setSelectedProducts(Array.isArray(parsed) ? parsed : [project.product]);
        } catch {
          setSelectedProducts([project.product]);
        }
      } else {
        setSelectedProducts([]);
      }
    } else if (initialCustomer) {
      setFormData({
        customer: initialCustomer.id || "",
        start_date: "",
        expected_to_go_live: "",
        amc_start_date: initialCustomer.amc_start_date || "",
        amc_end_date: initialCustomer.amc_end_date || "",
        project_stage: "requirement_analysis",
        priority: "medium",
        project_executive: initialCustomer.sales_executive || initialCustomer.sales_executive_details?.id || "",
        no_of_user: "",
        project_value: initialCustomer.project_value !== undefined && initialCustomer.project_value !== null ? String(initialCustomer.project_value) : "",
        project_scope_requirements: initialCustomer.remarks || initialCustomer.requirement_details || "",
        team_members: "",
      });
      const custProds = initialCustomer.product_purchased || initialCustomer.product_purchased_list || [];
      setSelectedProducts(Array.isArray(custProds) ? custProds : [custProds].filter(Boolean));
    } else {
      setFormData({
        customer: "",
        start_date: "",
        expected_to_go_live: "",
        amc_start_date: "",
        amc_end_date: "",
        project_stage: "requirement_analysis",
        priority: "medium",
        project_executive: "",
        no_of_user: "",
        project_value: "",
        project_scope_requirements: "",
        team_members: "",
      });
      setSelectedProducts([]);
    }
  }, [open, project, initialCustomer]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If customer dropdown is changed manually, auto-populate matching customer data
    if (name === "customer" && value) {
      const foundCustomer = customers.find((c) => String(c.id) === String(value));
      if (foundCustomer) {
        setFormData((prev) => ({
          ...prev,
          customer: value,
          project_executive: prev.project_executive || foundCustomer.sales_executive || foundCustomer.sales_executive_details?.id || "",
          project_value: prev.project_value || (foundCustomer.project_value ? String(foundCustomer.project_value) : ""),
          project_scope_requirements: prev.project_scope_requirements || foundCustomer.remarks || foundCustomer.requirement_details || "",
        }));
        if (selectedProducts.length === 0 && (foundCustomer.product_purchased || foundCustomer.product_purchased_list)) {
          const prods = foundCustomer.product_purchased || foundCustomer.product_purchased_list;
          setSelectedProducts(Array.isArray(prods) ? prods : [prods]);
        }
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const productSelectOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.name || p.product_name || String(p.id),
        label: `${p.name || p.product_name || "Product"} ${p.product_code ? `(${p.product_code})` : ""}`,
        productObj: p,
      })),
    [products]
  );

  const selectedProductSelectOptions = useMemo(() => {
    if (!Array.isArray(selectedProducts) || selectedProducts.length === 0) return [];

    return productSelectOptions.filter((opt) => {
      const p = opt.productObj;
      return selectedProducts.some((sel) => {
        if (sel === null || sel === undefined || sel === "") return false;
        if (p?.id !== undefined && String(p.id) === String(sel)) return true;
        if (String(opt.value) === String(sel)) return true;
        if (p?.name && String(p.name).trim().toLowerCase() === String(sel).trim().toLowerCase()) return true;
        if (p?.product_name && String(p.product_name).trim().toLowerCase() === String(sel).trim().toLowerCase()) return true;
        return false;
      });
    });
  }, [selectedProducts, productSelectOptions]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer) {
      Swal.fire("Required", "Please select a Customer.", "warning");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        customer: parseInt(formData.customer, 10),
        project_executive: formData.project_executive ? parseInt(formData.project_executive, 10) : null,
        product: selectedProducts,
        team_members: formData.team_members || "",
        project_value: formData.project_value ? parseFloat(formData.project_value) : 0.0,
        start_date: formData.start_date || null,
        expected_to_go_live: formData.expected_to_go_live || null,
        amc_start_date: formData.amc_start_date || null,
        amc_end_date: formData.amc_end_date || null,
      };

      const isEdit = !!project?.id;
      const url = isEdit ? `${PROJECT_API_URL}${project.id}/` : PROJECT_API_URL;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errorMsg = "Failed to save project.";
        if (typeof errorData === "object") {
          errorMsg = Object.entries(errorData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join("\n");
        }
        throw new Error(errorMsg);
      }

      const savedData = await res.json();
      Swal.fire("Success", `Project ${isEdit ? "updated" : "created"} successfully!`, "success");

      if (onSuccess) onSuccess(savedData);
      onClose();
    } catch (err) {
      console.error("Save project error:", err);
      Swal.fire("Error", err.message || "Failed to save project.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <MdClose size={22} />
        </button>

        <div className="mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-800">
            {project ? "Edit Project" : "Create New Project"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {initialCustomer
              ? `Creating project for customer: ${initialCustomer.company_name || initialCustomer.name}`
              : "Enter details to create or update project assignment."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Customer & Executive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Customer <span className="text-rose-500">*</span>
              </label>
              <select
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                disabled={!!initialCustomer}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[38px]"
                required
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || c.name} ({c.customer_code || `#${c.id}`})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Project Executive
              </label>
              <select
                name="project_executive"
                value={formData.project_executive}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[38px]"
              >
                <option value="">Select Executive</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.full_name || s.username || s.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Product(s) & Team Members */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Product(s)
              </label>
              <Select
                isMulti
                options={productSelectOptions}
                value={selectedProductSelectOptions}
                onChange={(opts) =>
                  setSelectedProducts(opts ? opts.map((o) => o.value) : [])
                }
                placeholder="Select Products..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Team Members
              </label>
              <input
                type="text"
                name="team_members"
                value={formData.team_members}
                onChange={handleChange}
                placeholder="e.g. Rahul, Priya, Alex"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[38px]"
              />
            </div>
          </div>

          {/* Row 3: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Expected to Go Live
              </label>
              <input
                type="date"
                name="expected_to_go_live"
                value={formData.expected_to_go_live}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* AMC Dates Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                AMC Start Date
              </label>
              <input
                type="date"
                name="amc_start_date"
                value={formData.amc_start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                AMC End Date
              </label>
              <input
                type="date"
                name="amc_end_date"
                value={formData.amc_end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Row 4: Stage & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Current Stage
              </label>
              <select
                name="project_stage"
                value={formData.project_stage}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[38px]"
              >
                {stageOptions.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[38px]"
              >
                {priorityOptions.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Users & Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                No. of Users
              </label>
              <input
                type="text"
                name="no_of_user"
                value={formData.no_of_user}
                onChange={handleChange}
                placeholder="e.g. 10 users"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Project Value (₹)
              </label>
              <input
                type="number"
                step="0.01"
                name="project_value"
                value={formData.project_value}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Row 6: Scope / Requirements */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">
              Project Scope / Requirements
            </label>
            <textarea
              name="project_scope_requirements"
              value={formData.project_scope_requirements}
              onChange={handleChange}
              rows={3}
              placeholder="Enter project scope, key deliverables, or requirements..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? "Saving..." : project ? "Update Project" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
