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
      alert("Firebase is not configured. On staging/production: set NEXT_PUBLIC_FIREBASE_* env vars in Firebase Console → App Hosting → Backend → Environment Variables (BUILD availability required).");
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
      <div className="h-10 px-4 rounded-lg bg-paper-100 dark:bg-paper-800 animate-pulse w-32"></div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm hidden lg:block">
          <span className="text-paper-500 dark:text-paper-400">Signed in as </span>
          <span className="font-medium text-paper-900 dark:text-paper-100">{user.displayName}</span>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-paper-700 dark:text-paper-200 bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 rounded-lg hover:bg-paper-50 dark:hover:bg-paper-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      aria-label="Sign in with Google"
      className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-on-accent bg-accent hover:bg-accent-hover rounded-lg transition-colors shadow-sm"
    >
      <LogIn className="w-4 h-4" />
      <span className="hidden sm:inline">Sign in with Google</span>
    </button>
  );
}
