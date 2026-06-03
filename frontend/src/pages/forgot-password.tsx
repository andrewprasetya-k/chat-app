import { useState } from "react";
import { authService } from "@/services/features/auth.service";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await authService.forgotPassword(email);
      setMessage(response.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-blue-50 items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-200 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h2>
        <p className="text-gray-600 mb-6">Enter your email to receive reset instructions.</p>

        {message && <p className="mb-4 text-green-600 bg-green-50 p-3 rounded">{message}</p>}
        {error && <p className="mb-4 text-red-600 bg-red-50 p-3 rounded">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full p-3 border rounded-lg"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
          </button>
        </form>

        <Link href="/login" className="flex items-center justify-center mt-6 text-gray-600 hover:text-blue-600">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
        </Link>
      </div>
    </div>
  );
}
