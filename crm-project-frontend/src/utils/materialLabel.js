/** Same label format as AcMaterialList material dropdown */
export const formatMaterialLabel = (mat) => {
  if (!mat) return "";
  if (mat.material_display_name) return mat.material_display_name;

  let displayText = mat.material_name || mat.item_code || "";
  if (mat.size) displayText += ` - ${mat.size}${mat.size_unit || ""}`;
  if (mat.thickness) displayText += ` x ${mat.thickness}${mat.thickness_unit || ""}`;
  return displayText.trim();
};

export const materialSelectionPayload = (mat) => ({
  id: mat.material_id,
  material_name: mat.material_name,
  material_display_name: formatMaterialLabel(mat),
  brand_id: mat.brand_id,
  brand_name: mat.brand_name,
  unit: mat.unit,
  size: mat.size,
  size_unit: mat.size_unit,
  thickness: mat.thickness,
  thickness_unit: mat.thickness_unit,
});
