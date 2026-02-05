/**
 * ClawChat Bot Registry
 *
 * Discover, connect, and manage AI bots from various providers.
 * Supports official bots, third-party bots, and self-hosted private bots.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceKeys } from '../matrix/crypto';

export type BotCategory =
  | 'ai-assistant'
  | 'image-generation'
  | 'video-editing'
  | 'code-assistant'
  | 'translation'
  | 'writing'
  | 'research'
  | 'custom';

export type BotProvider =
  | 'official'      // exe AI official bots
  | 'verified'      // Third-party verified providers
  | 'community'     // Community-submitted bots
  | 'private';      // Self-hosted bots

export interface BotCapability {
  id: string;
  name: string;
  description: string;
}

export interface BotInfo {
  // Identity
  id: string;
  userId: string;           // Matrix user ID (@bot:server.com)
  name: string;
  description: string;
  avatar?: string;

  // Classification
  provider: BotProvider;
  category: BotCategory;
  capabilities: BotCapability[];
  tags: string[];

  // Technical
  homeserver: string;
  supportsE2EE: boolean;
  deviceKeys?: DeviceKeys;  // For E2EE verification

  // Metadata
  author?: string;
  website?: string;
  sourceCode?: string;      // Open source bots link to repo
  privacyPolicy?: string;
  version: string;

  // Stats (for discovery)
  userCount?: number;
  rating?: number;
  verified: boolean;
}

export interface PrivateBotConfig {
  name: string;
  userId: string;
  homeserver: string;
  accessToken: string;
  anthropicApiKey?: string;
  model?: string;
}

const STORAGE_KEY_CONNECTED_BOTS = 'clawchat_connected_bots';
const STORAGE_KEY_PRIVATE_BOTS = 'clawchat_private_bots';
const REGISTRY_URL = 'https://registry.clawchat.io/api/v1';

/**
 * Official exe AI bots
 */
export const OFFICIAL_BOTS: BotInfo[] = [
  {
    id: 'exe-claude',
    userId: '@claude:clawchat.io',
    name: 'Claude (exe AI)',
    description: 'Advanced AI assistant powered by Anthropic Claude. Capable of analysis, writing, coding, and general assistance.',
    provider: 'official',
    category: 'ai-assistant',
    capabilities: [
      { id: 'chat', name: 'Chat', description: 'Natural conversation' },
      { id: 'analysis', name: 'Analysis', description: 'Document and data analysis' },
      { id: 'coding', name: 'Coding', description: 'Code generation and review' },
      { id: 'writing', name: 'Writing', description: 'Content creation and editing' },
      { id: 'vision', name: 'Vision', description: 'Image understanding' },
    ],
    tags: ['ai', 'claude', 'anthropic', 'assistant', 'coding', 'writing'],
    homeserver: 'https://matrix.clawchat.io',
    supportsE2EE: true,
    author: 'exe AI',
    website: 'https://exe.ai',
    version: '1.0.0',
    verified: true,
  },
  {
    id: 'exe-create',
    userId: '@exe-create:clawchat.io',
    name: 'exe-create',
    description: 'AI-powered image and video editing. Transform, enhance, and generate visual content with natural language.',
    provider: 'official',
    category: 'image-generation',
    capabilities: [
      { id: 'image-edit', name: 'Image Editing', description: 'Edit images with text commands' },
      { id: 'image-gen', name: 'Image Generation', description: 'Generate images from descriptions' },
      { id: 'video-edit', name: 'Video Editing', description: 'Edit videos with AI' },
      { id: 'upscale', name: 'Upscaling', description: 'Enhance image resolution' },
      { id: 'background', name: 'Background Removal', description: 'Remove/replace backgrounds' },
    ],
    tags: ['image', 'video', 'editing', 'generation', 'creative'],
    homeserver: 'https://matrix.clawchat.io',
    supportsE2EE: true,
    author: 'exe AI',
    website: 'https://exe.ai/create',
    version: '1.0.0',
    verified: true,
  },
];

/**
 * Bot Registry Manager
 */
class BotRegistry {
  private connectedBots: Set<string> = new Set();
  private privateBots: Map<string, BotInfo> = new Map();
  private cachedDirectory: BotInfo[] = [];
  private lastFetch: number = 0;
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async initialize(): Promise<void> {
    // Load connected bots
    const connected = await AsyncStorage.getItem(STORAGE_KEY_CONNECTED_BOTS);
    if (connected) {
      this.connectedBots = new Set(JSON.parse(connected));
    }

    // Load private bots
    const privateBotsData = await AsyncStorage.getItem(STORAGE_KEY_PRIVATE_BOTS);
    if (privateBotsData) {
      const bots = JSON.parse(privateBotsData) as BotInfo[];
      bots.forEach(bot => this.privateBots.set(bot.id, bot));
    }
  }

  /**
   * Get all available bots (official + directory + private)
   */
  async getAllBots(): Promise<BotInfo[]> {
    const directoryBots = await this.fetchDirectory();
    const privateBots = Array.from(this.privateBots.values());

    return [
      ...OFFICIAL_BOTS,
      ...directoryBots,
      ...privateBots,
    ];
  }

