"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";

export default function AuthForm() {
  return (
    <div className="w-full max-w-md mx-auto">
      <Auth
        supabaseClient={supabase}
        providers={["google"]}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: "#3b82f6",
                brandAccent: "#2563eb",
              },
            },
          },
        }}
      />
    </div>
  );
}
