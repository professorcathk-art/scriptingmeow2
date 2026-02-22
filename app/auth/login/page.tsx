"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const form = document.querySelector('form') as HTMLFormElement;
    if (form) {
      console.log("Form found, attaching test listener");
      const testHandler = () => {
        console.log("NATIVE FORM SUBMIT EVENT FIRED");
      };
      form.addEventListener('submit', testHandler);
      return () => form.removeEventListener('submit', testHandler);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("REACT FORM SUBMIT HANDLER CALLED");
    console.log("Email:", email);
    console.log("Password length:", password.length);
    
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter email and password");
      setLoading(false);
      return;
    }

    try {
      console.log("Creating Supabase client...");
      const supabase = createClient();
      console.log("Supabase client created");
      console.log("Calling signInWithPassword...");
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      console.log("Auth response:", { 
        hasData: !!data, 
        hasSession: !!data?.session, 
        error: signInError?.message 
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        console.log("SUCCESS - Session created, redirecting...");
        window.location.href = "/dashboard";
      } else {
        console.error("No session in response");
        setError("Login failed - no session created");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Exception:", err);
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
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
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
