"use client";

import { toast } from "sonner";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/config";
import { setAuthCookies } from "@/lib/auth";
import UserAuth from "@/components/UserAuth";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [showUserAuth, setShowUserAuth] = useState(false);

  useEffect(() => {
    const authenticateUser = async () => {
      const userId = searchParams?.get("userId");
      const bypass = searchParams?.get("bypass");

      if (!userId || !bypass) {
        setShowUserAuth(true);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, bypass }),
        });

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            `Authentication endpoint returned a non-JSON response (${response.status}). Check that NEXT_PUBLIC_API_BASE_URL points to the backend.`
          );
        }

        const data = await response.json();

        if (data.success) {
          localStorage.setItem("authData", JSON.stringify(data.data));
          toast.success(data.message);

          const { role, designation } = data.data.user;
          setAuthCookies(data.data.token, role, designation ?? "");
          switch (role) {
            case "staff":
              router.replace("/user");
              break;
            case "departmentHead":
              if (designation === "Head, Finance") {
                router.replace("/hof");
              } else if (designation === "Head, Human Resources & Admin") {
                router.replace("/hhra");
              } else {
                router.replace("/hod");
              }
              break;
            case "procurementManager":
              router.replace("/pm");
              break;
            default:
              setShowUserAuth(true);
              setLoading(false);
          }
        } else {
          console.error("Authentication failed:", data);
          toast.error("Error authenticating");
          setShowUserAuth(true);
          setLoading(false);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        toast.error("Error authenticating");
        setShowUserAuth(true);
        setLoading(false);
      }
    };

    authenticateUser();
  }, [searchParams, router]);

  if (loading) {
    return (
      <>
        <div className="relative flex flex-col w-screen h-screen bg-[#0F1E7A] justify-center items-center gap-3">
          <div
            style={{ filter: "grayscale(1)", opacity: 0.2 }}
            className="absolute inset-0 bg-[url('/daystar_bg.png')] bg-center bg-contain bg-no-repeat bg-blend-soft-light"
          ></div>
          <Image
            width={60}
            height={40}
            alt="daystar-logo"
            src="/daystar_logo.png"
            className="object-cover relative z-10"
          />
          <p className="text-7xl text-white font-bold relative z-10">
            requisite
          </p>

          <div className="w-full container flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-white">Authenticating...</p>
          </div>
        </div>
      </>
    );
  }

  if (showUserAuth) {
    return <UserAuth />;
  }

  return null;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F1E7A]"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
