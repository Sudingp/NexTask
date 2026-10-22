import axios from "axios";

// Set REACT_APP_API_URL in Netlify (or a local .env) to point at the backend.
// Falls back to the deployed Render API.
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://nextask-iocx.onrender.com/api",
});

// Attach the login token to every request.
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// If the token is missing, expired or rejected, log out and go to the login page.
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const onLoginPage = ["/", "/register"].includes(window.location.pathname);
    if (err.response?.status === 401 && !onLoginPage) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default API;
