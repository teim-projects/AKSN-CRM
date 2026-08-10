import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import TableView from "../components/TableView";
import { MdEdit, MdDelete, MdOutlineRemoveRedEye, MdFilterList, MdZoomIn } from "react-icons/md";
import Swal from "sweetalert2";
import AddCustomerForm from "../components/customers/AddCustomerForm";
import AdvancedTableFilter from "../components/AdvancedTableFilter";
import RecordViewer from "../components/RecordViewer";
import { useUserRole } from '../hooks/useAuth';

export default function Customer() {
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const API_URL = `${BASE_API}/lead/customer/`;

  const { hasPermission } = useUserRole(BASE_API);
  const canCreateCustomer = hasPermission("customers", "create");
  const canEditCustomer = hasPermission("customers", "edit");
  const canDeleteCustomer = hasPermission("customers", "delete");

  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);

  // Record Viewer state
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `${API_URL}?limit=1000`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${body ? " — " + body : ""}`);
      }

      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];

      setAllRows(results);
      setFilteredData(results);
      setRows(results);
      setTotalCount(results.length);
      setTotalPages(Math.max(1, Math.ceil(results.length / itemsPerPage)));
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || String(err));
      setRows([]);
      setAllRows([]);
      setFilteredData([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update pagination when filtered data changes
  useEffect(() => {
    setRows(filteredData);
    setTotalCount(filteredData.length);
    setTotalPages(Math.max(1, Math.ceil(filteredData.length / itemsPerPage)));
    setCurrentPage(1);
  }, [filteredData, itemsPerPage]);

  // Get current page data
  const getCurrentPageData = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return rows.slice(startIndex, startIndex + itemsPerPage);
  }, [rows, currentPage, itemsPerPage]);

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Delete customer?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b"
    });
    if (!res.isConfirmed) return;

    try {
      const resp = await fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`${resp.status} ${resp.statusText} — ${text}`);
      }
      Swal.fire({ icon: "success", text: "Customer deleted", timer: 1000, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Delete failed", text: err.message || String(err) });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getProductNames = (productIds) => {
    if (!productIds || productIds.length === 0) return "-";
    return `${productIds.length} product(s)`;
  };

  const getServiceNames = (serviceIds) => {
    if (!serviceIds || serviceIds.length === 0) return "-";
    return `${serviceIds.length} service(s)`;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'prospect': return 'bg-blue-100 text-blue-700';
      case 'inactive': return 'bg-red-100 text-red-700';
      case 'on_hold': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const handleConvertToProject = async (customer) => {
    if (!customer || !customer.id) return;

    const result = await Swal.fire({
      title: "Add to Project?",
      text: `This will create a project entry for "${customer.name || customer.company_name || 'Customer'}" with matching details.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Add to Project",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}${customer.id}/convert-to-project/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to convert customer to project");
      }

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: data.message || "Customer added to Project successfully",
        timer: 2000,
        showConfirmButton: false
      });

      fetchData();
      setProjectCustomer(customer);
      setShowProjectForm(true);
    } catch (err) {
      console.error("Convert to project error:", err);
      setProjectCustomer(customer);
      setShowProjectForm(true);
    }
  };

  // Updated columns matching new Customer model
  const columns = [
    {
      key: "sr",
      label: "#",
      render: (_, idx) => <span className="text-slate-400 font-medium text-[10px] py-0 block">{(currentPage - 1) * itemsPerPage + (idx + 1)}</span>,
      className: "w-8 text-center"
    },
    {
      key: "customer_code",
      label: "Code",
      render: (r) => (
        <div className="py-0">
          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded tracking-wider">
            {r.customer_code || "-"}
          </span>
        </div>
      ),
      className: "w-16"
    },
    {
      key: "name",
      label: "Company Name",
      render: (r) => <span className="text-slate-800 font-medium text-xs tracking-tight py-0 block">{r.name || "-"}</span>,
      className: "min-w-[120px]"
    },
    {
      key: "contact_person",
      label: "Contact Person",
      render: (r) => <span className="text-slate-600 text-xs py-0 block">{r.contact_person || "-"}</span>,
      className: "w-32"
    },
    {
      key: "sales_executive",
      label: "Sales Executive",
      render: (r) => <span className="text-slate-600 text-xs py-0 block">{r.sales_executive_details?.full_name || "-"}</span>,
      className: "w-28"
    },
    {
      key: "contact_number",
      label: "Mobile",
      render: (r) => <span className="text-slate-700 text-xs font-medium whitespace-nowrap py-0 block">{r.contact_number || "-"}</span>,
      className: "w-28"
    },
    {
      key: "email",
      label: "Email",
      render: (r) => r.email ? (
        <a href={`mailto:${r.email}`} className="text-blue-600 hover:underline text-xs py-0 inline-block truncate max-w-[120px]">
          {r.email}
        </a>
      ) : <span className="text-slate-400 text-xs py-0 block">-</span>,
      className: "min-w-[100px]"
    },
    {
      key: "city",
      label: "City",
      render: (r) => <span className="text-slate-600 text-xs py-0 block">{r.city || "-"}</span>,
      className: "w-24"
    },
    {
      key: "state",
      label: "State",
      render: (r) => <span className="text-slate-600 text-xs py-0 block">{r.state || "-"}</span>,
      className: "w-24"
    },
    {
      key: "customer_status",
      label: "Status",
      render: (r) => (
        <div className="py-0">
          <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor(r.customer_status)}`}>
            {r.customer_status || "Prospect"}
          </span>
        </div>
      ),
      className: "w-24"
    },
    {
      key: "created_at",
      label: "Created",
      render: (r) => <span className="text-slate-400 text-[10px] whitespace-nowrap py-0 block">{formatDate(r.created_at)}</span>,
      className: "w-24"
    },
  ];

  const actionsRenderer = useCallback((row) => (
    <div className="flex items-center justify-center gap-1 py-0">
      {/* Convert to Project / Already Added Status */}
      {row.has_project ? (
        <span
          className="p-1 text-emerald-600 bg-emerald-50 rounded text-xs font-bold flex items-center justify-center border border-emerald-200"
          title="Customer already added to Project"
        >
          ✓
        </span>
      ) : (
        <button
          onClick={() => handleConvertToProject(row)}
          className="p-1 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded transition-all duration-150 flex items-center justify-center text-sm shadow-sm cursor-pointer"
          title="Add Customer to Project"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </button>
      )}

      {/* Record Viewer Button */}
      <button
        onClick={() => {
          setSelectedCustomer(row);
          setViewOpen(true);
        }}
        className="p-1 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded transition-all duration-150 text-sm shadow-sm"
        title="View Full Record"
      >
        <MdZoomIn />
      </button>

      {/* View Details Button */}
      <button
        onClick={() => {
          setViewingCustomer(row);
          setShowCustomerDetails(true);
        }}
        className="p-1 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded transition-all duration-150 text-sm shadow-sm"
        title="View Details"
      >
        <MdOutlineRemoveRedEye />
      </button>

      {canEditCustomer && (
        <button
          onClick={() => {
            setEditingCustomer(row);
            setShowCustomerForm(true);
          }}
          className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="Edit"
        >
          <MdEdit />
        </button>
      )}

      {canDeleteCustomer && (
        <button
          onClick={() => handleDelete(row.id)}
          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="Delete"
        >
          <MdDelete />
        </button>
      )}
    </div>
  ), [handleDelete, canEditCustomer, canDeleteCustomer, handleConvertToProject]);

  // Customer Details Modal - Updated with new fields
  const CustomerDetailsModal = ({ customer, open, onClose }) => {
    if (!open || !customer) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 overflow-y-auto p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-xl font-bold text-slate-900 mb-4">Customer Details</h2>

          {/* Customer Code Badge */}
          <div className="mb-4">
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {customer.customer_code || "C001"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Company Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                COMPANY INFORMATION
              </h3>
              <div>
                <span className="text-xs font-medium text-slate-500">Company Name</span>
                <p className="text-sm text-slate-800 font-medium">{customer.name || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Contact Person</span>
                <p className="text-sm text-slate-700">{customer.contact_person || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Designation</span>
                <p className="text-sm text-slate-700">{customer.designation || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Mobile</span>
                <p className="text-sm text-slate-700">{customer.contact_number || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Email</span>
                <p className="text-sm text-slate-700">
                  {customer.email ? (
                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                      {customer.email}
                    </a>
                  ) : "-"}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Website</span>
                <p className="text-sm text-slate-700">
                  {customer.website ? (
                    <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {customer.website}
                    </a>
                  ) : "-"}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Industry Category</span>
                <p className="text-sm text-slate-700">{customer.industry_category_display || customer.industry_category || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">GST Number</span>
                <p className="text-sm text-slate-700 font-mono">{customer.gst_number || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">PAN Number</span>
                <p className="text-sm text-slate-700 font-mono">{customer.pan_number || customer.pan || "-"}</p>
              </div>
            </div>

            {/* Right Column - Commercial & Address */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                COMMERCIAL DETAILS
              </h3>
              <div>
                <span className="text-xs font-medium text-slate-500">Product Purchased</span>
                <p className="text-sm text-slate-700">{getProductNames(customer.product_purchased)}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Service Package</span>
                <p className="text-sm text-slate-700">{getServiceNames(customer.service_package)}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Payment Terms</span>
                <p className="text-sm text-slate-700">{customer.payment_terms_display || customer.payment_terms || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Project Value</span>
                <p className="text-sm text-slate-700">{customer.project_value ? `₹${customer.project_value}` : "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Sales Executive</span>
                <p className="text-sm text-slate-700">{customer.sales_executive_details?.full_name || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Customer Status</span>
                <p className="text-sm">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor(customer.customer_status)}`}>
                    {customer.customer_status_display || customer.customer_status || "Prospect"}
                  </span>
                </p>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mt-2">
                AMC DETAILS
              </h3>
              <div>
                <span className="text-xs font-medium text-slate-500">AMC Start Date</span>
                <p className="text-sm text-slate-700">{customer.amc_start_date || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">AMC End Date</span>
                <p className="text-sm text-slate-700">{customer.amc_end_date || "-"}</p>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mt-2">
                ADDRESS
              </h3>
              <div>
                <span className="text-xs font-medium text-slate-500">Billing Address</span>
                <p className="text-sm text-slate-700">{customer.billing_address || customer.address || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">City</span>
                <p className="text-sm text-slate-700">{customer.city || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">State</span>
                <p className="text-sm text-slate-700">{customer.state || "-"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Pin Code</span>
                <p className="text-sm text-slate-700">{customer.pin_code || "-"}</p>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500">Created At</span>
                <p className="text-sm text-slate-700">{formatDate(customer.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
            {customer.has_project ? (
              <span className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                ✓ Added to Project
              </span>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  handleConvertToProject(customer);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                + Add to Project
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const currentPageData = getCurrentPageData();

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 -mt-5 px-1">

        {/* HEADER BLOCK WITH BLUE ACCENT */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Customers</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Synchronizing core accounts..." : `Total ${totalCount} records identified across channels`}
              </p>
            </div>
          </div>
          <div className="mt-3 md:mt-0 flex items-center gap-3">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <MdFilterList className="text-slate-400" />
              Filter
            </button>
            {canCreateCustomer && (
              <button
                onClick={() => {
                  setEditingCustomer(null);
                  setShowCustomerForm(true);
                }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Customer
              </button>
            )}
          </div>
        </div>

        {/* CONTAINER FOR TABLE WRAPPER WITH BORDER/SHADOW */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <TableView
            columns={columns}
            rows={currentPageData}
            loading={loading}
            error={error}
            page={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => {
              if (p < 1 || p > totalPages) return;
              setCurrentPage(p);
            }}
            pageSize={itemsPerPage}
            actions={actionsRenderer}
            emptyMessage="No customer records matches the active criteria filters"
            rowClassName={() => "hover:bg-slate-50/80 transition-colors duration-150"}
          />
        </div>
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
            data={allRows}
            onFilter={setFilteredData}
            setItemsPerPage={setItemsPerPage}
            columns={columns}
          />
        </div>
      </div>

      {/* RECORD VIEWER - Slides in from right */}
      <RecordViewer
        isOpen={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setSelectedCustomer(null);
        }}
        record={selectedCustomer}
        title="Customer Details"
      />

      {/* Add/Edit Customer Form */}
      <AddCustomerForm
        open={showCustomerForm}
        onClose={() => {
          setShowCustomerForm(false);
          setEditingCustomer(null);
        }}
        baseApi={BASE_API}
        customer={editingCustomer}
        onSuccess={() => {
          if (!editingCustomer) {
            fetchData();
          } else {
            fetchData();
          }
          setEditingCustomer(null);
          setShowCustomerForm(false);
        }}
      />

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        customer={viewingCustomer}
        open={showCustomerDetails}
        onClose={() => {
          setShowCustomerDetails(false);
          setViewingCustomer(null);
        }}
      />
    </Base>
  );
}