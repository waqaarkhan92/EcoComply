/**
 * Slack Client
 * Wrapper around Slack Web API for sending messages and managing channels
 */

import { WebClient } from '@slack/web-api';
import { logger } from '@/lib/logger';

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_archived: boolean;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
  thread_ts?: string;
}

export class SlackClient {
  private client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(
    channel: string,
    text: string,
    blocks?: any[]
  ): Promise<{ ok: boolean; ts?: string; error?: string }> {
    try {
      const result = await this.client.chat.postMessage({
        channel,
        text,
        blocks,
      });

      return {
        ok: result.ok || false,
        ts: result.ts,
      };
    } catch (error: any) {
      logger.error({ error: error.message, channel }, 'Slack sendMessage error');
      return {
        ok: false,
        error: error.message || 'Failed to send message',
      };
    }
  }

  /**
   * Post a direct message to a user
   */
  async postToUser(
    userId: string,
    text: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Open a DM channel with the user
      const dmResult = await this.client.conversations.open({
        users: userId,
      });

      if (!dmResult.ok || !dmResult.channel?.id) {
        return {
          ok: false,
          error: 'Failed to open DM channel',
        };
      }

      // Send message to the DM channel
      const result = await this.client.chat.postMessage({
        channel: dmResult.channel.id,
        text,
      });

      return {
        ok: result.ok || false,
      };
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Slack postToUser error');
      return {
        ok: false,
        error: error.message || 'Failed to send DM',
      };
    }
  }

  /**
   * Get list of available channels
   */
  async getChannels(): Promise<SlackChannel[]> {
    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200,
      });

      if (!result.ok || !result.channels) {
        return [];
      }

      return result.channels.map((channel: any) => ({
        id: channel.id,
        name: channel.name || '',
        is_channel: channel.is_channel || false,
        is_private: channel.is_private || false,
        is_archived: channel.is_archived || false,
      }));
    } catch (error: any) {
      logger.error({ error: error.message }, 'Slack getChannels error');
      return [];
    }
  }

  /**
   * Verify that the token is valid by testing the auth
   */
  async verifyToken(): Promise<{ ok: boolean; team?: string; user?: string; error?: string }> {
    try {
      const result = await this.client.auth.test();

      if (!result.ok) {
        return {
          ok: false,
          error: 'Token verification failed',
        };
      }

      return {
        ok: true,
        team: result.team as string | undefined,
        user: result.user as string | undefined,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Slack verifyToken error');
      return {
        ok: false,
        error: error.message || 'Token verification failed',
      };
    }
  }

  /**
   * Get channel info by ID
   */
  async getChannelInfo(channelId: string): Promise<{ ok: boolean; channel?: any; error?: string }> {
    try {
      const result = await this.client.conversations.info({
        channel: channelId,
      });

      if (!result.ok) {
        return {
          ok: false,
          error: 'Failed to get channel info',
        };
      }

      return {
        ok: true,
        channel: result.channel,
      };
    } catch (error: any) {
      logger.error({ error: error.message, channelId }, 'Slack getChannelInfo error');
      return {
        ok: false,
        error: error.message || 'Failed to get channel info',
      };
    }
  }
}

/**
 * Create a Slack client instance
 */
export function createSlackClient(token: string): SlackClient {
  return new SlackClient(token);
}
