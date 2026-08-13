/**
 * WebSocket Manager - Real-time messaging, typing indicators, read receipts
 */

export interface WebSocketMessage {
  type:
    | 'message'
    | 'typing'
    | 'read_receipt'
    | 'user_status'
    | 'delivery_receipt';
  data: any;
}

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Set<MessageHandler> = new Set();
  private messageQueue: any[] = [];
  
  constructor() {
    this.url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.ws?.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }

        const wsUrl = `${this.url}/ws?token=${token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log(`✓ WebSocket connected globally`);
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.flushQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.handlers.forEach((handler) => handler(message));
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.warn('WebSocket warning:', error);
          // Only reject if we are still connecting
          if (this.ws?.readyState === WebSocket.CONNECTING) {
             reject(new Error('WebSocket connection failed'));
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.handleDisconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
          this.connect(token).catch(console.error);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  send(type: string, data: any) {
    const message = { type, ...data, timestamp: new Date().toISOString() };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
      console.warn('WebSocket not connected, message queued');
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  sendTypingIndicator(conversationId: number, participantIds: number[]) {
    this.send('typing', { conversation_id: conversationId, participant_ids: participantIds });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
    this.messageQueue = [];
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsManager = new WebSocketManager();
export default wsManager;
