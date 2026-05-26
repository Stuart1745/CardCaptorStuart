"use client";

import React from "react";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import { LogIn, LogOut } from "lucide-react";

export function LoginButton() {
  const { user, loading } = useAuth();

  const handleSignIn = async () => {
    if (!auth) {
      alert("Firebase is not configured. Check your .env.local file.");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      alert(`Sign-in failed: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth!);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-10 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse w-32"></div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm hidden sm:block">
          <span className="text-slate-500 dark:text-slate-400">Signed in as </span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{user.displayName}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
    >
      <LogIn className="w-4 h-4" />
      Sign in with Google
    </button>
  );
}
