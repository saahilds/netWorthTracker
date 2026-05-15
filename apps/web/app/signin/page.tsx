import { redirect } from "next/navigation";
import { SignInButton } from "../../components/auth-buttons";
import { getAuthSession } from "../../lib/auth";

export default async function SignInPage() {
  const session = await getAuthSession();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="page">
      <section className="panel panel-span-wide auth-panel">
        <h1>Sign in to Net Worth Tracker</h1>
        <p className="panel-subtitle">
          Google OAuth is enabled for onboarding and Plaid account linking. In local
          development, a fallback email sign-in is available if Google credentials are not
          configured.
        </p>
        <SignInButton />
      </section>
    </main>
  );
}
