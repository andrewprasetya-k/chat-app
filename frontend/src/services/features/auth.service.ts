import api from "../api/axios.instance";
import { AuthResponse, User } from "../types/index";

export const authService = {
  //untuk login
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    // Tokens are now handled by HttpOnly cookies automatically
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
      // console.warn("Auto-login failed after registration:", error);
    }
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>("/user/profile");
    return response.data;
  },

  async updateProfile(fullName: string, email: string): Promise<void> {
    await api.patch("/user/profile", { fullName, email });
  },

  async getAllUsers(): Promise<User[]> {
    const response = await api.get<User[]>("/user/get-all");
    return response.data;
  },

  //untuk logout
  async logout() {
    try {
      await api.post("/auth/logout"); // Clear cookies on server
    } catch (error) {
      // console.error("Logout failed", error);
    } finally {
      // localStorage.removeItem("accessToken"); // Not used anymore
      if (typeof window !== "undefined") {
        window.location.href = "/login"; // Redirect to login page
      }
    }
  },
};
