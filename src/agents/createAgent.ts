import { apikey, apiSecret, serverClient } from "../serverClient";
import { OpenAIAgent } from "./openai/openaiagent";
import { AgentPlatform, AIAgent } from "./types";

export const createAgent = async (
  user_id: string,
  platform: AgentPlatform,
  channel_type: string,
  channel_id: string
): Promise<AIAgent> => {
  // use serverClient directly, no connectUser needed in Node.js
  const channel = serverClient.channel(channel_type, channel_id, {
    created_by_id: user_id,
  });

  try {
    await channel.create();
  } catch (err: any) {
    if (err.code !== 40) {
      throw err;
    }
  }

  await channel.watch();

  switch (platform) {
    case AgentPlatform.WRITING_ASSISTANT:
    case AgentPlatform.OPENAI:
      return new OpenAIAgent(serverClient, channel);
    default:
      throw new Error(`Unsupported agent platform: ${platform}`);
  }
};
