"use client";
import SignupForm from "@/components/SignupForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import Image from "next/image";
import React, { useRef, useState } from "react";

const SignUpPage = () => {
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="flex flex-col min-h-screen w-full bg-[url('/back.png')] bg-[#e7e8f1]/80 bg-center bg-cover bg-blend-soft-light">
        <div className="flex flex-row items-center px-4 sm:px-6 py-3 sm:py-4 gap-2 sm:gap-3">
          <Image
            src="/daystar_logo.png"
            alt="daystar-logo"
            width={40}
            height={30}
            className="object-contain w-8 h-6 sm:w-10 sm:h-8"
          />
          <p className="text-xl sm:text-2xl lg:text-3xl text-[#0F1E7A] font-bold">requisite</p>
        </div>

        <div className="flex-1 w-full flex justify-center items-center p-4 sm:p-6">
          <SignupForm />
        </div>
      </div>
    </>
  );
};

export default SignUpPage;
