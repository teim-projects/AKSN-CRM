import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ProfileSection = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    full_name: "",
    email: "",
    mobile_no: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchUserData = async () => {
    const token = localStorage.getItem("access");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BASE_API_URL}/auth/dj-rest-auth/user/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setUser({
          full_name: data.full_name || "",
          email: data.email || "",
          mobile_no: data.mobile_no || "",
        });
        setLoading(false);
      } else {
        console.warn("❌ Token invalid or expired.");
        navigate("/login", { replace: true });
      }
    } catch (error) {
      console.error("⚠️ Error fetching user:", error);
      navigate("/login", { replace: true });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const token = localStorage.getItem("access");
    if (!token) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BASE_API_URL}/auth/dj-rest-auth/user/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: user.full_name,
            mobile_no: user.mobile_no,
          }),
        }
      );

      if (res.ok) {
        const updatedData = await res.json();
        setUser({
          ...user,
          full_name: updatedData.full_name || user.full_name,
          mobile_no: updatedData.mobile_no || user.mobile_no,
        });
        setMessage("✅ Profile updated successfully!");
      } else {
        setMessage("❌ Failed to update profile.");
      }
    } catch (error) {
      console.error("⚠️ Error updating user:", error);
      setMessage("❌ Something went wrong while saving changes.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  if (loading) return <p style={{ textAlign: "center", padding: "50px" }}>Loading profile...</p>;

  return (
    <div className="max-w-lg mx-auto mt-10 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
        👤 User Profile
      </h2>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={user.full_name}
            onChange={(e) => setUser({ ...user, full_name: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              border-gray-300 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={user.email}
            readOnly
            className="w-full px-4 py-2 border rounded-lg 
              bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400
              border-gray-300 dark:border-gray-600 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mobile Number
          </label>
          <input
            type="text"
            value={user.mobile_no}
            onChange={(e) => setUser({ ...user, mobile_no: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              border-gray-300 dark:border-gray-600"
          />
        </div>

        {message && (
          <p className={`text-sm font-medium ${message.startsWith("✅") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 font-medium"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

export default ProfileSection;