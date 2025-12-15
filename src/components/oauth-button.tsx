"use client";

import { useSignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface OAuthButtonProps {
  strategy: "oauth_google" | "oauth_apple";
  children?: React.ReactNode;
  className?: string;
}

export function OAuthButton({ strategy, children, className }: OAuthButtonProps) {
  const { signIn } = useSignIn();

  const handleOAuth = async () => {
    if (!signIn) return;

    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/library",
        redirectUrlComplete: "/library",
      });
    } catch (err) {
      console.error("OAuth error:", err);
    }
  };

  const getProviderIcon = () => {
    if (strategy === "oauth_google") {
      return (
        <Image
          src="/google-icon.png"
          alt="Google"
          width={18}
          height={18}
          className="mr-2"
        />
      );
    } else if (strategy === "oauth_apple") {
      return (
        <>
          <Image
            src="/apple-icon-dark.png"
            alt="Apple"
            width={18}
            height={18}
            className="mr-2 dark:hidden"
          />
          <Image
            src="/apple-icon-light.png"
            alt="Apple"
            width={18}
            height={18}
            className="mr-2 hidden dark:block"
          />
        </>
      );
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleOAuth}
      className={cn("flex items-center justify-center", className)}
    >
      {getProviderIcon()}
      {children}
    </Button>
  );
}
