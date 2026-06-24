export type Sentiment = 'Frustrated' | 'Angry' | 'Neutral' | 'Sad' | 'Happy';
export type TicketStatus = 'Open' | 'Replied' | 'Escalated' | 'In Queue' | 'Closed';

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isCustomer: boolean;
}

export interface Ticket {
  id: string;
  senderName: string;
  senderEmail: string;
  topic: string;
  category: string;
  sentiment: Sentiment;
  brief: string;
  draftStatus: 'Draft ready' | 'Draft prepared' | 'Needs action' | 'Approved' | 'Sent';
  status: TicketStatus;
  waitingTime: string;
  orderId: string;
  contactCount: number;
  messages: Message[];
  triggerReason?: string;
  priority?: boolean;
}

export interface KBSection {
  id: string;
  title: string;
  summary: string;
  category: string;
  articlesCount: number;
  updatedTime: string;
}

export interface KBChunk {
  id: string;
  sourceId: string;
  title: string;
  relevanceScore: number;
  text: string;
  category: string;
}

export interface SettingsRule {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  keywords?: string[];
  icon: string;
}

export interface KPIStats {
  received: { value: number; change: string };
  autoDrafted: { value: number; percentage: number };
  escalated: { value: number; change: string };
  solved: { value: number; percentage: number };
  inQueue: { value: number; status: string };
  avgResponse: { value: string; change: string };
}
