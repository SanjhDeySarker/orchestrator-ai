// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Chat, useChatContext } from 'stream-chat-react';
import { v4 as uuidv4 } from 'uuid';
import { StreamChat } from 'stream-chat';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { SignIn } from '@/components/auth/SignIn';
import { SignUp } from '@/components/auth/SignUp';
import { ChatInterface } from '@/components/chat-interface';
import { AuthenticatedApp } from '@/components/authenticated-app';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/providers/theme-provider';
import 'stream-chat-react/dist/css/v2/index.css';

const API_KEY = import.meta.env.VITE_STREAM_API_KEY as string;
const chatClient = StreamChat.getInstance(API_KEY);

function ChatWrapper({ backendUrl }: { backendUrl: string }) {
  const { user } = useAuth();
  const { client, setActiveChannel } = useChatContext();

  const handleNewChatMessage = async (message: { text: string }) => {
    if (!user?.id) return;

    try {
      const newChannel = client.channel('messaging', uuidv4(), { members: [user.id] });
      await newChannel.watch();

      const memberAddedPromise = new Promise<void>((resolve) => {
        const unsubscribe = newChannel.on('member.added', (event) => {
          if (event.member?.user?.id && event.member.user.id !== user.id) {
            unsubscribe.unsubscribe();
            resolve();
          }
        });
      });

      const response = await fetch(`${backendUrl}/start-ai-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: newChannel.id, channel_type: 'messaging' }),
      });

      if (!response.ok) throw new Error('AI agent failed to join');

      setActiveChannel(newChannel);
      await memberAddedPromise;
      await newChannel.sendMessage(message);
    } catch (err) {
      console.error(err);
    }
  };

  

  if (!user) {
    return (
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute user={user}>
              <ChatInterface onNewChatMessage={handleNewChatMessage} onToggleSidebar={() => {}} backendUrl={backendUrl} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    );
  }

 if (user) {
  return <AuthenticatedApp user={user} onLogout={() => {}} />;
}
}

export default function App() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string;

  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div className="h-screen bg-background">
          <Chat client={chatClient}>
            <ChatWrapper backendUrl={backendUrl} />
            <Toaster />
          </Chat>
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
