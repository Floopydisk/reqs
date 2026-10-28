"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { setAuthCookies } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function UserAuth() {
  const router = useRouter();
  const googlePopupRef = useRef<Window | null>(null);
  const googleCloseWatcherRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(5);
  const [showPassword, setShowPassword] = useState(false);
  const [showApprovalPending, setShowApprovalPending] = useState(false);

  const finishLogin = useCallback((token: string, user: Record<string, unknown>) => {
    localStorage.setItem("authData", JSON.stringify({ token, user }));
    setAuthCookies(
      token,
      typeof user.role === "string" ? user.role : "",
      typeof user.designation === "string" ? user.designation : "",
    );

    const role = typeof user.role === "string" ? user.role : "";
    const designation =
      typeof user.designation === "string" ? user.designation : "";
    let route = "/";
    switch (role) {
      case "staff":
        route = "/user";
        break;
      case "departmentHead":
        route =
          designation === "Head, Finance"
            ? "/hof"
            : designation === "Head, Human Resources & Admin"
              ? "/hhra"
              : "/hod";
        break;
      case "headOfFinance":
      case "financeManager":
      case "accountsApprover":
        route = "/hof";
        break;
      case "headOfHr":
      case "hrApprover":
      case "hhra":
        route = "/hhra";
        break;
      case "procurementManager":
        route = "/pm";
        break;
      case "vendor":
        route = "/vendor";
        break;
    }
    if (route === "/") {
      toast.error("Your account does not have access to a Requisite dashboard.");
      return;
    }
    router.replace(route);
  }, [router]);

  useEffect(() => {
    const handleGoogleAuthMessage = (event: MessageEvent) => {
      if (
        event.origin !== new URL(API_BASE_URL).origin ||
        event.source !== googlePopupRef.current ||
        event.data?.type !== "requisite:google-auth"
      ) {
        return;
      }

      if (googleCloseWatcherRef.current) {
        clearInterval(googleCloseWatcherRef.current);
        googleCloseWatcherRef.current = null;
      }
      googlePopupRef.current?.close();
      googlePopupRef.current = null;
      setGoogleLoading(false);

      if (!event.data.success) {
        toast.error(
          typeof event.data.detail === "string"
            ? event.data.detail
            : "Google sign-in failed.",
        );
        return;
      }

      const authData = event.data.data;
      if (
        typeof authData?.token !== "string" ||
        !authData.user ||
        typeof authData.user !== "object"
      ) {
        toast.error("Google sign-in returned an invalid response.");
        return;
      }

      toast.success("Login successful!");
      finishLogin(authData.token, authData.user as Record<string, unknown>);
    };

    window.addEventListener("message", handleGoogleAuthMessage);
    return () => {
      window.removeEventListener("message", handleGoogleAuthMessage);
      if (googleCloseWatcherRef.current) {
        clearInterval(googleCloseWatcherRef.current);
      }
    };
  }, [finishLogin]);

  const handleGoogleLogin = () => {
    const authUrl = new URL(`${API_BASE_URL}/auth/google`);
    authUrl.searchParams.set("frontendOrigin", window.location.origin);
    const popup = window.open(
      authUrl.toString(),
      "requisite-google-signin",
      "popup,width=500,height=650",
    );

    if (!popup) {
      toast.error("Allow pop-ups to sign in with Google.");
      return;
    }

    googlePopupRef.current = popup;
    setGoogleLoading(true);
    googleCloseWatcherRef.current = setInterval(() => {
      if (popup.closed) {
        if (googleCloseWatcherRef.current) {
          clearInterval(googleCloseWatcherRef.current);
          googleCloseWatcherRef.current = null;
        }
        googlePopupRef.current = null;
        setGoogleLoading(false);
      }
    }, 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/email-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data;
      const contentType = res.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const htmlText = await res.text();
        const errorMatch = htmlText.match(/Error: ([^<]+)/);
        data = { message: errorMatch ? errorMatch[1] : "An error occurred" };
      }

      if (!res.ok) {
        if (data.message && data.message.includes("pending approval")) {
          setShowApprovalPending(true);
          setTimeRemaining(5);
        } else {
          toast.error(data.message || "Login failed");
        }
        return;
      }

      toast.success("Login successful!");
      finishLogin(data.token, data.user);
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showApprovalPending) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setShowApprovalPending(false);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showApprovalPending]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[url('/back.png')] bg-[#e7e8f1]/80 bg-center bg-cover bg-blend-soft-light">
      <div className="flex flex-row items-center px-4 sm:px-6 py-3 sm:py-4 gap-2 sm:gap-3">
        <Image
          src="/daystar_logo.png"
          alt="daystar-logo"
          width={40}
          height={30}
          className="object-contain w-8 h-6 sm:w-10 sm:h-8"
        />
        <p className="text-xl sm:text-2xl lg:text-3xl text-[#0F1E7A] font-bold">
          requisite
        </p>
      </div>

      <div className="flex-1 w-full flex justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
          {showApprovalPending ? (
            <div className="approval-in-progress text-center py-8 animate-in fade-in duration-500 relative overflow-hidden">
              {/* <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
                <div
                  className="status-observer bg-orange-500 h-1 transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - timeRemaining) / 5) * 100}%` }}
                ></div>
              </div> */}
              <h2 className="text-2xl lg:text-[32px] font-semibold text-[var(--primary-color)] mb-2 mt-4">
                Approval in Progress
              </h2>
              <p className="text-base font-light text-[var(--primary-color)] mb-4">
                Final decision in progress
              </p>
              <div className="flex justify-center items-center mt-5">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F1E7A]"></div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleLogin}
              className="animate-in fade-in duration-500"
            >
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-red-500 mb-2">Login</h1>
                {/* <p className="text-gray-600">Sign in to your vendor account</p> */}
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={loading || googleLoading}
                onClick={handleGoogleLogin}
                className="mb-5 h-12 w-full border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 48 48"
                    className="mr-2 h-5 w-5"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.73 7.18l7.65 5.93c4.47-4.13 7.12-10.2 7.12-17.58Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19Z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.9-5.87l-7.65-5.93c-2.13 1.43-4.86 2.28-8.25 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
                    />
                  </svg>
                )}
                {googleLoading ? "Connecting to Google..." : "Sign in with Google"}
              </Button>

              <div className="mb-5 flex items-center gap-3 text-xs text-gray-500">
                <span className="h-px flex-1 bg-gray-200" />
                <span>OR SIGN IN WITH EMAIL</span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 border border-[#121212] rounded-lg p-3"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-2 border border-[#121212] rounded-lg p-3 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0A1A6B] text-white py-4 rounded-lg hover:bg-[#0C248A]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-[var(--primary-color)] hover:underline cursor-pointer">
                  Forgot password?
                </p>
                {/* <p className="text-sm text-gray-500">
                  New to Requisite Software?{" "}
                  <Link
                    href="/signup"
                    className="text-[#0A1A6B] hover:underline font-medium"
                  >
                    Sign up
                  </Link>
                </p> */}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
