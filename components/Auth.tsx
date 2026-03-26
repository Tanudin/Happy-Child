import React, { useEffect, useState } from "react";
import { Linking } from "react-native";
import AuthForm from "../app/(auth)/login";
import NewPassword from "../app/(auth)/new-password";
import ResetPassword from "../app/(auth)/reset-password";
import WelcomeScreen from "../app/(auth)/welcome";
import { supabase } from "../lib/supabase";

interface AuthProps {
  forceShow?: boolean;
  onPasswordRecoveryComplete?: () => void;
}

export default function Auth({
  forceShow = false,
  onPasswordRecoveryComplete,
}: AuthProps) {
  const [currentView, setCurrentView] = useState<
    "welcome" | "login" | "signup" | "reset-password" | "new-password"
  >("welcome");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // If forceShow is true, we're being shown for password recovery
    if (forceShow && !isPasswordRecovery) {
      setIsPasswordRecovery(true);
      setCurrentView("new-password");
    }

    // Handle deep linking for password recovery
    const handleDeepLink = async (url: string) => {
      console.log("Deep link received:", url);

      if (
        url.includes("type=recovery") ||
        url.includes("password_recovery") ||
        url.includes("access_token")
      ) {
        // Extract tokens from hash fragment (after #)
        // URL format: doplan://auth/callback#access_token=xxx&refresh_token=yyy&type=recovery
        let accessToken = null;
        let refreshToken = null;
        let type = null;

        // Check if there's a hash fragment
        if (url.includes("#")) {
          const hashPart = url.split("#")[1];
          const hashParams = new URLSearchParams(hashPart);
          accessToken = hashParams.get("access_token");
          refreshToken = hashParams.get("refresh_token");
          type = hashParams.get("type");
        } else {
          // Fallback: try as regular URL parameters
          const urlObj = new URL(url.replace("doplan://", "http://doplan/"));
          accessToken = urlObj.searchParams.get("access_token");
          refreshToken = urlObj.searchParams.get("refresh_token");
          type = urlObj.searchParams.get("type");
        }

        console.log("Password recovery detected");
        console.log("Type:", type);
        console.log("Has access token:", !!accessToken);
        console.log("Has refresh token:", !!refreshToken);

        // If we have tokens, set the session
        if (accessToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

            if (error) {
              console.error("Error setting session from deep link:", error);
            } else {
              console.log("Session set successfully from deep link");
              console.log("Session data:", data);
            }
          } catch (err) {
            console.error("Exception setting session:", err);
          }
        } else {
          console.error("No access token found in URL");
        }

        setIsPasswordRecovery(true);
        setCurrentView("new-password");
      }
    };

    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for incoming URLs
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    // Check initial session and handle password recovery
    const checkPasswordRecovery = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        // Don't automatically set to new-password here unless we're sure it's recovery
        // Let the auth state change handle it
      } catch (error) {
        // Handle error silently
      }
    };

    // Small delay to ensure auth is initialized
    const timer = setTimeout(checkPasswordRecovery, 100);

    // Listen for auth state changes to detect password recovery
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        setCurrentView("new-password");
      } else if (event === "SIGNED_IN" && session?.user) {
        // Check if this sign in is from a recovery email
        const currentUrl = await Linking.getInitialURL();
        if (
          currentUrl &&
          (currentUrl.includes("type=recovery") ||
            currentUrl.includes("password_recovery") ||
            currentUrl.includes("access_token"))
        ) {
          setIsPasswordRecovery(true);
          setCurrentView("new-password");
        }
      }
    });

    return () => {
      clearTimeout(timer);
      subscription?.remove();
      authSubscription.unsubscribe();
    };
  }, [forceShow]);

  function handleEmailSignUp() {
    setCurrentView("signup");
  }

  function handleLogin() {
    setCurrentView("login");
  }

  function handleBack() {
    setCurrentView("welcome");
  }

  function handleForgotPassword() {
    setCurrentView("reset-password");
  }

  function handleBackToLogin() {
    setCurrentView("login");
  }

  function handlePasswordUpdateSuccess() {
    // After successful password update, clear recovery mode and go back to welcome
    setIsPasswordRecovery(false);
    setCurrentView("welcome");
    // Notify parent component that password recovery is complete
    onPasswordRecoveryComplete?.();
  }

  function handleCancelPasswordUpdate() {
    // If user cancels password update, clear recovery mode and go back to welcome
    setIsPasswordRecovery(false);
    setCurrentView("welcome");
    // Notify parent component that password recovery is complete
    onPasswordRecoveryComplete?.();
  }

  if (currentView === "welcome") {
    return (
      <WelcomeScreen onEmailSignUp={handleEmailSignUp} onLogin={handleLogin} />
    );
  }

  if (currentView === "reset-password") {
    return <ResetPassword onBack={handleBackToLogin} />;
  }

  if (currentView === "new-password") {
    return (
      <NewPassword
        onSuccess={handlePasswordUpdateSuccess}
        onBack={handleCancelPasswordUpdate}
      />
    );
  }

  return (
    <AuthForm
      initialTab={currentView === "login" ? "login" : "signup"}
      onBack={handleBack}
      onForgotPassword={handleForgotPassword}
    />
  );
}
