/**
 * Login Page
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.username || !formData.password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      await login(formData.username, formData.password);
      router.push('/conversations');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setLocalError(message);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full mb-4">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Signal Clone</h1>
          <p className="text-gray-600 text-sm mt-2">
            Secure messaging for everyone
          </p>
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {displayError}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username or Phone
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username or phone number"
              className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition duration-200"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Test Credentials for Recruiter */}
        <div className="mt-8 p-5 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="text-md font-bold text-indigo-900 uppercase tracking-wider">Tester Accounts</h3>
          </div>
          <p className="text-sm text-indigo-800 mb-4">
            Click any account below to instantly auto-fill the login form:
          </p>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {[
              { label: "Evaluator", username: "teacher", password: "password123" },
              { label: "Alice Smith", username: "alice_smith", password: "password123" },
              { label: "Bob Jones", username: "bob_jones", password: "password123" },
              { label: "Carol White", username: "carol_white", password: "password123" },
              { label: "David Brown", username: "david_brown", password: "password123" },
              { label: "Emma Davis", username: "emma_davis", password: "password123" }
            ].map(user => (
              <button
                key={user.username}
                type="button"
                onClick={() => setFormData({ username: user.username, password: user.password })}
                className="w-full flex items-center justify-between p-3 bg-white border border-indigo-100 rounded-lg shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left group"
              >
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">{user.label}</div>
                  <div className="text-indigo-700 font-medium">Username: <span className="font-bold">{user.username}</span></div>
                  <div className="text-gray-600 text-sm">Password: {user.password}</div>
                </div>
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link
            href="/register"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
