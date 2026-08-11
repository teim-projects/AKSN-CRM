import { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { MdClose } from "react-icons/md";

export default function AddAMCContractForm({
  open,
  onClose,
  onSuccess,
  amcContract = null,
  initialProject = null,
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

  const API_URL = `${BASE_API.replace(/\/$/, "")}/lead/amc/contracts/`;
  const CUSTOMER_API_URL = `${BASE_API.replace(/\/$/, "")}/lead/customer/`;
  const PRODUCT_API_URL = `${BASE_API.replace(/\/$/, "")}/product/products/`;
  const STAFF_API_URL = `${BASE_API.replace(/\/$/, "")}/auth/staff/all/`;

  const amcTypeOptions = [
    { id: "comprehensive", name: "Comprehensive" },
    { id: "non_comprehensive", name: "Non-Comprehensive" },
  ];

  const paymentFrequencyOptions = [
    { id: "annual", name: "Annual" },
    { id: "quarterly", name: "Quarterly" },
    { id: "monthly", name: "Monthly" },
    { id: "half_yearly", name: "Half-Yearly" },
  ];

  const [formData, setFormData] = useState({
    contract_id: "",
    customer: "",
    product: "",
    amc_type: "comprehensive",
    start_date: "",
    end_date: "",
    annual_value: "0",
    payment_frequency: "quarterly",
    support_coordinator: "",
    scope_of_support: "",
  });

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

    if (amcContract) {
      setFormData({
        contract_id: amcContract.contract_id || "",
        customer: amcContract.customer || amcContract.customer_details?.id || "",
        product: amcContract.product || "",
        amc_type: amcContract.amc_type || "comprehensive",
        start_date: amcContract.start_date || "",
        end_date: amcContract.end_date || "",
        annual_value: amcContract.annual_value ? String(amcContract.annual_value) : "0",
        payment_frequency: amcContract.payment_frequency || "quarterly",
        support_coordinator: amcContract.support_coordinator || amcContract.support_coordinator_details?.id || "",
        scope_of_support: amcContract.scope_of_support || "",
      });
    } else if (initialProject) {
      const prodName = Array.isArray(initialProject.product)
        ? initialProject.product[0] || ""
        : typeof initialProject.product === "string"
        ? initialProject.product
        : "";

      setFormData({
        contract_id: "Auto Generated",
        customer: initialProject.customer || initialProject.customer_details?.id || "",
        product: prodName,
        amc_type: "comprehensive",
        start_date: initialProject.amc_start_date || initialProject.start_date || "",
        end_date: initialProject.amc_end_date || "",
        annual_value: initialProject.project_value ? String(initialProject.project_value) : "0",
        payment_frequency: "quarterly",
        support_coordinator: initialProject.project_executive || initialProject.project_executive_details?.id || "",
        scope_of_support: initialProject.project_scope_requirements || "",
      });
    } else if (initialCustomer) {
      const firstProd = Array.isArray(initialCustomer.product_purchased)
        ? typeof initialCustomer.product_purchased[0] === "object"
          ? initialCustomer.product_purchased[0]?.product
          : initialCustomer.product_purchased[0]
        : "";

      setFormData({
        contract_id: "Auto Generated",
        customer: initialCustomer.id || "",
        product: firstProd || "",
        amc_type: "comprehensive",
        start_date: initialCustomer.amc_start_date || "",
        end_date: initialCustomer.amc_end_date || "",
        annual_value: initialCustomer.project_value ? String(initialCustomer.project_value) : "0",
        payment_frequency: "quarterly",
        support_coordinator: initialCustomer.sales_executive || initialCustomer.sales_executive_details?.id || "",
        scope_of_support: "",
      });
    } else {
      setFormData({
        contract_id: "Auto Generated",
        customer: "",
        product: "",
        amc_type: "comprehensive",
        start_date: "",
        end_date: "",
        annual_value: "0",
        payment_frequency: "quarterly",
        support_coordinator: "",
        scope_of_support: "",
      });
    }
  }, [open, amcContract, initialProject, initialCustomer]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "customer" && value) {
      const foundCust = customers.find((c) => String(c.id) === String(value));
      if (foundCust) {
        setFormData((prev) => ({
          ...prev,
          customer: value,
          support_coordinator: prev.support_coordinator || foundCust.sales_executive || foundCust.sales_executive_details?.id || "",
          annual_value: prev.annual_value !== "0" ? prev.annual_value : foundCust.project_value ? String(foundCust.project_value) : "0",
          start_date: prev.start_date || foundCust.amc_start_date || "",
          end_date: prev.end_date || foundCust.amc_end_date || "",
        }));
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const productSelectOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.name || p.product_name || String(p.id),
        label: p.name || p.product_name || "Product",
      })),
    [products]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer) {
      Swal.fire("Required", "Please select a Customer.", "warning");
      return;
    }

    if (!formData.product) {
      Swal.fire("Required", "Please specify a Product.", "warning");
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      Swal.fire("Required", "Please enter Start Date and End Date.", "warning");
      return;
    }

    setLoading(true);

    try {
      const custId = typeof formData.customer === "object" ? formData.customer?.id : parseInt(formData.customer, 10);
      const coordId = typeof formData.support_coordinator === "object"
        ? formData.support_coordinator?.id
        : formData.support_coordinator
        ? parseInt(formData.support_coordinator, 10)
        : null;

      const payload = {
        customer: custId,
        project: initialProject?.id ? parseInt(initialProject.id, 10) : null,
        product: typeof formData.product === "object" ? formData.product?.name || formData.product?.value || "" : String(formData.product || ""),
        amc_type: formData.amc_type,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        annual_value: formData.annual_value ? parseFloat(formData.annual_value) : 0.0,
        payment_frequency: formData.payment_frequency,
        support_coordinator: coordId,
        scope_of_support: formData.scope_of_support || "",
      };

      const isEdit = !!amcContract?.id;
      const url = isEdit ? `${API_URL}${amcContract.id}/` : API_URL;
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
        let errorMsg = "Failed to save AMC contract.";
        if (typeof errorData === "object") {
          errorMsg = Object.entries(errorData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join("\n");
        }
        throw new Error(errorMsg);
      }

      const savedData = await res.json();
      Swal.fire("Success", `AMC Contract ${isEdit ? "updated" : "created"} successfully!`, "success");

      if (onSuccess) onSuccess(savedData);
      onClose();
    } catch (err) {
      console.error("Save AMC contract error:", err);
      Swal.fire("Error", err.message || "Failed to save AMC contract.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative border border-slate-100">
        {/* Header matching design image */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {amcContract ? "Edit AMC Contract" : "New AMC Contract"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <MdClose size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Contract ID & Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Contract ID
              </label>
              <input
                type="text"
                name="contract_id"
                value={formData.contract_id || "Auto Generated"}
                disabled
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Customer <span className="text-rose-500">*</span>
              </label>
              <select
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[42px]"
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
          </div>

          {/* Row 2: Product & AMC Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Product <span className="text-rose-500">*</span>
              </label>
              <CreatableSelect
                options={productSelectOptions}
                value={
                  formData.product
                    ? { value: formData.product, label: formData.product }
                    : null
                }
                onChange={(opt) =>
                  setFormData((prev) => ({
                    ...prev,
                    product: opt ? opt.value || opt.label : "",
                  }))
                }
                placeholder="Select or enter product..."
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: "0.75rem",
                    borderColor: "#e2e8f0",
                    minHeight: "42px",
                  }),
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                AMC Type
              </label>
              <select
                name="amc_type"
                value={formData.amc_type}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[42px]"
              >
                {amcTypeOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Start Date & End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[42px]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[42px]"
              />
            </div>
          </div>

          {/* Row 4: Annual Value & Payment Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Annual Value (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="annual_value"
                value={formData.annual_value}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="any"
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[42px]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Payment Frequency
              </label>
              <select
                name="payment_frequency"
                value={formData.payment_frequency}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[42px]"
              >
                {paymentFrequencyOptions.map((pf) => (
                  <option key={pf.id} value={pf.id}>
                    {pf.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Support Coordinator (Staff Options) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Support Coordinator
              </label>
              <select
                name="support_coordinator"
                value={formData.support_coordinator}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-[42px]"
              >
                <option value="">Select Staff Executive</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email || s.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6: Scope of Support */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Scope of Support
            </label>
            <textarea
              name="scope_of_support"
              value={formData.scope_of_support}
              onChange={handleChange}
              rows={3}
              placeholder="Describe what is covered under this AMC — modules, support hours, on-site visits..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white leading-relaxed"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Saving..." : amcContract ? "Update Contract" : "Save Contract"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
