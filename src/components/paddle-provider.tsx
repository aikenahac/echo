"use client";

import { useEffect } from "react";
import Script from "next/script";

export function PaddleProvider() {
  useEffect(() => {
    const initPaddle = () => {
      if (typeof window !== "undefined" && (window as any).Paddle) {
        const environment =
          process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
            ? "production"
            : "sandbox";

        (window as any).Paddle.Environment.set(environment);
        (window as any).Paddle.Initialize({
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        });

        console.log(`Paddle initialized in ${environment} mode`);
      }
    };

    // Initialize when script loads
    if ((window as any).Paddle) {
      initPaddle();
    } else {
      // Wait for script to load
      const checkPaddle = setInterval(() => {
        if ((window as any).Paddle) {
          initPaddle();
          clearInterval(checkPaddle);
        }
      }, 100);

      return () => clearInterval(checkPaddle);
    }
  }, []);

  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      strategy="afterInteractive"
    />
  );
}
