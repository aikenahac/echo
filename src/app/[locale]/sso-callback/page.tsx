import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { EchoMark } from "@/components/echo/icons";

export default function SsoCallbackPage() {
  return (
    <div className="on-field grid min-h-dvh place-items-center bg-field">
      <EchoMark height={96} className="animate-pulse" />
      <div id="clerk-captcha" />
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
