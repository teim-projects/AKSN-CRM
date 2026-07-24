import { useEffect, useState, useRef } from "react";
import axios from "axios";

const useTermTypes = ({ baseApi, token }) => {
  const [termTypes, setTermTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const isFetchedRef = useRef(false);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  // ----------------------------------
  // Fetch Term Types (Only Once)
  // ----------------------------------
  const fetchTermTypes = async () => {
    if (isFetchedRef.current) return;

    try {
      setLoading(true);

      const res = await axios.get(
        `${baseApi}/inventory/terms-type/`,
        { headers }
      );

      setTermTypes(res.data.results || res.data);
      isFetchedRef.current = true;
    } catch (error) {
      console.error("Failed to fetch term types:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (baseApi && token) {
      fetchTermTypes();
    }
  }, [baseApi, token]);

  // ----------------------------------
  // Get Existing ID
  // ----------------------------------
  const getTermTypeId = (name) => {
    return termTypes.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    )?.id || null;
  };

  // ----------------------------------
  // Get OR Create (Safe Version)
  // ----------------------------------
  const getOrCreateTermTypeId = async (name, display) => {

  try {

    // 🔎 First check API for existing type
    const res = await axios.get(
      `${baseApi}/inventory/terms-type/?search=${name}`,
      { headers }
    );

    const list = res.data.results || res.data;

    const existing = list.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      return existing.id;
    }

    // ➕ Create if not found
    const createRes = await axios.post(
      `${baseApi}/inventory/terms-type/`,
      {
        name,
        display_name: display
      },
      { headers }
    );

    return createRes.data.id;

  } catch (error) {
    console.error("Failed to get/create term type:", error);
    return null;
  }
};

  return {
    termTypes,
    getTermTypeId,
    getOrCreateTermTypeId,
    loading,
  };
};

export default useTermTypes;