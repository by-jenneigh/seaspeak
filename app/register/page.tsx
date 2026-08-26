"use client";

import { LockKeyhole, Mail, User, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { registerUser } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    // Basic validation
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await registerUser(name.trim(), email.trim(), password);

      // "/" is your dashboard
      router.push("/");
    } catch (error: any) {
      console.error(error);

      switch (error.code) {
        case "auth/email-already-in-use":
          setError("An account with this email already exists.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/weak-password":
          setError("Password is too weak. Use at least 6 characters.");
          break;

        default:
          setError("Unable to create your account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb] p-5">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] max-w-6xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Left */}
        <section className="relative hidden w-[48%] overflow-hidden bg-[#062b4f] lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b4778] via-[#0b4778] to-[#062b4f]" />

          {/* Decorative waves */}
          <div className="absolute -bottom-24 -left-24 h-80 w-[650px] rotate-[-8deg] rounded-[50%] border-[22px] border-white/10" />

          <div className="absolute -bottom-36 -left-16 h-80 w-[650px] rotate-[-8deg] rounded-[50%] border-[12px] border-white/10" />

          <div className="relative z-10 flex w-full flex-col items-center justify-center px-12 text-center text-white">
            <div className="mb-7 flex items-center justify-center">
              <Image
                src="/seaspeak-logo.png"
                alt="SEASPEAK"
                width={110}
                height={110}
                className="rounded-full object-contain"
              />
            </div>

            <h1 className="text-4xl font-bold tracking-wide">SEASPEAK</h1>

            <p className="mt-3 max-w-sm text-lg font-medium text-blue-100">
              Master Maritime Communication.
              <br />
              Sail with Confidence.
            </p>

            <div className="mt-10 flex items-center gap-2 text-sm text-blue-200">
              <Waves size={18} />
              <span>Simulation-Based Training</span>
            </div>
          </div>
        </section>

        {/* Right */}
        <section className="flex flex-1 items-center justify-center px-7 py-10 sm:px-12">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-7">
              <h2 className="text-3xl font-bold text-[#062b4f]">
                Create Account
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Create your SEASPEAK student account.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister}>
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#062b4f]">
                  Full Name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1478bd] focus:ring-2 focus:ring-[#1478bd]/20"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-[#062b4f]">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1478bd] focus:ring-2 focus:ring-[#1478bd]/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-[#062b4f]">
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1478bd] focus:ring-2 focus:ring-[#1478bd]/20"
                  />
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Password must be at least 6 characters.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-[#062b4f]">
                  Confirm Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1478bd] focus:ring-2 focus:ring-[#1478bd]/20"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-[#0b4778] text-sm font-semibold text-white shadow-md transition hover:bg-[#062b4f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            {/* Login */}
            <p className="mt-7 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#1478bd] hover:underline"
              >
                Login here
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
