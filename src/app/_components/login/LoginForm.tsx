"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "~/app/_components/ui/Input";
import { AuthButton } from "~/app/_components/ui/AuthButton";

export function LoginForm() {
  const [email, setEmail] = useState("");

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email submitted:", email);
  };

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/signin/google";
  };

  const handleAppleSignIn = () => {
    console.log("Apple sign in clicked");
  };

  const handleSSOSignIn = () => {
    console.log("SSO sign in clicked");
  };

  return (
    <div className="w-full max-w-115">
      {/* Logo */}
      <div className="mb-10">
        <Image
          src="/images/airtable_logo.webp"
          alt="Airtable"
          width={40}
          height={34}
        />
      </div>

      {/* Heading */}
      <h1 className="mb-12 font-semibold text-gray-900 sm:text-[32px] md:text-3xl">
        Sign in to Airtable
      </h1>

      {/* Email Form */}
      <form onSubmit={handleEmailSubmit}>
        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
        />
        <AuthButton
          type="submit"
          variant="primary"
          disabled={!email.trim()}
          className="mt-6"
        >
          Continue
        </AuthButton>
      </form>

      <p className="text-md my-6 text-center font-semibold text-gray-500">or</p>

      {/* OAuth Buttons */}
      <div className="space-y-4">
        <AuthButton onClick={handleSSOSignIn}>
          Sign in with<span className="font-bold">Single Sign On</span>
        </AuthButton>

        <AuthButton
          onClick={handleGoogleSignIn}
          icon={
            <Image
              src="/images/google_logo.png"
              alt="Google"
              width={18}
              height={18}
            />
          }
        >
          Continue with <span className="font-bold">Google</span>
        </AuthButton>

        <AuthButton
          onClick={handleAppleSignIn}
          icon={
            <Image
              src="/images/apple_logo.png"
              alt="Apple"
              width={16}
              height={20}
            />
          }
        >
          Continue with <span className="font-bold">Apple ID</span>
        </AuthButton>
      </div>

      {/* Sign Up Link */}
      <p className="mt-20 text-xs text-gray-600">
        New to Airtable?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[#1171f0] underline hover:underline"
        >
          Create an account
        </Link>{" "}
        instead
      </p>
    </div>
  );
}
