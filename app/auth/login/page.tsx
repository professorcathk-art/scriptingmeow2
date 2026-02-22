"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log("🟢 LoginPage mounted - React is working");
    
    // Test if form element exists
    const form = document.querySelector('form');
    console.log("🟢 Form element found:", !!form);
    if (form) {
      console.log("🟢 Form has onSubmit:", typeof (form as any).onsubmit);
    }

    // Test if inputs exist
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    console.log("🟢 Email input found:", !!emailInput);
    console.log("🟢 Password input found:", !!passwordInput);
    
    if (emailInput) {
      emailInput.addEventListener('input', (e) => {
        console.log("🔵 Native input event fired on email:", (e.target as HTMLInputElement).value);
      });
    }
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    console.log("🔵 Email onChange handler called:", val);
    setEmail(val);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    console.log("🔵 Password onChange handler called:", val.length, "chars");
    setPassword(val);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🔵 Form submitted", { email, password: "***" });
    setError("");
    setLoading(true);

    if (!email || !password) {
      console.log("🔴 Validation failed: missing email or password");
      setError("Please enter email and password");
      setLoading(false);
      return;
    }

    try {
      console.log("🔵 Creating Supabase client...");
      const supabase = createClient();
      console.log("🔵 Supabase client created");
      
      console.log("🔵 Calling signInWithPassword with:", { email: email.trim() });
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      console.log("🔵 Auth response received:", { 
        hasData: !!data, 
        hasSession: !!data?.session,
        sessionUser: data?.session?.user?.email,
        error: signInError?.message 
      });

      if (signInError) {
        console.error("🔴 Sign in error:", signInError);
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        console.log("🟢 Login successful! Session user:", data.session.user.email);
        console.log("🟢 Session token exists:", !!data.session.access_token);
        console.log("🟢 Redirecting to dashboard in 500ms...");
        
        // Wait a bit for cookies to be set
        setTimeout(() => {
          console.log("🟢 Executing redirect now...");
          window.location.href = "/dashboard";
        }, 500);
      } else {
        console.error("🔴 No session in response");
        setError("Login failed - no session created");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("🔴 Exception:", err);
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center mb-6">ScriptingMeow</h1>
        <h2 className="text-xl font-semibold text-center mb-6">Sign In</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => console.log("🔵 Email blurred, current value:", email)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                ref={passwordRef}
                type="password"
                id="password"
                name="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => console.log("🔵 Password blurred, current length:", password.length)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                console.log("🔵 Button clicked, form will submit");
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
        
        <p className="text-center text-sm text-gray-600 mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
