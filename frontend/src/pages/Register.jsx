import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { register, login } = useAuth();
  const navigate = useNavigate();

  const validatePassword = (pwd) => {
    if (pwd.length < 8)
      return "Password must be at least 8 characters.";

    if (!/[a-z]/.test(pwd))
      return "Password must contain one lowercase letter.";

    if (!/\d/.test(pwd))
      return "Password must contain one number.";

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd))
      return "Password must contain one special character.";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const pwdError = validatePassword(password);

    if (pwdError) {
      setError(pwdError);
      return;
    }

    setSubmitting(true);

    try {
      await register(fullName, email, "+" + phone, password);

      setSuccess("Account created successfully!");

      await login(email, password);

      navigate("/dashboard");
    } catch (err) {
      console.log(err);

      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          setError(err.response.data.detail[0].msg);
        } else {
          setError(err.response.data.detail);
        }
      } else {
        setError("Registration failed.");
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="card auth-card">
      <h2 className="card-title">Patient Portal</h2>

      <p className="card-subtitle">
        Create your account to continue
      </p>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {success && (
        <div
          className="form-error"
          style={{
            background: "#0f5132",
            color: "white"
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label>Full Name</label>

          <input
            className="form-control"
            type="text"
            value={fullName}
            onChange={(e)=>setFullName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>

          <input
            className="form-control"
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Phone Number</label>

          <PhoneInput
            country={"in"}
            value={phone}
            onChange={setPhone}
            enableSearch={true}
            countryCodeEditable={false}
            inputStyle={{
              width: "100%",
              height: "45px"
            }}
          />
        </div>

        <div className="form-group">
          <label>Password</label>

          <input
            className="form-control"
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />

          <small>
            Password should contain uppercase, lowercase, number and special character.
          </small>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{width:"100%"}}
          disabled={submitting}
        >
          {submitting ? "Creating..." : "Register"}
        </button>

      </form>

      <p
        style={{
          marginTop:20,
          textAlign:"center"
        }}
      >
        Already have an account?{" "}
        <Link to="/login">
          Login
        </Link>
      </p>
    </div>
  );
};

export default Register;