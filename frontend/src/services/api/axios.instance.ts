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
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
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
        // Coba refresh token (backend akan baca cookie HttpOnly)
        const { data } = await api.post("/auth/refresh");

        if (data.access_token) {
          localStorage.setItem("accessToken", data.access_token);
          api.defaults.headers.Authorization = `Bearer ${data.access_token}`;
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest); // Ulangi request awal
        }
      } catch (refreshError) {
        // Jika refresh gagal, berarti sesi benar-benar habis
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
