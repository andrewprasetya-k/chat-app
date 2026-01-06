import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable cookies
});

api.interceptors.request.use(
  (config) => {
    // No need to inject Authorization header manually
    // Cookies are sent automatically via withCredentials: true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jika 401 dan belum pernah dicoba retry
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Coba refresh token (backend update cookie access_token)
        await api.post("/auth/refresh");

        // Retry request asli (browser akan otomatis kirim cookie baru)
        return api(originalRequest);
      } catch (refreshError) {
        // Jika refresh gagal, redirect ke login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
