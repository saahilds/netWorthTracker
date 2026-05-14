"use client";

import { signIn, signOut } from "next-auth/react";

interface SignInButtonProps {
  label?: string;
}

export function SignInButton({ label = "Sign in with OAuth" }: SignInButtonProps) {
  return (
    <button className="action-button" onClick={() => signIn()} type="button">
      {label}
    </button>
  );
}

export function SignOutButton() {
  return (
    <button className="action-button subtle-action-button" onClick={() => signOut()} type="button">
      Sign out
    </button>
  );
}
