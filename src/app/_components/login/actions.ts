"use server";

import { signIn } from "~/server/auth";

export async function handleGoogleSignIn() {
  await signIn("google", {
    redirectTo: "/",
    // Force Google to show account selection every time
    redirect: true,
  });
}
