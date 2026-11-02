import { useEffect, useRef, useState, useCallback } from 'react';
import { getToken } from '../lib/auth';
import { WS_URL } from '../lib/config';

const CHAT_WS_URL = `${WS_URL}/chat`;

console.log('Chat WebSocket URL:', CHAT_WS_URL);

interface Message {
    id: string;
    content: string;
    createdAt: string;
    author: string;
    authorAvatarUrl: string | null;
}

interface ChannelMessage extends Message {
    channelId: number;
    userId: number;
}

interface DMMessage extends Message {
    conversationId: number;
    senderId: number;
}

type MessageCallback = (message: ChannelMessage | DMMessage) => void;

interface WebSocketMessage {
    id?: string;
    type: string;
    data?: any;
    error?: string;
}

export function useChat() {
    const ws = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 10;
    const messageCallbacks = useRef<Map<number | string, MessageCallback>>(new Map());
    const pendingRequests = useRef<Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void }>>(new Map());
    const messageIdCounter = useRef(0);

    const generateMessageId = () => {
        messageIdCounter.current += 1;
        return `msg_${Date.now()}_${messageIdCounter.current}`;
    };

    const sendMessage = useCallback((message: WebSocketMessage): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const id = message.id || generateMessageId();
            const msgWithId = { ...message, id };

            pendingRequests.current.set(id, { resolve, reject });

            // Timeout después de 10 segundos
            setTimeout(() => {
                const pending = pendingRequests.current.get(id);
                if (pending) {
                    pendingRequests.current.delete(id);
                    pending.reject(new Error('Request timeout'));
                }
            }, 10000);

            console.log('Sending WebSocket message:', msgWithId);
            ws.current.send(JSON.stringify(msgWithId));
        });
    }, []);

    const authenticate = useCallback(async () => {
        try {
            const token = await getToken();
            if (!token) {
                console.error('No token found');
                return;
            }

            console.log('Authenticating with token...');
            await sendMessage({
                type: 'authenticate',
                data: { token },
            });

            setAuthenticated(true);
            console.log('Authenticated with chat WebSocket');
        } catch (error) {
            console.error('Authentication failed:', error);
            setAuthenticated(false);
        }
    }, [sendMessage]);

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            return;
        }

        console.log('Connecting to chat WebSocket:', CHAT_WS_URL);

        try {
            ws.current = new WebSocket(CHAT_WS_URL);

            ws.current.onopen = () => {
                console.log('Chat WebSocket connected');
                setConnected(true);
                reconnectAttempts.current = 0;
                authenticate();
            };

            ws.current.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    console.log('Received WebSocket message:', message);

                    // Manejar respuestas a requests
                    if (message.type === 'response' && message.id) {
                        const pending = pendingRequests.current.get(message.id);
                        if (pending) {
                            pendingRequests.current.delete(message.id);
                            pending.resolve(message.data);
                        }
                    }

                    // Manejar errores
                    if (message.type === 'error' && message.id) {
                        const pending = pendingRequests.current.get(message.id);
                        if (pending) {
                            pendingRequests.current.delete(message.id);
                            pending.reject(new Error(message.error || 'Unknown error'));
                        }
                    }

                    // Manejar mensajes de canal
                    if (message.type === 'channel-message' && message.data?.message) {
                        const channelMsg = message.data.message as ChannelMessage;
                        const callback = messageCallbacks.current.get(`channel_${channelMsg.channelId}`);
                        if (callback) {
                            callback(channelMsg);
                        }
                    }

                    // Manejar mensajes directos
                    if (message.type === 'dm-message' && message.data?.message) {
                        const dmMsg = message.data.message as DMMessage;
                        const callback = messageCallbacks.current.get(`dm_${dmMsg.conversationId}`);
                        if (callback) {
                            callback(dmMsg);
                        }
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.current.onerror = (error) => {
                console.error('Chat WebSocket error:', error);
            };

            ws.current.onclose = () => {
                console.log('Chat WebSocket disconnected');
                setConnected(false);
                setAuthenticated(false);

                // Intentar reconectar con backoff exponencial
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})...`);

                    reconnectTimeout.current = setTimeout(() => {
                        reconnectAttempts.current += 1;
                        connect();
                    }, delay);
                } else {
                    console.error('Max reconnection attempts reached');
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
        }
    }, [authenticate]);

    const disconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
        }

        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }

        setConnected(false);
        setAuthenticated(false);
    }, []);

    const subscribeToChannel = useCallback(async (channelId: number, callback: MessageCallback) => {
        if (!authenticated) {
            console.warn('Cannot subscribe to channel: not authenticated');
            throw new Error('Not authenticated');
        }

        try {
            await sendMessage({
                type: 'subscribe-channel',
                data: { channelId },
            });

            messageCallbacks.current.set(`channel_${channelId}`, callback);
            console.log(`Subscribed to channel ${channelId}`);
        } catch (error) {
            console.error(`Failed to subscribe to channel ${channelId}:`, error);
            throw error;
        }
    }, [authenticated, sendMessage]);

    const unsubscribeFromChannel = useCallback(async (channelId: number) => {
        if (!authenticated) {
            return;
        }

        try {
            await sendMessage({
                type: 'unsubscribe-channel',
                data: { channelId },
            });

            messageCallbacks.current.delete(`channel_${channelId}`);
            console.log(`Unsubscribed from channel ${channelId}`);
        } catch (error) {
            console.error(`Failed to unsubscribe from channel ${channelId}:`, error);
        }
    }, [authenticated, sendMessage]);

    const subscribeToConversation = useCallback(async (conversationId: number, callback: MessageCallback) => {
        if (!authenticated) {
            console.warn('Cannot subscribe to conversation: not authenticated');
            throw new Error('Not authenticated');
        }

        try {
            await sendMessage({
                type: 'subscribe-dm',
                data: { conversationId },
            });

            messageCallbacks.current.set(`dm_${conversationId}`, callback);
            console.log(`Subscribed to conversation ${conversationId}`);
        } catch (error) {
            console.error(`Failed to subscribe to conversation ${conversationId}:`, error);
            throw error;
        }
    }, [authenticated, sendMessage]);

    const unsubscribeFromConversation = useCallback(async (conversationId: number) => {
        if (!authenticated) {
            return;
        }

        try {
            await sendMessage({
                type: 'unsubscribe-dm',
                data: { conversationId },
            });

            messageCallbacks.current.delete(`dm_${conversationId}`);
            console.log(`Unsubscribed from conversation ${conversationId}`);
        } catch (error) {
            console.error(`Failed to unsubscribe from conversation ${conversationId}:`, error);
        }
    }, [authenticated, sendMessage]);

    const sendChannelMessage = useCallback(async (channelId: number, content: string) => {
        if (!authenticated) {
            console.error('Cannot send channel message: not authenticated');
            throw new Error('Not authenticated');
        }

        console.log(`Sending message to channel ${channelId}:`, content);
        try {
            const result = await sendMessage({
                type: 'send-channel-message',
                data: { channelId, content },
            });

            console.log('Message sent successfully:', result);
            return result.message;
        } catch (error) {
            console.error(`Failed to send message to channel ${channelId}:`, error);
            throw error;
        }
    }, [authenticated, sendMessage]);

    const sendDirectMessage = useCallback(async (conversationId: number, content: string) => {
        if (!authenticated) {
            console.error('Cannot send direct message: not authenticated');
            throw new Error('Not authenticated');
        }

        console.log(`Sending direct message to conversation ${conversationId}:`, content);
        try {
            const result = await sendMessage({
                type: 'send-dm',
                data: { conversationId, content },
            });

            console.log('Direct message sent successfully:', result);
            return result.message;
        } catch (error) {
            console.error(`Failed to send direct message to conversation ${conversationId}:`, error);
            throw error;
        }
    }, [authenticated, sendMessage]);

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        connected,
        authenticated,
        subscribeToChannel,
        unsubscribeFromChannel,
        subscribeToConversation,
        unsubscribeFromConversation,
        sendChannelMessage,
        sendDirectMessage,
    };
}
