import { useState } from "react";
import { MessageCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/router";
import { authService } from "@/services/features/auth.service";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log("Login attempt:", { email, password });
    authService
      .login(email, password)
      .then(() => {
        router.push("/dashboard");
      })
      .catch((err) => {
        console.log("Login failed: " + err.message);
      });
  };

  return (
    <div className="flex min-h-screen  bg-blue-50">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">ChatApp</h1>
          </div>

          <div className="space-y-6 max-w-md">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Connect, Communicate,
              <br />
              Collaborate.
            </h2>
            <p className="text-lg text-blue-100">
              Secure and modern messaging platform for teams and individuals.
            </p>
          </div>
        </div>

        <div className="relative z-10 text-blue-100 text-sm">
          <p>© 2024 ChatApp. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ChatApp</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-200">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome back
              </h2>
              <p className="text-gray-600">
                Please enter your credentials to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Remember me
                  </span>
                </label>
                <a
                  href="#"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              {loading ? (
                <button
                  type="button"
                  className="w-full bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all cursor-not-allowed"
                  disabled
                >
                  Logging you in...
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30"
                  onClick={() => {
                    setLoading(true), handleSubmit;
                  }}
                >
                  Sign In
                </button>
              )}

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    Don't have an account?
                  </span>
                </div>
              </div>

              {/* Register Link */}
              <a
                href="/register"
                className="block w-full text-center bg-transparent hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all"
              >
                Create New Account
              </a>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            By continuing, you agree to our{" "}
            <a
              href="#"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
