import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const ResetPasswordConfirm = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const BASE_API = import.meta.env.VITE_BASE_API_URL;
  const CONFIRM_ENDPOINT = `${BASE_API}/auth/password-reset-confirm/`;

  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("Resetting password...");

    try {
      const res = await fetch(CONFIRM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uidb64: uid,
          token: token,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage("❌ " + JSON.stringify(data));
      } else {
        setMessage("✅ Password successfully reset!");
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (error) {
      console.error(error);
      setMessage("⚠️ Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Set New Password</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "400px",
    margin: "60px auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    textAlign: "center",
  },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: { padding: "10px", borderRadius: "5px", border: "1px solid #ccc" },
  button: {
    padding: "10px",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#4CAF50",
    color: "white",
    cursor: "pointer",
  },
  message: { marginTop: "15px" },
};

export default ResetPasswordConfirm;
