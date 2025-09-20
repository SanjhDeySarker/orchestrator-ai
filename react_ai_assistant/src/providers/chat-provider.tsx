import { ReactNode, useCallback, useState } from "react";
import { User } from "stream-chat";
import { Chat, useCreateChatClient } from "stream-chat-react";
import { Navigate } from "react-router-dom";
import { LoadingScreen } from "../components/loading-screen";
import { useTheme } from "../hooks/use-theme";
import { useAuth } from "./AuthProvider";

interface ChatProviderProps {
  user: User;
  children: ReactNode;
}

const apiKey = import.meta.env.VITE_STREAM_API_KEY as string;
const backendUrl = import.meta.env.VITE_BACKEND_URL as string;

if (!apiKey) {
  throw new Error("Missing VITE_STREAM_API_KEY in .env file");
}

export const ChatProvider = ({ children }: Omit<ChatProviderProps, 'user'>) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  if (!user) {
    return <Navigate to="/signin" />;
  }

  if (!user.id) {
    console.error("ChatProvider: User missing required ID field", user);
    return <Navigate to="/signin" />;
  }

  /**
   * Token provider function that fetches authentication tokens from our backend.
   * This is called automatically by the Stream Chat client when:
   * - Initial connection is established
   * - Token expires and needs refresh
   * - Connection is re-established after network issues
   */
  const tokenProvider = useCallback(async () => {
    if (!user || !user.id) {
      console.error("TokenProvider: User or user.id not available", { user });
      throw new Error("User not available for token generation");
    }

    console.log("TokenProvider: Fetching token for user", user.id);

    try {
      const response = await fetch(`${backendUrl}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("TokenProvider: Backend returned error", response.status, errorText);
        throw new Error(`Failed to fetch token (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      if (!data.token) {
        console.error("TokenProvider: No token in response", data);
        throw new Error("No token received from backend");
      }

      console.log("TokenProvider: Successfully fetched token");
      return data.token;
    } catch (err) {
      console.error("TokenProvider: Error fetching token:", err);
      throw err;
    }
  }, [user, backendUrl]);

  /**
   * Create the Stream Chat client with automatic token management.
   * This handles:
   * - Initial authentication
   * - WebSocket connection management
   * - Automatic token refresh
   * - Real-time event handling
   */
  const client = useCreateChatClient({
    apiKey,
    tokenOrProvider: tokenProvider,
    userData: {
      id: user.id,
      name: user.name || user.email || `User ${user.id}`,
    },
    onError: (error) => {
      console.error("ChatProvider: Stream Chat client error:", error);
      setConnectionError(error.message);
    },
  });

  // Show error if connection failed
  if (connectionError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-destructive mb-2">Connection Error</p>
          <p className="text-sm text-muted-foreground">{connectionError}</p>
          <button 
            onClick={() => {
              setConnectionError(null);
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading screen while client is being initialized
  if (!client) {
    console.log("ChatProvider: Client not yet initialized, showing loading screen");
    return <LoadingScreen />;
  }

  console.log("ChatProvider: Client initialized successfully", {
    clientConnected: client.isOnline,
    userId: client.userID,
    userName: user.name
  });

  return (
    <Chat
      client={client}
      theme={
        theme === "dark" ? "str-chat__theme-dark" : "str-chat__theme-light"
      }
    >
      {children}
    </Chat>
  );
};