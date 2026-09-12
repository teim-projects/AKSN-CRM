import React, { useState, useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Package,
  Boxes,
  Users,
  ShoppingBag,
  Award,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";

// Harmonious, elegant pastel palette with high visual contrast and clarity
const PASTEL_PALETTE = [
  { hex: "#60A5FA", bgClass: "bg-[#60A5FA]", border: "#3B82F6", text: "#1E40AF", lightBg: "#EFF6FF", name: "Sky" },
  { hex: "#34D399", bgClass: "bg-[#34D399]", border: "#10B981", text: "#065F46", lightBg: "#ECFDF5", name: "Mint" },
  { hex: "#A78BFA", bgClass: "bg-[#A78BFA]", border: "#8B5CF6", text: "#5B21B6", lightBg: "#F5F3FF", name: "Lavender" },
  { hex: "#FB923C", bgClass: "bg-[#FB923C]", border: "#F97316", text: "#9A3412", lightBg: "#FFF7ED", name: "Peach" },
  { hex: "#F472B6", bgClass: "bg-[#F472B6]", border: "#EC4899", text: "#9D174D", lightBg: "#FDF2F8", name: "Blush" },
  { hex: "#FBBF24", bgClass: "bg-[#FBBF24]", border: "#F59E0B", text: "#854D0E", lightBg: "#FEFCE8", name: "Honey" },
  { hex: "#2DD4BF", bgClass: "bg-[#2DD4BF]", border: "#14B8A6", text: "#115E59", lightBg: "#F0FDFA", name: "Aqua" },
  { hex: "#FB7185", bgClass: "bg-[#FB7185]", border: "#F43F5E", text: "#9F1239", lightBg: "#FFF1F2", name: "Rose" },
  { hex: "#818CF8", bgClass: "bg-[#818CF8]", border: "#6366F1", text: "#3730A3", lightBg: "#EEF2FF", name: "Indigo" },
  { hex: "#94A3B8", bgClass: "bg-[#94A3B8]", border: "#64748B", text: "#334155", lightBg: "#F8FAFC", name: "Slate" },
];

export default function ProductDashboard({
  products = [],
  categories = [],
  quotations = [],
  customers = [],
  amcContracts = [],
  projects = [],
  isLoading = false,
}) {
  const [hoveredUnitIndex, setHoveredUnitIndex] = useState(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [hoveredProductIndex, setHoveredProductIndex] = useState(null);

  const totalProducts = products.length;

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount) || amount === 0) return "₹0";
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  // 1. AGGREGATE PRODUCT SALES & PROJECT DEPLOYMENTS (JUDGED BY PROJECT)
  const {
    productSalesList,
    totalProjectUnits,
    totalProjectRevenue,
    totalProjectsCount,
    topProjectProduct,
    unsoldProductsCount,
    unsoldRate,
  } = useMemo(() => {
    const productMap = {};
    const allProjectsSet = new Set();

    // Helper to resolve product name
    const resolveName = (raw) => {
      if (!raw) return "";
      if (typeof raw === "object") {
        return raw.name || raw.product_name || raw.title || "";
      }
      const found = products.find(
        (p) =>
          String(p.id) === String(raw) ||
          String(p.name).toLowerCase() === String(raw).toLowerCase()
      );
      return found ? found.name : String(raw);
    };

    // Initialize from Master Products
    products.forEach((p) => {
      const normKey = (p.name || "").trim().toLowerCase();
      if (!normKey) return;
      productMap[normKey] = {
        id: p.id,
        name: p.name,
        code: p.product_code || "-",
        category:
          p.category?.name ||
          p.category_name ||
          (typeof p.category === "string" ? p.category : "General"),
        unitPrice: parseFloat(p.unit_price || 0),
        status: (p.status || "ACTIVE").toUpperCase(),
        projectCount: 0,
        unitsSold: 0,
        totalRevenue: 0,
        projectsSet: new Set(),
        projectList: [],
      };
    });

    // Aggregate from Projects (Primary Metric: Judged by Project)
    if (Array.isArray(projects) && projects.length > 0) {
      projects.forEach((prj) => {
        const pId = prj.id || prj.project_code;
        if (pId) allProjectsSet.add(String(pId));

        const rawProds = Array.isArray(prj.product)
          ? prj.product
          : prj.product
            ? [prj.product]
            : [];

        const prjCode = prj.project_code || `#${prj.id}`;
        const prjClient =
          prj.customer_details?.company_name ||
          prj.customer_details?.name ||
          prj.customer ||
          "Project Client";
        const prjVal = parseFloat(prj.project_value || 0) || 0;

        rawProds.forEach((prodItem) => {
          const pName = resolveName(prodItem);
          if (!pName) return;
          const normKey = pName.toLowerCase();
          if (!productMap[normKey]) {
            productMap[normKey] = {
              id: normKey,
              name: pName,
              code: "-",
              category: "General",
              unitPrice: 0,
              status: "ACTIVE",
              projectCount: 0,
              unitsSold: 0,
              totalRevenue: 0,
              projectsSet: new Set(),
              projectList: [],
            };
          }

          if (!productMap[normKey].projectsSet.has(String(pId))) {
            productMap[normKey].projectsSet.add(String(pId));
            productMap[normKey].projectCount += 1;
            productMap[normKey].unitsSold += 1; // 1 sale per project
            productMap[normKey].totalRevenue += prjVal;
            productMap[normKey].projectList.push({
              id: prj.id,
              code: prjCode,
              customer: prjClient,
              stage: prj.project_stage_display || prj.project_stage || "Active",
              value: prjVal,
            });
          }
        });
      });
    }

    // Supplementary / fallback aggregation from Quotations if projects has 0 sales
    const hasAnyProjectSales = Object.values(productMap).some((p) => p.projectCount > 0);
    if (!hasAnyProjectSales && quotations.length > 0) {
      quotations.forEach((q) => {
        const clientName =
          q.company_name || q.contact_person || q.lead_name || "Client";
        const versions = q.versions || [];
        const targetVersions =
          versions.filter((v) => v.is_active).length > 0
            ? versions.filter((v) => v.is_active)
            : versions.length > 0
              ? [versions[0]]
              : [];

        const quoteKey = q.quotation_no || `Q-${q.id}`;
        allProjectsSet.add(quoteKey);

        targetVersions.forEach((v) => {
          (v.items || []).forEach((item) => {
            const rawName = (item.product_name || "").trim();
            if (!rawName) return;
            const normKey = rawName.toLowerCase();
            const qty = parseFloat(item.quantity || 1) || 1;
            const price = parseFloat(item.unit_price || 0) || 0;
            const total =
              parseFloat(item.total_with_gst || item.base_amount || qty * price) || 0;

            if (!productMap[normKey]) {
              productMap[normKey] = {
                id: item.product_id || normKey,
                name: rawName,
                code: item.product_code || "-",
                category: item.category || "General",
                unitPrice: price,
                status: "ACTIVE",
                projectCount: 0,
                unitsSold: 0,
                totalRevenue: 0,
                projectsSet: new Set(),
                projectList: [],
              };
            }

            if (!productMap[normKey].projectsSet.has(quoteKey)) {
              productMap[normKey].projectsSet.add(quoteKey);
              productMap[normKey].projectCount += 1;
              productMap[normKey].unitsSold += qty;
              productMap[normKey].totalRevenue += total;
              productMap[normKey].projectList.push({
                id: q.id,
                code: quoteKey,
                customer: clientName,
                stage: "Quotation Deal",
                value: total,
              });
            }
          });
        });
      });
    }

    const list = Object.values(productMap).map((item) => ({
      ...item,
      percentage: allProjectsSet.size > 0
        ? ((item.projectCount / allProjectsSet.size) * 100).toFixed(1)
        : "0.0",
    }));

    let totalUnits = 0;
    let totalRev = 0;
    list.forEach((item) => {
      totalUnits += item.unitsSold;
      totalRev += item.totalRevenue;
    });

    const topProduct =
      [...list].sort((a, b) => b.projectCount - a.projectCount || b.unitsSold - a.unitsSold)[0] || null;

    const soldNames = new Set(
      list
        .filter((p) => p.projectCount > 0 || p.unitsSold > 0)
        .map((p) => (p.name || "").toLowerCase())
    );
    const unsoldProductsCount = products.filter(
      (p) => !soldNames.has((p.name || "").toLowerCase())
    ).length;
    const totalProdCount = products.length || list.length || 0;
    const unsoldRate = totalProdCount > 0 ? ((unsoldProductsCount / totalProdCount) * 100).toFixed(1) : "0.0";

    return {
      productSalesList: list,
      totalProjectUnits: totalUnits,
      totalProjectRevenue: totalRev,
      totalProjectsCount: allProjectsSet.size,
      topProjectProduct: topProduct,
      unsoldProductsCount,
      unsoldRate,
    };
  }, [products, projects, quotations]);

  // 2. TOP 3 PRODUCTS BY PROJECT SALES (VOLUME SHARE PIE CHART)
  const sortedByProjectSales = useMemo(() => {
    return [...productSalesList]
      .filter((p) => p.projectCount > 0 || p.unitsSold > 0)
      .sort((a, b) => b.projectCount - a.projectCount || b.unitsSold - a.unitsSold);
  }, [productSalesList]);

  const top3SoldProducts = useMemo(() => {
    return sortedByProjectSales.slice(0, 3);
  }, [sortedByProjectSales]);

  const top3TotalUnits = useMemo(() => {
    return top3SoldProducts.reduce((acc, p) => acc + (p.projectCount || p.unitsSold || 0), 0);
  }, [top3SoldProducts]);

  const top3DonutSegments = useMemo(() => {
    if (top3TotalUnits === 0) return [];

    let cumulative = 0;
    return top3SoldProducts.map((item, idx) => {
      const val = item.projectCount || item.unitsSold || 0;
      const percentage = Number(((val / top3TotalUnits) * 100).toFixed(1));
      const startAngle = cumulative * 3.6 - 90;
      cumulative += percentage;
      const palette = PASTEL_PALETTE[idx % PASTEL_PALETTE.length];

      return {
        ...item,
        value: val,
        percentage,
        strokeDasharray: `${percentage} ${100 - percentage}`,
        startAngle,
        palette,
      };
    });
  }, [top3SoldProducts, top3TotalUnits]);

  // 3. ALL PRODUCTS FOR BAR GRAPH (SAME COLOR FOR ALL PRODUCTS, JUDGED BY PROJECT)
  const allProductsForBar = useMemo(() => {
    return [...productSalesList].sort((a, b) => {
      if (b.projectCount !== a.projectCount) return b.projectCount - a.projectCount;
      if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold;
      return a.name.localeCompare(b.name);
    });
  }, [productSalesList]);

  const activeProductIndex = hoveredProductIndex !== null ? hoveredProductIndex : selectedProductIndex;
  const activeProduct = allProductsForBar[activeProductIndex] || topProjectProduct || null;
  const activeProductRank = activeProductIndex !== null && activeProductIndex >= 0 ? activeProductIndex + 1 : 1;

  const maxProjects = useMemo(() => {
    return Math.max(...allProductsForBar.map((p) => p.projectCount || p.unitsSold), 1);
  }, [allProductsForBar]);

  // Dynamic Y-axis ticks for the vertical bar chart
  const yTicks = useMemo(() => {
    const max = maxProjects > 0 ? maxProjects : 10;
    let ceil = max;
    if (ceil <= 5) ceil = 5;
    else if (ceil <= 10) ceil = 10;
    else if (ceil <= 20) ceil = 20;
    else if (ceil <= 50) ceil = 50;
    else ceil = Math.ceil(max / 10) * 10;

    return [
      ceil,
      Math.round(ceil * 0.75),
      Math.round(ceil * 0.5),
      Math.round(ceil * 0.25),
      0,
    ];
  }, [maxProjects]);

  return (
    <div className="w-full space-y-5 font-sans antialiased text-slate-800">
      {/* 1. SALES PERFORMANCE KPI ROW (MATCHING QUOTATION DASHBOARD TYPE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Units Sold
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="text-base font-medium text-slate-400 animate-pulse">
                  Loading...
                </span>
              ) : (
                totalProjectUnits.toLocaleString()
              )}
            </h3>
            <p className="text-[11px] font-medium text-blue-600 flex items-center gap-1">
              <span>Across all project deals</span>
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Projects Active
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="text-base font-medium text-slate-400 animate-pulse">
                  Loading...
                </span>
              ) : (
                totalProjectsCount.toLocaleString()
              )}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <span>Active project deployments</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Unsold Products
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="text-base font-medium text-slate-400 animate-pulse">
                  Loading...
                </span>
              ) : (
                unsoldProductsCount.toLocaleString()
              )}
            </h3>
            <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1">
              <span>{unsoldRate}% unsold rate</span>
            </p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Product Value
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="text-base font-medium text-slate-400 animate-pulse">
                  Loading...
                </span>
              ) : (
                formatCurrency(totalProjectRevenue)
              )}
            </h3>
            <p className="text-[11px] font-medium text-indigo-600 flex items-center gap-1">
              <span>Project pipeline value</span>
            </p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. SALES VOLUME & PROJECT ANALYTICS */}
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* PIE CHART 1: TOP 3 PRODUCTS SOLD (BY PROJECT) */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <PieIcon className="w-4 h-4 text-blue-500" />
                    Top 3 Products Sold (by Project)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Distribution of project sales across top 3 best-selling products
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E40AF] text-[10px] font-bold border border-[#BFDBFE]">
                  Top 3 Pie Chart
                </span>
              </div>

              {/* Donut / Pie SVG - viewBox 0 0 46 46 prevents any edge clipping */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
                <div className="relative w-44 h-44 flex-shrink-0">
                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 46 46"
                  >
                    {/* Background base track */}
                    <circle
                      cx="23"
                      cy="23"
                      r="15.9155"
                      fill="none"
                      stroke="#F1F5F9"
                      strokeWidth="5"
                    />
                    {/* Donut Pastel Segments */}
                    {top3DonutSegments.map((seg, idx) => (
                      <circle
                        key={idx}
                        cx="23"
                        cy="23"
                        r="15.9155"
                        fill="none"
                        stroke={seg.palette.hex}
                        strokeWidth={hoveredUnitIndex === idx ? "6.8" : "5.5"}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset="0"
                        transform={`rotate(${seg.startAngle} 23 23)`}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredUnitIndex(idx)}
                        onMouseLeave={() => setHoveredUnitIndex(null)}
                      />
                    ))}
                  </svg>

                  {/* Donut Center Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Top 3 Projects
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      {top3TotalUnits}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Project Sales
                    </span>
                  </div>
                </div>

                {/* Pastel Legend List for Top 3 */}
                <div className="flex-1 w-full space-y-2">
                  {top3DonutSegments.map((item, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredUnitIndex(idx)}
                      onMouseLeave={() => setHoveredUnitIndex(null)}
                      className={`p-2.5 rounded-xl transition-colors flex items-center justify-between text-xs cursor-pointer border ${hoveredUnitIndex === idx
                          ? "bg-slate-100/90 border-slate-200 shadow-xs"
                          : "bg-slate-50/50 border-slate-100 hover:bg-slate-50"
                        }`}
                    >
                      <div className="flex items-center gap-2 truncate max-w-[170px]">
                        <span className="text-[11px] font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0 shadow-xs border"
                          style={{
                            backgroundColor: item.palette.hex,
                            borderColor: item.palette.border,
                          }}
                        ></span>
                        <span className="font-semibold text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-slate-900">
                          {item.projectCount || item.unitsSold} sales
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: item.palette.lightBg,
                            color: item.palette.text,
                          }}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}

                  {top3DonutSegments.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">
                      No product sales recorded yet
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>
                #1 in Projects: <strong>{topProjectProduct?.name || "-"}</strong>
              </span>
              <span>
                Top 3 Share: <strong>{top3TotalUnits} of {totalProjectUnits} sales ({totalProjectUnits > 0 ? ((top3TotalUnits / totalProjectUnits) * 100).toFixed(0) : 0}%)</strong>
              </span>
            </div>
          </div>

          {/* CHART 2: VERTICAL BAR GRAPH (ALL PRODUCTS - SAME COLOR FOR ALL PRODUCTS, JUDGED BY PROJECT) */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
            <div>
              {/* Header & #1 Top Stat Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    Product-wise Sales by Project
                  </h3>
                  <p className="text-xs text-slate-400">
                    Total project installations and sales volume per product
                  </p>
                </div>

                {activeProduct && (
                  <div className="flex items-center gap-2.5 bg-white border border-slate-200/90 shadow-2xs rounded-xl px-3.5 py-1.5 flex-shrink-0 transition-all duration-150">
                    <span className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0"></span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[120px]" title={activeProduct.name}>
                          {activeProduct.name}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${activeProductRank === 1 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"
                          }`}>
                          #{activeProductRank}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        <strong className="text-slate-800">{activeProduct.projectCount} {activeProduct.projectCount === 1 ? "project" : "projects"}</strong> · {activeProduct.unitsSold} sales ({activeProduct.percentage}%)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SVG Vertical Bar Chart (Clean corporate styling with rotated labels below baseline) */}
              {(() => {
                const marginLeft = 40;
                const marginRight = 20;
                const marginTop = 26;
                const chartHeight = 150;
                const baseline = marginTop + chartHeight;
                const labelHeight = 85;
                const svgHeight = baseline + labelHeight;
                const count = allProductsForBar.length;
                const slotWidth = Math.max(54, Math.floor((500 - marginLeft - marginRight) / Math.max(count, 1)));
                const chartWidth = Math.max(500, marginLeft + marginRight + count * slotWidth);
                const yMax = yTicks[0] || 10;
                const barWidth = Math.min(36, Math.max(22, slotWidth - 16));

                return (
                  <div className="w-full overflow-x-auto overflow-y-hidden pb-1">
                    <svg
                      width={chartWidth}
                      height={svgHeight}
                      viewBox={`0 0 ${chartWidth} ${svgHeight}`}
                      className="min-w-full"
                    >
                      {/* Rotated Y-Axis Label */}
                      <text
                        x={-(marginTop + chartHeight / 2)}
                        y="12"
                        transform="rotate(-90)"
                        textAnchor="middle"
                        className="text-[9px] font-bold fill-slate-400 tracking-wider uppercase"
                      >
                        Project Sales
                      </text>

                      {/* Horizontal Gridlines & Y-Axis Ticks */}
                      {yTicks.map((tickVal, tIdx) => {
                        const y = baseline - (tickVal / yMax) * chartHeight;
                        const isBaseline = tickVal === 0;

                        return (
                          <g key={tIdx}>
                            <line
                              x1={marginLeft}
                              y1={y}
                              x2={chartWidth - marginRight}
                              y2={y}
                              stroke={isBaseline ? "#94A3B8" : "#E2E8F0"}
                              strokeWidth={isBaseline ? "1.5" : "1"}
                              strokeDasharray={isBaseline ? "none" : "3 3"}
                            />
                            <text
                              x={marginLeft - 6}
                              y={y + 3.5}
                              textAnchor="end"
                              className="text-[10px] font-semibold fill-slate-400"
                            >
                              {tickVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* Product Columns & Rotated Labels */}
                      {allProductsForBar.map((item, idx) => {
                        const val = item.projectCount || item.unitsSold || 0;
                        const barH = yMax > 0 ? (val / yMax) * chartHeight : 0;
                        const x = marginLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
                        const y = baseline - barH;
                        const centerX = x + barWidth / 2;
                        const isSelected = activeProductIndex === idx;

                        return (
                          <g
                            key={item.id || idx}
                            className="group cursor-pointer"
                            onClick={() => setSelectedProductIndex(idx)}
                            onMouseEnter={() => setHoveredProductIndex(idx)}
                            onMouseLeave={() => setHoveredProductIndex(null)}
                          >
                            {/* Hover Glow / Background Highlight */}
                            <rect
                              x={x - 4}
                              y={marginTop}
                              width={barWidth + 8}
                              height={chartHeight + 4}
                              fill={isSelected ? "rgba(239, 246, 255, 0.75)" : "transparent"}
                              rx="4"
                              className="transition-colors group-hover:fill-blue-50/60"
                            />

                            {/* Value Label above Bar */}
                            {val > 0 && (
                              <text
                                x={centerX}
                                y={y - 5}
                                textAnchor="middle"
                                className={`text-[10px] transition-colors ${isSelected ? "font-extrabold fill-blue-700" : "font-bold fill-slate-700"
                                  }`}
                              >
                                {val}
                              </text>
                            )}

                            {/* Vertical Bar (SAME COLOR FOR ALL PRODUCTS: #2563EB, active #1D4ED8) */}
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={Math.max(barH, val > 0 ? 4 : 0)}
                              rx="3"
                              fill={isSelected ? "#1D4ED8" : "#2563EB"}
                              className="transition-all duration-200 group-hover:fill-[#1D4ED8]"
                            >
                              <title>{`#${idx + 1} ${item.name}: ${item.projectCount} projects, ${item.unitsSold} sales`}</title>
                            </rect>

                            {/* Rotated X-Axis Label (-90deg reading bottom-to-top towards baseline) */}
                            <text
                              x={centerX}
                              y={baseline + 12}
                              textAnchor="end"
                              transform={`rotate(-90 ${centerX} ${baseline + 12})`}
                              className={`text-[11px] select-none transition-colors ${isSelected
                                  ? "font-bold fill-blue-600 group-hover:fill-blue-800"
                                  : "font-semibold fill-slate-700 group-hover:fill-slate-900"
                                }`}
                            >
                              {item.name.length > 15 ? item.name.slice(0, 14) + "…" : item.name}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>

            {/* Chart Footer Info */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>
                Top Product: <strong>{topProjectProduct?.name || "-"}</strong> ({topProjectProduct?.projectCount || 0} projects)
              </span>
              <span>
                Total Projects: <strong>{totalProjectsCount}</strong> · Total Sales: <strong>{totalProjectUnits} units</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 3. PRODUCT MASTER CATALOG HIGHLIGHTS */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                Product Master Catalog Highlights
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Key products and system SKUs configured in database
              </p>
            </div>
            <Link
              to="/products"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All Products ({totalProducts}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="pb-2.5 pl-1">Product Name</th>
                  <th className="pb-2.5">Code</th>
                  <th className="pb-2.5">Category</th>
                  <th className="pb-2.5">HSN/SAC</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right pr-1">Unit Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                {products.slice(0, 5).map((row, idx) => {
                  const catName =
                    row.category?.name ||
                    row.category_name ||
                    (typeof row.category === "string" ? row.category : "General");
                  const st = (row.status || "ACTIVE").toUpperCase();

                  return (
                    <tr key={row.id || idx} className="hover:bg-slate-50/40 transition">
                      <td className="py-2.5 pl-1 text-slate-900 font-bold">
                        {row.name}
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                        {row.product_code || "-"}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                          {catName}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 text-[11px]">
                        {row.hsn_sac_code || "-"}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${st === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : st === "INACTIVE"
                                ? "bg-slate-100 text-slate-600"
                                : st === "DISCONTINUED"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                        >
                          {st}
                        </span>
                      </td>
                      <td className="py-2.5 text-right pr-1 font-bold text-slate-900">
                        {formatCurrency(row.unit_price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
