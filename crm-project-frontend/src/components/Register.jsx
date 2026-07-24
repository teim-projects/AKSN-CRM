import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import GoogleAuthButton from "./GoogleAuthButton";

const Register = () => {
  const navigate = useNavigate();
  const REGISTER_URL = `${import.meta.env.VITE_BASE_API_URL}/auth/dj-rest-auth/registration/`;

  const [form, setForm] = useState({
    email: "",
    mobile_no: "",
    password1: "",
    password2: "",
  });

  const [message, setMessage] = useState("");

  // handle input change
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Registering...");

    try {
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage("❌ Registration failed: " + JSON.stringify(data));
        return;
      }

      setMessage("✅ Registration successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("⚠️ Error connecting to the server.");
    }
  };

  return (
    <div style={styles.container}>
      <h1>Register</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          style={styles.input}
        />

        <input
          type="text"
          name="mobile_no"
          placeholder="Mobile Number"
          value={form.mobile_no}
          onChange={handleChange}
          required
          style={styles.input}
        />

        <input
          type="password"
          name="password1"
          placeholder="Password"
          value={form.password1}
          onChange={handleChange}
          required
          style={styles.input}
        />

        <input
          type="password"
          name="password2"
          placeholder="Confirm Password"
          value={form.password2}
          onChange={handleChange}
          required
          style={styles.input}
        />

        <button type="submit" style={styles.button}>
          Register
        </button>
      </form>
      <h3>Already have an account? <a href="/login">Login</a></h3>

      <hr style={{ margin: "20px 0" }} />

      {/* ✅ Reusable GoogleAuthButton */}
      <GoogleAuthButton
        endpoint="/auth/auth/google/"
        onSuccessNavigate="/dashboard"
      />
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
};

// Simple styling
const styles = {
  container: {
    maxWidth: "400px",
    margin: "50px auto",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
  },
  form: { display: "flex", flexDirection: "column", gap: "10px" },
  input: { padding: "10px", borderRadius: "5px", border: "1px solid #ccc" },
  button: {
    padding: "10px",
    border: "none",
    borderRadius: "5px",
    background: "#4CAF50",
    color: "white",
    cursor: "pointer",
  },
  message: { marginTop: "10px" },
};

export default Register;
