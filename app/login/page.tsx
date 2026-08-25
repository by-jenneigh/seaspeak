import { Anchor, Eye, EyeOff, LockKeyhole, Mail, Waves } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
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
        <section className="flex flex-1 items-center justify-center px-7 py-12 sm:px-12">
          <div className="w-full max-w-md">
            <div className="mb-9">
              <h2 className="text-3xl font-bold text-[#062b4f]">
                Welcome Back
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Login to continue your learning journey.
              </p>
            </div>

            <form className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#062b4f]">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#062b4f]">
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/10"
                  />

                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-500">
                  <input type="checkbox" />
                  Remember me
                </label>

                <button
                  type="button"
                  className="font-semibold text-[#1478bd] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <Link
                href="/"
                className="flex h-12 w-full items-center justify-center rounded-lg bg-[#0b4778] text-sm font-semibold text-white shadow-md transition hover:bg-[#062b4f]"
              >
                Login
              </Link>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span className="text-base font-bold">G</span>
              Continue with Google
            </button>

            <p className="mt-8 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <span className="font-semibold text-[#1478bd]">
                Register here
              </span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
