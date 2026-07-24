import React, { useState } from "react";

const ForgotPassword = () => {
  const BASE_API = import.meta.env.VITE_BASE_API_URL;
  const RESET_ENDPOINT = `${BASE_API}/auth/password-reset/`;

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Sending reset email...");

    try {
      const res = await fetch(RESET_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage("❌ Error: " + JSON.stringify(data));
        return;
      }

      setMessage("✅ Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error(error);
      setMessage("⚠️ Could not connect to server.");
    }
  };

  return (
    <div style={styles.container}>
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Send Reset Link
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
    backgroundColor: "#007BFF",
    color: "white",
    cursor: "pointer",
  },
  message: { marginTop: "15px" },
};

export default ForgotPassword;
