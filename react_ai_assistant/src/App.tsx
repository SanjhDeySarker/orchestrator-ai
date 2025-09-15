import { AuthenticatedApp } from "@/components/authenticated-app";
import { Login } from "@/components/login";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/providers/theme-provider";
import { useState } from "react";
import { User } from "stream-chat";
import { Routes, Route, Navigate } from "react-router-dom";
import { SignIn } from "@/components/auth/SignIn";
import { SignUp } from "@/components/auth/SignUp";
import { ChatInterface } from "@/components/chat-interface";
import { v4 as uuidv4 } from "uuid";
import { useChatContext } from "stream-chat-react";
import { useNavigate } from "react-router-dom";

const USER_STORAGE_KEY = "chat-ai-app-user";


function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
const [sidebarOpen, setSidebarOpen] = useState(false);
const { client, setActiveChannel } = useChatContext();
const handleNewChatMessage = async (message: { text: string }) => {
    if (!user.id) return;

    try {
      // 1. Create a new channel with the user as the only member
      const newChannel = client.channel("messaging", uuidv4(), {
        members: [user.id],
      });
      await newChannel.watch();

      // 2. Set up event listener for when AI agent is added as member
      const memberAddedPromise = new Promise<void>((resolve) => {
        const unsubscribe = newChannel.on("member.added", (event) => {
          // Check if the added member is the AI agent (not the current user)
          if (event.member?.user?.id && event.member.user.id !== user.id) {
            unsubscribe.unsubscribe();
            resolve();
          }
        });
      });

      // 3. Connect the AI agent
      const response = await fetch(`${backendUrl}/start-ai-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: newChannel.id,
          channel_type: "messaging",
        }),
      });

      if (!response.ok) {
        throw new Error("AI agent failed to join the chat.");
      }

      // 4. Set the channel as active and navigate
      setActiveChannel(newChannel);
      navigate(`/chat/${newChannel.id}`);

      // 5. Wait for AI agent to be added as member, then send message
      await memberAddedPromise;
      await newChannel.sendMessage(message);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      console.error("Error creating new chat:", errorMessage);
    }
  };
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string;

  const handleUserLogin = (authenticatedUser: User) => {
    const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${authenticatedUser.name}`;
    const userWithImage = {
      ...authenticatedUser,
      image: avatarUrl,
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userWithImage));
    setUser(userWithImage);
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="h-screen bg-background">
        {user ? (
          <AuthenticatedApp user={user} onLogout={handleLogout} />
        ) : (
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/chat" element={<ChatInterface
                      onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                      onNewChatMessage={handleNewChatMessage}
                      backendUrl={backendUrl}
                    /> } />
            <Route path="/" element={<Navigate to="/signin" replace />} />
          </Routes>
        )}
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;