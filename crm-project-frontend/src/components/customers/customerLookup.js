// customerLookup.js

export async function fetchCustomerByQuery(baseApi, token, query, options = {}) {
  if (!query || query.trim() === "") return null;

  const url = `${baseApi.replace(/\/$/, "")}/lead/customer/?search=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: options.signal,   // supports abort
    });

    if (!res.ok) return null;

    const json = await res.json();
    const results = json.results ?? json;

    if (Array.isArray(results) && results.length > 0) {
      return results[0];
    }

    return null;
  } catch (err) {
    if (err?.name !== "AbortError") {
      console.error("Customer lookup error:", err);
    }
    return null;
  }
}

