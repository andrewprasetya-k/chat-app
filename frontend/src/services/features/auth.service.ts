import api from "../api/axios.instance";
import { AuthResponse, User } from "../types/index";

export const authService = {
  //untuk login
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    if (response.data.accessToken) {
      localStorage.setItem("accessToken", response.data.accessToken);
    }
    return response.data;
  },

  //untuk register (apa perlu langsung login?)
  async register(
    fullName: string,
    email: string,
    password: string
  ): Promise<User> {
    const response = await api.post<User>("/auth/register", {
      fullName,
      email,
      password,
    });
    try {
      await this.login(email, password); // Auto-login setelah registrasi
    } catch (error) {
      console.warn("Auto-login failed after registration:", error);
      
    }
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>("/user/profile");
    return response.data;
  },

  //untuk logout
  logout() {
    localStorage.removeItem("accessToken");
    if (typeof window !== "undefined") {
      window.location.href = "/login"; // Redirect to login page
    }
  },
};
