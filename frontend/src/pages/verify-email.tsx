import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  CheckCircle,
  XCircle,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { authService } from "@/services/features/auth.service";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!router.isReady || !token) return;

    const verify = async () => {
      try {
        const response = await authService.verifyEmail(token as string);
        setStatus("success");
        setMessage(response.message);
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error.response?.data?.message || "Verification failed. Invalid or expired token."
        );
      }
    };

    verify();
  }, [router.isReady, token]);

  return (
    <div className="flex min-h-screen bg-blue-50 items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-200 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">
              Verifying your email...
            </h2>
            <p className="text-gray-600">Please wait a moment.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Verified!
              </h2>
              <p className="text-gray-600">
                {message || "Your account has been successfully verified."}
              </p>
            </div>
            <a
              href="/login"
              className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg"
            >
              Go to Login
            </a>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-600">{message}</p>
            </div>
            <a
              href="/login"
              className="inline-block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all"
            >
              Back to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