  /**
   * Fetch bot directory from registry
   */
  async fetchDirectory(forceRefresh = false): Promise<BotInfo[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedDirectory.length > 0 && now - this.lastFetch < this.CACHE_TTL) {
      return this.cachedDirectory;
    }

    try {
      const response = await fetch(`${REGISTRY_URL}/bots`);
      if (!response.ok) {
        throw new Error('Failed to fetch directory');
      }

      this.cachedDirectory = await response.json();
      this.lastFetch = now;
      return this.cachedDirectory;
    } catch (error) {
      console.error('Failed to fetch bot directory:', error);
      return this.cachedDirectory; // Return cached on error
    }
  }

  /**
   * Search bots by query
   */
  async searchBots(query: string): Promise<BotInfo[]> {
    const allBots = await this.getAllBots();
    const lowerQuery = query.toLowerCase();

    return allBots.filter(bot =>
      bot.name.toLowerCase().includes(lowerQuery) ||
      bot.description.toLowerCase().includes(lowerQuery) ||
      bot.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      bot.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get bots by category
   */
  async getBotsByCategory(category: BotCategory): Promise<BotInfo[]> {
    const allBots = await this.getAllBots();
    return allBots.filter(bot => bot.category === category);
  }

  /**
   * Get connected bots (ones the user has chatted with)
   */
  async getConnectedBots(): Promise<BotInfo[]> {
    const allBots = await this.getAllBots();
    return allBots.filter(bot => this.connectedBots.has(bot.id));
  }

  /**
   * Mark a bot as connected
   */
  async connectBot(botId: string): Promise<void> {
    this.connectedBots.add(botId);
    await AsyncStorage.setItem(
      STORAGE_KEY_CONNECTED_BOTS,
      JSON.stringify(Array.from(this.connectedBots))
    );
  }

  /**
   * Disconnect a bot
   */
  async disconnectBot(botId: string): Promise<void> {
    this.connectedBots.delete(botId);
    await AsyncStorage.setItem(
      STORAGE_KEY_CONNECTED_BOTS,
      JSON.stringify(Array.from(this.connectedBots))
    );
  }

  /**
   * Add a private (self-hosted) bot
   */
  async addPrivateBot(config: PrivateBotConfig): Promise<BotInfo> {
    const bot: BotInfo = {
      id: `private_${Date.now()}`,
      userId: config.userId,
      name: config.name,
      description: 'Your private self-hosted bot',
      provider: 'private',
      category: 'ai-assistant',
      capabilities: [
        { id: 'chat', name: 'Chat', description: 'Natural conversation' },
      ],
      tags: ['private', 'self-hosted'],
      homeserver: config.homeserver,
      supportsE2EE: true,
      version: '1.0.0',
      verified: false,
    };

    this.privateBots.set(bot.id, bot);
    await this.savePrivateBots();

    return bot;
  }

  /**
   * Remove a private bot
   */
  async removePrivateBot(botId: string): Promise<void> {
    this.privateBots.delete(botId);
    await this.savePrivateBots();
  }

  private async savePrivateBots(): Promise<void> {
    const bots = Array.from(this.privateBots.values());
    await AsyncStorage.setItem(STORAGE_KEY_PRIVATE_BOTS, JSON.stringify(bots));
  }

  /**
   * Get bot by ID
   */
  async getBot(botId: string): Promise<BotInfo | undefined> {
    const allBots = await this.getAllBots();
    return allBots.find(bot => bot.id === botId);
  }

  /**
   * Get bot by Matrix user ID
   */
  async getBotByUserId(userId: string): Promise<BotInfo | undefined> {
    const allBots = await this.getAllBots();
    return allBots.find(bot => bot.userId === userId);
  }

  /**
   * Check if a bot is verified
   */
  isBotVerified(bot: BotInfo): boolean {
    return bot.verified || bot.provider === 'official';
  }

  /**
   * Get categories with bot counts
   */
  async getCategories(): Promise<Array<{ category: BotCategory; count: number; label: string }>> {
    const allBots = await this.getAllBots();
    const categoryLabels: Record<BotCategory, string> = {
      'ai-assistant': 'AI Assistants',
      'image-generation': 'Image & Video',
      'video-editing': 'Video Editing',
      'code-assistant': 'Code Assistants',
      'translation': 'Translation',
      'writing': 'Writing Tools',
      'research': 'Research',
      'custom': 'Custom Bots',
    };

    const counts = new Map<BotCategory, number>();
    allBots.forEach(bot => {
      counts.set(bot.category, (counts.get(bot.category) || 0) + 1);
    });

    return Object.entries(categoryLabels)
      .map(([category, label]) => ({
        category: category as BotCategory,
        count: counts.get(category as BotCategory) || 0,
        label,
      }))
      .filter(c => c.count > 0);
  }
}

// Singleton
let registry: BotRegistry | null = null;

export function getBotRegistry(): BotRegistry {
  if (!registry) {
    registry = new BotRegistry();
  }
  return registry;
}

export async function initializeBotRegistry(): Promise<void> {
  const reg = getBotRegistry();
  await reg.initialize();
}
