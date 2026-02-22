"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("🟢 LoginPage mounted - React is working");
    
    const form = document.querySelector('form');
    console.log("🟢 Form element found:", !!form);
    
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    console.log("🟢 Email input found:", !!emailInput);
    console.log("🟢 Password input found:", !!passwordInput);
    console.log("🟢 Submit button found:", !!submitButton);
    
    if (emailInput) {
      emailInput.addEventListener('input', (e) => {
        console.log("🔵 Native input event fired on email:", (e.target as HTMLInputElement).value);
      });
    }
    
    if (submitButton) {
      submitButton.addEventListener('click', (e) => {
        console.log("🔵 Native button click event fired");
      });
    }
    
    if (form) {
      form.addEventListener('submit', (e) => {
        console.log("🔵 Native form submit event fired");
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

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("🔵 Button onClick handler called");
    console.log("🔵 Current email state:", email);
    console.log("🔵 Current password state:", password ? "***" : "empty");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🔵 Form onSubmit handler called");
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
      console.log("🔵 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING");
      console.log("🔵 Supabase Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING");
      
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
        console.log("🟢 Redirecting to dashboard...");
        window.location.href = "/dashboard";
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              onClick={handleButtonClick}
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
