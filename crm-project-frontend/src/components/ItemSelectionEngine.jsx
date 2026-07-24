import { useEffect, useState } from "react";
import axios from "axios";
import { MdDelete } from "react-icons/md";
import {
  toNum,
  formatAmount,
  normalizeLowSideItem,
  normalizeHighSideItem,
} from "../utils/numberFormat";
import { formatMaterialLabel } from "../utils/materialLabel";

export default function ItemSelectionEngine({
  baseApi,
  authToken,
  items,
  setItems,
  lowItems,
  setLowItems,
  mode = "quotation",
  gstType,
  onServiceItemsChange,
}) {

  const isInvoice = mode === "invoice";

  // Add GST toggle states
  const [highSideGstEnabled, setHighSideGstEnabled] = useState(true);
  const [lowSideGstEnabled, setLowSideGstEnabled] = useState(true);

  // Add tab state for low side
  const [lowSideActiveTab, setLowSideActiveTab] = useState("materials");

  // Add service items state
  const [serviceItems, setServiceItems] = useState([]);

  // Update existing high side items when GST toggle changes
  useEffect(() => {
    setItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        gst_percent: highSideGstEnabled ? (item.gst_percent || 18) : 0
      }))
    );
  }, [highSideGstEnabled]);

  // Update existing low side items when GST toggle changes
  useEffect(() => {
    setLowItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        gst_percent: lowSideGstEnabled ? (item.gst_percent || 18) : 0
      }))
    );
  }, [lowSideGstEnabled]);

  // Unit options array
  const unitOptions = ["Rmt", "Ft", "Smtr", "Sqft", "Nos", "Kg", "Lot", "m", "in"];

  /* ================= DRAFT STATES ================= */

  const [draftHighItem, setDraftHighItem] = useState({
    product_name: "",
    product_sku: "",
    description: "",
    hsn_sac: "",
    unit: "Nos",
    quantity: "",
    unit_price: "",
    rate: "",
    gst_percent: "",
    mathadi_charges: "",
    transportation_charges: "",
    category: ""
  });

  const [draftLowItem, setDraftLowItem] = useState({
    material_type_id: "",
    item_type_id: "",
    feature_type_id: "",
    item_class_id: "",
    item: "",
    brand: "",
    description: "",
    hsn_sac: "",
    unit: "Nos",
    quantity: "",
    unit_price: "",
    rate: "",
    gst_percent: "",
    mathadi_charges: ""
  });

  // Add service draft state
  const [draftServiceItem, setDraftServiceItem] = useState({
    service: "",
    service_type: "",
    category: "",
    material: "",
    quantity: "",
    unit: "NOS",
    price: "",
    gst_percent: "",
    mathadi_charges: ""
  });

  /* ================= HARDCODED MASTERS ================= */
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [resetMaterials, setResetMaterials] = useState(0);
  
  // Hardcoded materials for testing
  const hardcodedMaterials = [
    { id: 1, material_type_name: "Copper", item_code: "COP-001", brand_id: 1, brand_name: "Generic", size: "1/2", size_unit: "in", thickness: "0.8", thickness_unit: "mm", unit: "Nos" },
    { id: 2, material_type_name: "Steel", item_code: "STL-002", brand_id: 1, brand_name: "Generic", size: "2", size_unit: "in", thickness: "1.2", thickness_unit: "mm", unit: "Nos" },
    { id: 3, material_type_name: "Aluminum", item_code: "ALM-003", brand_id: 2, brand_name: "Alumax", size: "1", size_unit: "in", thickness: "0.6", thickness_unit: "mm", unit: "Nos" },
    { id: 4, material_type_name: "Brass", item_code: "BRS-004", brand_id: 2, brand_name: "Alumax", size: "3/4", size_unit: "in", thickness: "0.5", thickness_unit: "mm", unit: "Nos" },
  ];

  // Hardcoded brands for testing
  const brands = [
    { id: 1, name: "Generic" },
    { id: 2, name: "Alumax" },
    { id: 3, name: "Samsung" },
    { id: 4, name: "LG" },
    { id: 5, name: "Daikin" },
  ];

  // Hardcoded services for testing
  const materials = [
    { 
      id: 1, 
      name: "AC Installation Service", 
      service_type: "MATERIAL", 
      category: "Installation",
      unit: "Nos",
      labor_rate: 500,
      items: [
        { id: 1, item_code: "COP-001", name: "Copper Pipe" },
        { id: 2, item_code: "STL-002", name: "Steel Bracket" },
      ]
    },
    { 
      id: 2, 
      name: "AC Repair Service", 
      service_type: "LABOR", 
      category: "Service",
      unit: "Nos",
      labor_rate: 300,
      items: []
    },
    { 
      id: 3, 
      name: "AC Maintenance Service", 
      service_type: "LABOR", 
      category: "Maintenance",
      unit: "Nos",
      labor_rate: 200,
      items: []
    },
    { 
      id: 4, 
      name: "Gas Filling Service", 
      service_type: "MATERIAL", 
      category: "Service",
      unit: "Nos",
      labor_rate: 150,
      items: [
        { id: 3, item_code: "GAS-001", name: "R32 Gas" },
        { id: 4, item_code: "GAS-002", name: "R410 Gas" },
      ]
    },
  ];

  // Service masters for rendering
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  /* ================= UPDATE DRAFT FUNCTIONS ================= */
  const updateHighDraft = (field, value) => {
    const copy = { ...draftHighItem, [field]: value };
    setDraftHighItem(copy);
  };

  const updateLowDraft = (field, value) => {
    const copy = { ...draftLowItem, [field]: value };
    setDraftLowItem(copy);
  };

  const updateLowItemRow = (index, field, value) => {
    setLowItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const updateServiceDraft = (field, value) => {
    setDraftServiceItem(prev => ({ ...prev, [field]: value }));
  };

  /* ================= SERVICE HANDLERS ================= */
  const handleMaterialChange = (serviceId) => {
    const selectedService = materials.find(s => s.id === parseInt(serviceId));
    if (selectedService) {
      updateServiceDraft("service", serviceId);
      updateServiceDraft("service_type", selectedService.service_type);
      updateServiceDraft("category", selectedService.category);
      updateServiceDraft("unit", selectedService.unit || "NOS");
      updateServiceDraft("price", selectedService.labor_rate || 0);
      updateServiceDraft("material", "");
    }
  };

  /* ================= ADD ROWS ================= */

  const addHighItem = () => {
    if (!draftHighItem.product_name) {
      alert("Enter Product Name");
      return;
    }

    const newRow = normalizeHighSideItem({
      ...draftHighItem,
      gst_percent: highSideGstEnabled ? toNum(draftHighItem.gst_percent, 18) : 0,
    });

    setItems(prev => [...prev, newRow]);

    setDraftHighItem({
      product_name: "",
      product_sku: "",
      description: "",
      hsn_sac: "",
      unit: "Nos",
      quantity: "",
      unit_price: "",
      rate: "",
      gst_percent: "",
      mathadi_charges: "",
      transportation_charges: "",
      category: ""
    });
  };

  const addLowItem = () => {
    if (selectedMaterials.length === 0) {
      alert("Select Material");
      return;
    }

    const newItems = selectedMaterials.map(mat => {
      const displayName = mat.material_name || mat.item_code || "Unknown";
      const selectedBrand = brands.find(b => b.id == mat.brand_id);
      const brandNameToUse = selectedBrand?.name || mat.brand_name || "";

      return normalizeLowSideItem({
        ...draftLowItem,
        gst_percent: lowSideGstEnabled ? toNum(draftLowItem.gst_percent, 18) : 0,
        unit: mat.unit || draftLowItem.unit,
        item: mat.id,
        item_code: displayName,
        material_display_name: displayName,
        material_name: mat.material_type_name || "",
        size: mat.size || "",
        size_unit: mat.size_unit || "",
        thickness: mat.thickness || "",
        thickness_unit: mat.thickness_unit || "",
        brand: mat.brand_id || draftLowItem.brand,
        brand_name: brandNameToUse,
      });
    });

    setLowItems(prev => [...prev, ...newItems]);

    setSelectedMaterials([]);
    setResetMaterials(prev => prev + 1);

    setDraftLowItem({
      material_type_id: "",
      item_type_id: "",
      feature_type_id: "",
      item_class_id: "",
      item: "",
      brand: "",
      description: "",
      hsn_sac: "",
      unit: "Nos",
      quantity: "",
      unit_price: "",
      rate: "",
      gst_percent: "",
      mathadi_charges: ""
    });
  };

  const addServiceItem = () => {
    if (!draftServiceItem.service) {
        alert("Please select a service");
        return;
    }
    
    if (draftServiceItem.service_type === 'MATERIAL' && !draftServiceItem.material) {
        alert("Please select at least one material");
        return;
    }

    const selectedService = materials.find(s => s.id === parseInt(draftServiceItem.service));
    const selectedMaterialIds = draftServiceItem.material 
        ? draftServiceItem.material.split(',').map(Number) 
        : [];

    const quantity = toNum(draftServiceItem.quantity);
    const price = toNum(draftServiceItem.price);
    const gstPercent = toNum(draftServiceItem.gst_percent);
    const mathadiCharges = toNum(draftServiceItem.mathadi_charges);
    const baseAmount = quantity * price;
    const gstAmount = (baseAmount * gstPercent) / 100;
    const totalAmount = baseAmount + gstAmount + mathadiCharges;

    const buildServiceEntry = (materialId, materialName) => ({
        id: Date.now() + Math.random(),
        service_id: draftServiceItem.service,
        service_name: selectedService?.name || "",
        category: draftServiceItem.category,
        material_id: materialId,
        material_name: materialName,
        quantity,
        unit: draftServiceItem.unit,
        price,
        gst_percent: gstPercent,
        mathadi_charges: mathadiCharges,
        base_amount: baseAmount,
        gst_amount: gstAmount,
        total_amount: totalAmount,
    });

    let entriesToAdd = [];

    if (draftServiceItem.service_type === 'LABOR' || selectedMaterialIds.length === 0) {
        entriesToAdd = [buildServiceEntry(null, "(Labor Only)")];
    } else {
        entriesToAdd = selectedMaterialIds.map(materialId => {
            const selectedMaterial = selectedService?.items?.find(item => item.id === materialId);
            return buildServiceEntry(materialId, selectedMaterial?.item_code || "");
        });
    }

    setServiceItems(prev => {
        const updated = [...prev, ...entriesToAdd];
        onServiceItemsChange?.(updated);
        return updated;
    });

    setDraftServiceItem({
        service: "",
        service_type: "",
        category: "",
        material: "",
        quantity: "",
        unit: "NOS",
        price: "",
        gst_percent: "",
        mathadi_charges: ""
    });
  };

  const removeServiceItem = (serviceId) => {
    setServiceItems(prev => {
      const updated = prev.filter(item => item.id !== serviceId);
      onServiceItemsChange?.(updated);
      return updated;
    });
  };

  /* ================= MATERIAL SELECTION ================= */
  const handleMaterialSelection = (materialId) => {
    const selected = hardcodedMaterials.find(m => m.id === materialId);
    if (selected) {
      setSelectedMaterials(prev => {
        // Check if already selected
        if (prev.find(m => m.id === materialId)) {
          return prev.filter(m => m.id !== materialId);
        }
        return [...prev, selected];
      });
    }
  };

  const removeSelectedMaterial = (materialId) => {
    setSelectedMaterials(prev => prev.filter(m => m.id !== materialId));
  };

  /* ================= EFFECTS ================= */

  // Load materials and services on mount
  useEffect(() => {
    // No API calls needed - using hardcoded data
  }, []);

  // Handle selected materials brand logic
  useEffect(() => {
    if (selectedMaterials.length > 0) {
      const uniqueBrands = [...new Set(selectedMaterials.map(mat => mat.brand_id).filter(Boolean))];

      if (uniqueBrands.length === 1) {
        updateLowDraft("brand", uniqueBrands[0]);
      } else if (uniqueBrands.length > 1) {
        updateLowDraft("brand", "");
      } else {
        updateLowDraft("brand", "");
      }
    }
  }, [selectedMaterials]);

  useEffect(() => {
    if (selectedMaterials.length === 1) {
      const mat = selectedMaterials[0];
      setDraftLowItem(prev => ({
        ...prev,
        unit: mat.unit || prev.unit
      }));
    }
  }, [selectedMaterials]);

  /* ================= RENDER FUNCTIONS ================= */

  const renderMaterialsTab = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Select Materials</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {hardcodedMaterials.map(mat => (
            <button
              key={mat.id}
              type="button"
              onClick={() => handleMaterialSelection(mat.id)}
              className={`px-3 py-2 text-sm rounded border text-left transition ${
                selectedMaterials.find(m => m.id === mat.id)
                  ? 'bg-blue-100 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{mat.item_code}</div>
              <div className="text-xs text-gray-500">{mat.material_type_name}</div>
            </button>
          ))}
        </div>
        {selectedMaterials.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedMaterials.map(mat => (
              <span 
                key={mat.id} 
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
              >
                {mat.item_code}
                <button 
                  type="button" 
                  onClick={() => removeSelectedMaterial(mat.id)}
                  className="text-blue-500 hover:text-blue-700 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <input
          type="number"
          placeholder="Qty"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={draftLowItem.quantity}
          onChange={e => updateLowDraft("quantity", e.target.value)}
        />

        <input
          type="number"
          placeholder={isInvoice ? "Rate" : "Price"}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={isInvoice ? draftLowItem.rate : draftLowItem.unit_price}
          onChange={e => updateLowDraft(isInvoice ? "rate" : "unit_price", e.target.value)}
        />

        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={draftLowItem.brand}
          onChange={e => updateLowDraft("brand", e.target.value)}
        >
          <option value="">Select Brand</option>
          {brands.map(brand => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>

        {lowSideGstEnabled && (
          <input
            type="number"
            placeholder="GST%"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={draftLowItem.gst_percent}
            onChange={e => updateLowDraft("gst_percent", e.target.value)}
          />
        )}

        {!isInvoice && (
          <div className="grid grid-cols-1 gap-3">
            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="number"
              placeholder="Mathadi Charges"
              value={draftLowItem.mathadi_charges}
              onChange={e => updateLowDraft("mathadi_charges", e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="HSN"
          value={draftLowItem.hsn_sac}
          onChange={e => updateLowDraft("hsn_sac", e.target.value)}
        />

        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={draftLowItem.unit}
          onChange={e => updateLowDraft("unit", e.target.value)}
        >
          {unitOptions.map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 items-start">
        <textarea
          className="border border-gray-300 rounded-md px-3 py-2 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter item description..."
          value={draftLowItem.description}
          onChange={e => updateLowDraft("description", e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );

  const renderServicesTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h4 className="text-md font-medium mb-4">Add Service</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={draftServiceItem.service}
            onChange={(e) => handleMaterialChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Service</option>
            {materials.map(service => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>

          {draftServiceItem.service_type === 'MATERIAL' && (
            <select
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const currentMaterials = draftServiceItem.material
                  ? draftServiceItem.material.split(',').map(Number)
                  : [];
                if (val && !currentMaterials.includes(val)) {
                  updateServiceDraft("material", [...currentMaterials, val].join(','));
                }
                e.target.value = "";
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Material</option>
              {materials
                .find(s => s.id === parseInt(draftServiceItem.service))
                ?.items?.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.item_code}
                  </option>
                )) || []}
            </select>
          )}
        </div>

        {draftServiceItem.service_type === 'MATERIAL' && (
          <div className="flex flex-wrap gap-2">
            {(draftServiceItem.material
              ? draftServiceItem.material.split(',').map(Number)
              : [])
              .map((materialId) => {
                const mat = materials
                  .find(s => s.id === parseInt(draftServiceItem.service))
                  ?.items?.find(item => item.id === materialId);

                return mat ? (
                  <div
                    key={materialId}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                  >
                    {mat.item_code}
                    <button
                      onClick={() => {
                        const currentMaterials = draftServiceItem.material
                          .split(',')
                          .map(Number)
                          .filter(id => id !== materialId);
                        updateServiceDraft("material", currentMaterials.join(','));
                      }}
                      className="text-red-500 font-bold hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ) : null;
              })}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="number"
            placeholder="Quantity"
            value={draftServiceItem.quantity}
            onChange={(e) => updateServiceDraft("quantity", e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={draftServiceItem.unit}
            onChange={(e) => updateServiceDraft("unit", e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {unitOptions.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="GST Percentage"
            value={draftServiceItem.gst_percent}
            onChange={(e) => updateServiceDraft("gst_percent", e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="number"
            placeholder="Mathadi Charges"
            value={draftServiceItem.mathadi_charges}
            onChange={(e) => updateServiceDraft("mathadi_charges", e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="number"
            placeholder="Price per unit"
            value={draftServiceItem.price}
            onChange={(e) => updateServiceDraft("price", e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={addServiceItem}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          + Add Service
        </button>
      </div>
    </div>
  );

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <style>
        {`
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>

      {/* ================= HIGH SIDE ================= */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h3 className="font-medium text-gray-700">High Side Products</h3>
            <button
              type="button"
              onClick={() => setHighSideGstEnabled(!highSideGstEnabled)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${highSideGstEnabled
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-300'
                }`}
            >
              GST {highSideGstEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <button
            type="button"
            onClick={addHighItem}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            + Add Product
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Product Name *
            </label>
            <input
              type="text"
              placeholder="Enter product name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={draftHighItem.product_name}
              onChange={e => updateHighDraft("product_name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              placeholder="SKU (optional)"
              value={draftHighItem.product_sku}
              onChange={e => updateHighDraft("product_sku", e.target.value)}
            />

            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="number"
              placeholder="Qty"
              value={draftHighItem.quantity}
              onChange={e => updateHighDraft("quantity", e.target.value)}
            />

            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="number"
              placeholder={isInvoice ? "Rate" : "Price"}
              value={isInvoice ? draftHighItem.rate : draftHighItem.unit_price}
              onChange={e => updateHighDraft(isInvoice ? "rate" : "unit_price", e.target.value)}
            />

            {highSideGstEnabled && (
              <input
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                type="number"
                placeholder="GST%"
                value={draftHighItem.gst_percent}
                onChange={e => updateHighDraft("gst_percent", e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              placeholder="Category"
              value={draftHighItem.category}
              onChange={e => updateHighDraft("category", e.target.value)}
            />

            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="HSN"
              value={draftHighItem.hsn_sac}
              onChange={e => updateHighDraft("hsn_sac", e.target.value)}
            />

            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={draftHighItem.unit}
              onChange={e => updateHighDraft("unit", e.target.value)}
            >
              {unitOptions.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>

            {!isInvoice && (
              <input
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                type="number"
                placeholder="Mathadi Charges"
                value={draftHighItem.mathadi_charges}
                onChange={e => updateHighDraft("mathadi_charges", e.target.value)}
              />
            )}
          </div>

          {!isInvoice && (
            <div className="grid grid-cols-1 gap-3">
              <input
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                type="number"
                placeholder="Transportation Charges"
                value={draftHighItem.transportation_charges}
                onChange={e => updateHighDraft("transportation_charges", e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-3 items-start">
            <textarea
              className="border border-gray-300 rounded-md px-3 py-2 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter product description..."
              value={draftHighItem.description}
              onChange={e => updateHighDraft("description", e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {items.length > 0 && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] table-fixed text-sm border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-12 px-2 py-2 border-r">#</th>
                    <th className="w-40 px-2 py-2 border-r">Product</th>
                    <th className="w-24 px-2 py-2 border-r">SKU</th>
                    <th className="w-24 px-2 py-2 border-r">HSN</th>
                    <th className="w-20 px-2 py-2 border-r">Unit</th>
                    <th className="w-20 px-2 py-2 border-r">Qty</th>
                    <th className="w-28 px-2 py-2 border-r">{isInvoice ? "Rate" : "Price"}</th>
                    {highSideGstEnabled && (
                      <th className="w-20 px-2 py-2 border-r">GST%</th>
                    )}
                    {!isInvoice && (
                      <>
                        <th className="w-28 px-2 py-2 border-r">Mathadi</th>
                        <th className="w-28 px-2 py-2 border-r">Transport</th>
                      </>
                    )}
                    <th className="px-2 py-2 border-r">Description</th>
                    <th className="w-16 px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => {
                    const productName = row.product_name || row.variant_sku || row.product_variant || "Unknown";
                    return (
                      <tr key={i} className="border-b">
                        <td className="w-12 px-2 py-2 border-r">{i + 1}</td>
                        <td className="w-40 px-2 py-2 border-r truncate">{productName}</td>
                        <td className="w-24 px-2 py-2 border-r truncate">{row.product_sku || row.variant_sku || ""}</td>
                        <td className="w-24 px-2 py-2 border-r">
                          <input className="w-full border rounded px-1 py-1"
                            value={row.hsn_sac || ""}
                            onChange={e => {
                              const copy = [...items];
                              copy[i].hsn_sac = e.target.value;
                              setItems(copy);
                            }}
                          />
                        </td>
                        <td className="w-20 px-2 py-2 border-r">
                          <select className="w-full border rounded px-1 py-1"
                            value={row.unit || "Nos"}
                            onChange={e => {
                              const copy = [...items];
                              copy[i].unit = e.target.value;
                              setItems(copy);
                            }}>
                            {unitOptions.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </td>
                        <td className="w-20 px-2 py-2 border-r">
                          <input type="number"
                            className="w-full border rounded px-1 py-1"
                            value={row.quantity}
                            onChange={e => {
                              const copy = [...items];
                              copy[i].quantity = e.target.value;
                              setItems(copy);
                            }}
                          />
                        </td>
                        <td className="w-28 px-2 py-2 border-r">
                          <input type="number"
                            className="w-full border rounded px-1 py-1"
                            value={isInvoice ? row.rate : row.unit_price}
                            onChange={e => {
                              const copy = [...items];
                              copy[i][isInvoice ? "rate" : "unit_price"] = e.target.value;
                              setItems(copy);
                            }}
                          />
                        </td>
                        {highSideGstEnabled && (
                          <td className="w-20 px-2 py-2 border-r">
                            <input type="number"
                              className="w-full border rounded px-1 py-1"
                              value={row.gst_percent}
                              onChange={e => {
                                const copy = [...items];
                                copy[i].gst_percent = e.target.value;
                                setItems(copy);
                              }}
                            />
                          </td>
                        )}
                        {!isInvoice && (
                          <>
                            <td className="w-28 px-2 py-2 border-r">
                              <input type="number"
                                className="w-full border rounded px-1 py-1"
                                value={row.mathadi_charges || 0}
                                onChange={e => {
                                  const copy = [...items];
                                  copy[i].mathadi_charges = e.target.value;
                                  setItems(copy);
                                }}
                              />
                            </td>
                            <td className="w-28 px-2 py-2 border-r">
                              <input type="number"
                                className="w-full border rounded px-1 py-1"
                                value={row.transportation_charges || 0}
                                onChange={e => {
                                  const copy = [...items];
                                  copy[i].transportation_charges = e.target.value;
                                  setItems(copy);
                                }}
                              />
                            </td>
                          </>
                        )}
                        <td className="px-2 py-2 border-r">
                          <textarea
                            className="w-full border rounded px-1 py-1 text-xs"
                            value={row.description || ""}
                            onChange={e => {
                              const copy = [...items];
                              copy[i].description = e.target.value;
                              setItems(copy);
                            }}
                          />
                        </td>
                        <td className="w-16 px-2 py-2 text-center">
                          <button onClick={() =>
                            setItems(prev => prev.filter((_, idx) => idx !== i))
                          }>
                            <MdDelete />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= LOW SIDE WITH TABS ================= */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h3 className="font-medium text-gray-700">Low Side Items</h3>
            <button
              type="button"
              onClick={() => setLowSideGstEnabled(!lowSideGstEnabled)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${lowSideGstEnabled
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-300'
                }`}
            >
              GST {lowSideGstEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <button
            type="button"
            onClick={lowSideActiveTab === "materials" ? addLowItem : addServiceItem}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            + Add {lowSideActiveTab === "materials" ? "Product" : "Service"}
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setLowSideActiveTab("materials")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${lowSideActiveTab === "materials"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Materials
              </button>
              <button
                type="button"
                onClick={() => setLowSideActiveTab("services")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${lowSideActiveTab === "services"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Services
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {lowSideActiveTab === "materials" ? renderMaterialsTab() : renderServicesTab()}
        </div>

        {/* Low Side Items Table */}
        {lowSideActiveTab === "materials" && lowItems.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] table-fixed text-sm border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-12 px-2 py-2 border-r">#</th>
                    <th className="w-48 px-2 py-2 border-r">Item</th>
                    <th className="w-24 px-2 py-2 border-r">HSN</th>
                    <th className="w-20 px-2 py-2 border-r">Unit</th>
                    <th className="w-20 px-2 py-2 border-r">Qty</th>
                    <th className="w-28 px-2 py-2 border-r">{isInvoice ? "Rate" : "Price"}</th>
                    {lowSideGstEnabled && (
                      <th className="w-20 px-2 py-2 border-r">GST%</th>
                    )}
                    {!isInvoice && (
                      <th className="w-28 px-2 py-2 border-r">Mathadi</th>
                    )}
                    <th className="px-2 py-2 border-r">Description</th>
                    <th className="w-16 px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowItems.map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="w-12 px-2 py-2 border-r">{i + 1}</td>
                      <td className="w-48 px-2 py-2 border-r text-xs leading-snug" title={formatMaterialLabel(row) || row.material_display_name || ""}>
                        {formatMaterialLabel(row) || row.material_display_name || row.item_code || "Unknown"}
                      </td>
                      <td className="w-24 px-2 py-2 border-r">
                        <input
                          className="w-full border rounded px-1 py-1"
                          value={row.hsn_sac || ""}
                          onChange={e => updateLowItemRow(i, "hsn_sac", e.target.value)}
                        />
                      </td>
                      <td className="w-20 px-2 py-2 border-r">
                        <select
                          className="w-full border rounded px-1 py-1"
                          value={row.unit || "Nos"}
                          onChange={e => updateLowItemRow(i, "unit", e.target.value)}
                        >
                          {unitOptions.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </td>
                      <td className="w-20 px-2 py-2 border-r">
                        <input
                          type="number"
                          className="w-full border rounded px-1 py-1"
                          value={row.quantity ?? ""}
                          onChange={e => updateLowItemRow(i, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="w-28 px-2 py-2 border-r">
                        <input
                          type="number"
                          className="w-full border rounded px-1 py-1"
                          value={isInvoice ? (row.rate ?? "") : (row.unit_price ?? "")}
                          onChange={e => updateLowItemRow(i, isInvoice ? "rate" : "unit_price", e.target.value)}
                        />
                      </td>
                      {lowSideGstEnabled && (
                        <td className="w-20 px-2 py-2 border-r">
                          <input
                            type="number"
                            className="w-full border rounded px-1 py-1"
                            value={row.gst_percent ?? ""}
                            onChange={e => updateLowItemRow(i, "gst_percent", e.target.value)}
                          />
                        </td>
                      )}
                      {!isInvoice && (
                        <td className="w-28 px-2 py-2 border-r">
                          <input
                            type="number"
                            className="w-full border rounded px-1 py-1"
                            value={row.mathadi_charges ?? ""}
                            onChange={e => updateLowItemRow(i, "mathadi_charges", e.target.value)}
                          />
                        </td>
                      )}
                      <td className="px-2 py-2 border-r">
                        <textarea
                          className="w-full border rounded px-1 py-1 text-xs"
                          value={row.description || ""}
                          onChange={e => updateLowItemRow(i, "description", e.target.value)}
                          rows={2}
                        />
                      </td>
                      <td className="w-16 px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setLowItems(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <MdDelete />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Services Table */}
        {serviceItems.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Service / Material</th>
                  <th className="px-4 py-3 text-left font-medium">Unit</th>
                  <th className="px-4 py-3 text-left font-medium">Qty</th>
                  <th className="px-4 py-3 text-left font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">GST%</th>
                  <th className="px-4 py-3 text-center font-medium">Total</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(() => {
                  let serviceIndex = 1;
                  const serviceGroups = {};
                  
                  serviceItems.forEach(item => {
                    if (!serviceGroups[item.service_id]) {
                      serviceGroups[item.service_id] = [];
                    }
                    serviceGroups[item.service_id].push(item);
                  });
                  
                  return Object.entries(serviceGroups).map(([serviceId, items]) => {
                    const rows = [];
                    
                    rows.push(
                      <tr key={`service-${serviceId}`} className="bg-gray-50 hover:bg-gray-100">
                        <td className="px-4 py-3 font-bold text-lg">{serviceIndex}</td>
                        <td className="px-4 py-3 font-semibold">
                          {items[0].service_name} <span className="text-gray-600 text-sm"> {items[0].category}</span>
                        </td>
                        <td colSpan="6"></td>
                      </tr>
                    );
                    
                    items.forEach((item, materialIndex) => {
                      rows.push(
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold">{serviceIndex}.{materialIndex + 1}</td>
                          <td className="px-4 py-3">{item.material_name}</td>
                          <td className="px-4 py-3">{item.unit}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...serviceItems];
                                const idx = serviceItems.findIndex(i => i.id === item.id);
                                updated[idx].quantity = toNum(e.target.value);
                                updated[idx].base_amount = toNum(updated[idx].quantity) * toNum(updated[idx].price);
                                updated[idx].gst_amount = (updated[idx].base_amount * toNum(updated[idx].gst_percent)) / 100;
                                updated[idx].total_amount = updated[idx].base_amount + updated[idx].gst_amount + toNum(updated[idx].mathadi_charges);
                                setServiceItems(updated);
                              }}
                              className="w-16 border border-gray-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const updated = [...serviceItems];
                                const idx = serviceItems.findIndex(i => i.id === item.id);
                                updated[idx].price = toNum(e.target.value);
                                updated[idx].base_amount = toNum(updated[idx].quantity) * toNum(updated[idx].price);
                                updated[idx].gst_amount = (updated[idx].base_amount * toNum(updated[idx].gst_percent)) / 100;
                                updated[idx].total_amount = updated[idx].base_amount + updated[idx].gst_amount + toNum(updated[idx].mathadi_charges);
                                setServiceItems(updated);
                              }}
                              className="w-20 border border-gray-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.gst_percent}
                              onChange={(e) => {
                                const updated = [...serviceItems];
                                const idx = serviceItems.findIndex(i => i.id === item.id);
                                updated[idx].gst_percent = toNum(e.target.value);
                                updated[idx].gst_amount = (updated[idx].base_amount * toNum(updated[idx].gst_percent)) / 100;
                                updated[idx].total_amount = updated[idx].base_amount + updated[idx].gst_amount + toNum(updated[idx].mathadi_charges);
                                setServiceItems(updated);
                              }}
                              className="w-16 border border-gray-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">₹{formatAmount(item.total_amount)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeServiceItem(item.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                    
                    serviceIndex++;
                    return rows;
                  }).flat();
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}