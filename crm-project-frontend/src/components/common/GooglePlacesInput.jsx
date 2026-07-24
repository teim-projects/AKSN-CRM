import { useEffect, useRef, useState } from "react";
import { MdLocationOn, MdClose } from "react-icons/md";

/**
 * GooglePlacesInput
 * Drop-in replacement for a plain <input> for address fields.
 * Loads Google Maps JS API on first render (only once per page).
 * Falls back to plain text input if API key is not provided.
 *
 * Props:
 *   value        – current address string (controlled)
 *   onChange     – called with (newAddressString, placeObject|null)
 *   placeholder  – input placeholder
 *   className    – Tailwind classes for the <input>
 *   name         – HTML name attr
 *   apiKey       – Google Maps JS API Key (VITE_GOOGLE_MAPS_KEY)
 */
export default function GooglePlacesInput({
  value = "",
  onChange,
  placeholder = "Type to search address...",
  className = "",
  name = "address",
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || "",
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Load script once
  useEffect(() => {
    if (!apiKey) return; // graceful fallback: plain input
    if (window.google?.maps?.places) { setLoaded(true); return; }

    const scriptId = "gmap-places-script";
    if (document.getElementById(scriptId)) {
      // Script already injected, wait for it
      const poll = setInterval(() => {
        if (window.google?.maps?.places) { setLoaded(true); clearInterval(poll); }
      }, 100);
      return () => clearInterval(poll);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => setError(true);
    document.head.appendChild(script);
  }, [apiKey]);

  // Attach Autocomplete once script is loaded
  useEffect(() => {
    if (!loaded || !inputRef.current) return;
    if (autocompleteRef.current) return; // already attached

    try {
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "IN" },
        fields: ["formatted_address", "geometry", "name", "address_components"],
        types: ["geocode", "establishment"],
      });

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const address = place.formatted_address || place.name || "";
        onChange && onChange(address, place);
      });

      autocompleteRef.current = ac;
    } catch (e) {
      console.error("Google Places Autocomplete init failed:", e);
    }
  }, [loaded]);

  // Sync external value → input (user typed manually or form reset)
  // Don't override when autocomplete is choosing
  const handleManualChange = (e) => {
    onChange && onChange(e.target.value, null);
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
        <MdLocationOn size={16} />
      </div>
      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={handleManualChange}
        placeholder={placeholder}
        className={`pl-9 pr-8 ${className}`}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange && onChange("", null)}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
        >
          <MdClose size={14} />
        </button>
      )}
      {error && (
        <p className="text-xs text-amber-500 mt-0.5">
          Maps API unavailable — type address manually
        </p>
      )}
      {apiKey && !loaded && !error && (
        <p className="text-xs text-slate-400 mt-0.5 animate-pulse">
          Loading address suggestions...
        </p>
      )}
    </div>
  );
}
