"use client";
import Link from "next/link";
import { Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      ?.value;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Initialize tenant document
      await setDoc(doc(db, "tenants", user.uid), {
        name: `${name}'s Workspace`,
        email: email,
        plan: "starter",
        createdAt: new Date(),
      });

      const idToken = await user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ idToken }),
        headers: { "Content-Type": "application/json" },
      });

      router.refresh();
      router.refresh();
      router.refresh();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  const signUpWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      await fetch("/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ idToken }),
        headers: { "Content-Type": "application/json" },
      });

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const signUpWithGithub = async () => {
    const provider = new GithubAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      await fetch("/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ idToken }),
        headers: { "Content-Type": "application/json" },
      });

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-2">
      {/* Brand & Testimonial Section */}
      <div className="relative hidden flex-col bg-muted p-10 text-white md:flex dark:border-r">
        <div className="absolute inset-0 bg-primary" />
        <Link
          href="/"
          className="relative z-20 flex items-center gap-2 text-lg font-bold w-fit"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-foreground text-primary">
            <Bot className="h-5 w-5" />
          </div>
          AI Receptionist
        </Link>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;I was hesitant at first, but setting up the AI took
              minutes. It's like having a full-time employee who never sleeps.
              Highly recommended!&rdquo;
            </p>
            <footer className="text-sm font-medium opacity-80">
              David Chen, Elite Mechanics
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex items-center justify-center p-8">
        <div className="mx-auto flex w-full max-w-sm flex-col justify-center space-y-6">
          <div className="flex flex-col space-y-2 text-center md:text-left">
            {/* Mobile Branding */}
            <Link
              href="/"
              className="flex items-center justify-center gap-2 mb-4 font-medium md:hidden"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">AI Receptionist</span>
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your information below to get started
            </p>
          </div>

          <form onSubmit={handleSignUp}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" type="text" placeholder="John Doe" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </Button>
              {error && (
                <div className="text-red-500 text-xs mt-2">{error}</div>
              )}
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              type="button"
              className="w-full font-normal"
              onClick={signUpWithGoogle}
            >
              <svg
                role="img"
                viewBox="0 0 24 24"
                className="mr-2 h-4 w-4"
                fill="currentColor"
              >
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full font-normal"
              onClick={signUpWithGithub}
            >
              <svg
                role="img"
                viewBox="0 0 24 24"
                className="mr-2 h-4 w-4"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </Button>
          </div>

          <p className="px-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
