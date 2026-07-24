import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

const GoogleAuthButton = ({ endpoint, onSuccessNavigate }) => {
  const [message, setMessage] = useState("");
  const BASE_API = import.meta.env.VITE_BASE_API_URL;

  // Unified Google handler for login/register
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setMessage("🔁 Verifying Google token...");

      const res = await fetch(`${BASE_API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: credentialResponse.credential }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage("❌ Social login failed: " + JSON.stringify(data));
        return;
      }

      // Save JWT tokens
      if (data.access) localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);

      window.dispatchEvent(new Event("authChange"));
      
      setMessage("✅ Google login successful!");
      if (onSuccessNavigate) window.location.href = onSuccessNavigate;
    } catch (err) {
      console.error("Google Login Error:", err);
      setMessage("⚠️ Failed to connect to backend.");
    }
  };

  const handleGoogleError = () => {
    setMessage("❌ Google Login Failed. Please try again.");
  };

  return (
    <div style={{ textAlign: "center" }}>
      <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
      {message && <p style={{ marginTop: "10px", color: "#444" }}>{message}</p>}
    </div>
  );
};

export default GoogleAuthButton;
