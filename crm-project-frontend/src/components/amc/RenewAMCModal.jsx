import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { MdClose, MdAutorenew } from "react-icons/md";

export default function RenewAMCModal({
  open,
  onClose,
  onSuccess,
  amcContract,
  token,
  baseUrl,
}) {
  const [formData, setFormData] = useState({
    new_start_date: "",
    new_end_date: "",
    new_annual_value: "0",
    payment_frequency: "quarterly",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && amcContract) {
      let defaultStart = "";
      let defaultEnd = "";

      if (amcContract.end_date) {
        const endDateObj = new Date(amcContract.end_date);
        if (!isNaN(endDateObj.getTime())) {
          // 1 day after current end_date
          const nextDay = new Date(endDateObj);
          nextDay.setDate(nextDay.getDate() + 1);
          defaultStart = nextDay.toISOString().split("T")[0];

          // 1 year after new_start_date minus 1 day
          const nextYear = new Date(nextDay);
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          nextYear.setDate(nextYear.getDate() - 1);
          defaultEnd = nextYear.toISOString().split("T")[0];
        }
      }

      setFormData({
        new_start_date: defaultStart,
        new_end_date: defaultEnd,
        new_annual_value: amcContract.annual_value ? String(amcContract.annual_value) : "0",
        payment_frequency: amcContract.payment_frequency || "quarterly",
        remarks: "",
      });
    }
  }, [open, amcContract]);

  if (!open || !amcContract) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.new_start_date || !formData.new_end_date) {
      Swal.fire("Required", "Please select New Start Date and New End Date.", "warning");
      return;
    }

    setLoading(true);
    try {
      const url = `${baseUrl.replace(/\/$/, "")}/lead/amc/contracts/${amcContract.id}/renew/`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          new_start_date: formData.new_start_date,
          new_end_date: formData.new_end_date,
          new_annual_value: parseFloat(formData.new_annual_value || 0),
          payment_frequency: formData.payment_frequency,
          remarks: formData.remarks,
        }),
      });

      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        throw new Error(`Failed to renew AMC contract: ${errTxt}`);
      }

      // Dispatch custom notification for real-time notification drawer update
      const customNotif = {
        id: `custom_amc_renew_${amcContract.id}_${Date.now()}`,
        title: "AMC Contract Renewed",
        description: `AMC contract ${amcContract.contract_id || `#${amcContract.id}`} renewed for period ${formData.new_start_date} to ${formData.new_end_date}.`,
        type: "amc",
        amcId: amcContract.id,
        targetUrl: `/amc?amcId=${amcContract.id}`,
        time: "Just now",
        timestamp: Date.now(),
        read: false,
        priority: "high",
        badge: "AMC Renewed",
      };

      const existingNotifs = JSON.parse(localStorage.getItem("crm_custom_notifs") || "[]");
      localStorage.setItem("crm_custom_notifs", JSON.stringify([customNotif, ...existingNotifs]));
      window.dispatchEvent(new Event("crm_notification_updated"));

      Swal.fire({
        icon: "success",
        title: "AMC Renewed Successfully!",
        text: `Contract ${amcContract.contract_id || `#${amcContract.id}`} has been renewed.`,
        timer: 1500,
        showConfirmButton: false,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Renew AMC Error:", err);
      Swal.fire("Error", err.message || "Failed to renew AMC contract", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 font-sans antialiased">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-600 rounded-lg text-white">
              <MdAutorenew className="text-xl" />
            </span>
            <div>
              <h3 className="font-bold text-base leading-tight">Renew AMC Contract</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {amcContract.contract_id || `#${amcContract.id}`} — {amcContract.customer_details?.company_name || amcContract.customer_details?.name || "Customer"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {/* Current Info Banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between text-blue-900">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Current Cycle</span>
              <span className="font-semibold">{amcContract.start_date || "-"} to {amcContract.end_date || "-"}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Annual Value</span>
              <span className="font-bold text-sm">₹{parseFloat(amcContract.annual_value || 0).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="new_start_date"
                value={formData.new_start_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="new_end_date"
                value={formData.new_end_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New Annual Value (₹)
              </label>
              <input
                type="number"
                step="0.01"
                name="new_annual_value"
                value={formData.new_annual_value}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Frequency
              </label>
              <select
                name="payment_frequency"
                value={formData.payment_frequency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
              >
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
                <option value="half_yearly">Half-Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Renewal Remarks / Notes
            </label>
            <textarea
              name="remarks"
              rows={3}
              value={formData.remarks}
              onChange={handleChange}
              placeholder="e.g. 10% annual price adjustment applied, customer approved via email."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <MdAutorenew className={loading ? "animate-spin text-sm" : "text-sm"} />
              {loading ? "Renewing..." : "Confirm Renewal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
