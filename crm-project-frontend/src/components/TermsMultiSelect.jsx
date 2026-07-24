import { useEffect, useState } from "react";
import axios from "axios";

const TermsMultiSelect = ({
  value = [],
  onChange,
  termsType,          // required (id of terms_condition_type)
  baseApi,            // required
  disabled = false,
  token,
  label = "Terms"     // Add label prop
}) => {
  const [terms, setTerms] = useState([]);
  const [newTerm, setNewTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // -----------------------------
  // Fetch Terms
  // -----------------------------
  useEffect(() => {
    if (termsType) {
      fetchTerms();
    }
  }, [termsType]);

  const fetchTerms = async () => {
    try {
      setFetching(true);

      const res = await axios.get(
        `${baseApi}/inventory/terms/?terms_condition_type=${termsType}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      // handle paginated & non-paginated response
      const data = res.data.results ? res.data.results : res.data;

      setTerms(data);
    } catch (error) {
      console.error("Error fetching terms:", error);
    } finally {
      setFetching(false);
    }
  };

  // -----------------------------
  // Handle Checkbox Change       
  // -----------------------------
  const handleCheckboxChange = (id) => {
    if (!Array.isArray(value)) return;

    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  // -----------------------------
  // Add New Term
  // -----------------------------
  const handleAddTerm = async () => {
    if (!newTerm.trim()) return;

    try {
      setLoading(true);

      const res = await axios.post(`${baseApi}/inventory/terms/`, 
        {
          terms: newTerm,
          terms_condition_type: termsType,
        }, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

      const createdTerm = res.data;

      setTerms((prev) => [...prev, createdTerm]);

      // auto select newly created term
      onChange([...(value || []), createdTerm.id]);

      setNewTerm("");
    } catch (error) {
      console.error("Error adding term:", error);
      alert("Error adding term. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTerm();
    }
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} <span className="text-red-500">*</span>
        </label>
      )}

      {/* Scrollable Terms List - Shows exactly 5 terms */}
      <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
        {fetching ? (
          <div className="text-center py-4 text-gray-500">Loading terms...</div>
        ) : terms.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No terms available</div>
        ) : (
          <div className="max-h-[200px] overflow-y-auto pr-2">
            {terms.map((term, index) => {
              const isSelected = Array.isArray(value) && value.includes(term.id);
              return (
                <div key={term.id} className="flex items-center py-2 border-b border-gray-200 last:border-b-0">
                  <input
                    type="checkbox"
                    id={`term-${term.id}`}
                    checked={isSelected}
                    onChange={() => handleCheckboxChange(term.id)}
                    disabled={disabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3 cursor-pointer"
                  />
                  <label 
                    htmlFor={`term-${term.id}`}
                    className="text-sm text-gray-700 cursor-pointer flex-1 select-none"
                  >
                    {term.terms}
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add New Term */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Add new ${label.toLowerCase()}`}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={disabled || loading}
        />
        <button
          type="button"
          onClick={handleAddTerm}
          disabled={loading || disabled || !newTerm.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </div>

      {/* Selected Terms Count */}
      {Array.isArray(value) && value.length > 0 && (
        <div className="text-xs text-gray-500">
          {value.length} term{value.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

export default TermsMultiSelect;
