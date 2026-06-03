import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { authService } from "@/services/features/auth.service";
import { Loader2, Lock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await authService.resetPassword(token as string, password);
      setMessage(response.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return <div className="p-10 text-center">Invalid reset link.</div>;

  return (
    <div className="flex min-h-screen bg-blue-50 items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-200 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
        <p className="text-gray-600 mb-6">Enter your new password below.</p>

        {message ? (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="mb-6 text-green-600">{message}</p>
            <Link href="/login" className="block w-full bg-blue-600 text-white py-3 rounded-lg">Go to Login</Link>
          </div>
        ) : (
          <>
            {error && <p className="mb-4 text-red-600 bg-red-50 p-3 rounded">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New Password"
                required
                className="w-full p-3 border rounded-lg"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
