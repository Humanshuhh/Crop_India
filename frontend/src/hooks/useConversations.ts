import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Conversation, AssistantMessage } from '../types/assistant.types';

export type ConversationGroupKey = 'Today' | 'Yesterday' | 'Previous 7 days' | 'Older';

function createUniqueId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateConversationTitle(queryText: string, hasImage?: boolean): string {
  const clean = queryText.trim().replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
  if (!clean && hasImage) {
    return 'Crop photo diagnosis';
  }
  if (!clean) {
    return 'New conversation';
  }
  const firstLine = clean.split('\n')[0].trim();
  if (firstLine.length > 36) {
    return firstLine.slice(0, 34) + '...';
  }
  return firstLine;
}

export function getConversationGroup(updatedAt: number): ConversationGroupKey {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

  if (updatedAt >= startOfToday) {
    return 'Today';
  }
  if (updatedAt >= startOfYesterday) {
    return 'Yesterday';
  }
  if (updatedAt >= startOf7Days) {
    return 'Previous 7 days';
  }
  return 'Older';
}

function sanitizeMessageForStorage(msg: AssistantMessage): AssistantMessage {
  // Strip large audioBase64 strings or binary blobs to prevent localStorage quota exhaustion
  return {
    ...msg,
    audioBase64: null,
    audioBlob: undefined,
  };
}

export function useConversations() {
  const { user } = useAuth();

  const storageKey = useMemo(() => {
    return user?.uid
      ? `kisan_conversations_${user.uid}`
      : 'kisan_conversations_guest';
  }, [user?.uid]);

  const activeKey = useMemo(() => {
    return user?.uid
      ? `kisan_active_conv_${user.uid}`
      : 'kisan_active_conv_guest';
  }, [user?.uid]);

  // Load conversations from localStorage
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[useConversations] Error parsing stored conversations:', e);
    }

    // Default initial conversation
    const initial: Conversation = {
      id: createUniqueId(),
      title: 'New conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    return [initial];
  });

  // Track active conversation ID
  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(activeKey);
      if (stored && conversations.some((c) => c.id === stored)) {
        return stored;
      }
    } catch {
      // ignore
    }
    return conversations[0]?.id || createUniqueId();
  });

  // Sync state when account/storageKey changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      let loaded: Conversation[] = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loaded = parsed;
        }
      }
      if (loaded.length === 0) {
        loaded = [
          {
            id: createUniqueId(),
            title: 'New conversation',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
          },
        ];
      }
      setConversations(loaded);

      const savedActive = localStorage.getItem(activeKey);
      if (savedActive && loaded.some((c) => c.id === savedActive)) {
        setActiveId(savedActive);
      } else {
        setActiveId(loaded[0].id);
      }
    } catch (e) {
      console.warn('[useConversations] Account change sync error:', e);
    }
  }, [storageKey, activeKey]);

  // Persist conversations
  const saveConversations = useCallback(
    (newConvs: Conversation[]) => {
      setConversations(newConvs);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newConvs));
      } catch (e) {
        console.warn('[useConversations] localStorage write error:', e);
      }
    },
    [storageKey]
  );

  // Active conversation object
  const activeConversation = useMemo(() => {
    return (
      conversations.find((c) => c.id === activeId) ||
      conversations[0] || {
        id: activeId,
        title: 'New conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      }
    );
  }, [conversations, activeId]);

  // Create New Conversation
  const createNewConversation = useCallback(() => {
    // If the currently active conversation is already empty, avoid creating unnecessary duplicate empty conversations
    if (activeConversation && activeConversation.messages.length === 0) {
      return activeConversation.id;
    }

    const newConv: Conversation = {
      id: createUniqueId(),
      title: 'New conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    const updated = [newConv, ...conversations];
    saveConversations(updated);
    setActiveId(newConv.id);
    try {
      localStorage.setItem(activeKey, newConv.id);
    } catch {
      // ignore
    }
    return newConv.id;
  }, [activeConversation, conversations, saveConversations, activeKey]);

  // Select conversation
  const selectConversation = useCallback(
    (id: string) => {
      setActiveId(id);
      try {
        localStorage.setItem(activeKey, id);
      } catch {
        // ignore
      }
    },
    [activeKey]
  );

  // Delete conversation
  const deleteConversation = useCallback(
    (id: string) => {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fresh: Conversation = {
          id: createUniqueId(),
          title: 'New conversation',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        saveConversations([fresh]);
        setActiveId(fresh.id);
        try {
          localStorage.setItem(activeKey, fresh.id);
        } catch {}
      } else {
        saveConversations(remaining);
        if (activeId === id) {
          setActiveId(remaining[0].id);
          try {
            localStorage.setItem(activeKey, remaining[0].id);
          } catch {}
        }
      }
    },
    [conversations, activeId, saveConversations, activeKey]
  );

  // Append a message to a conversation
  const appendMessage = useCallback(
    (convId: string, message: AssistantMessage) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === convId);
        if (index === -1) return prev;

        const target = prev[index];
        const sanitized = sanitizeMessageForStorage(message);
        const updatedMessages = [...target.messages, sanitized];

        // Generate title from first user message if current title is default
        let title = target.title;
        if (
          message.sender === 'user' &&
          (target.title === 'New conversation' || target.messages.length === 0)
        ) {
          title = generateConversationTitle(message.text, !!message.imageUrl);
        }

        const updatedConv: Conversation = {
          ...target,
          title,
          updatedAt: Date.now(),
          messages: updatedMessages,
        };

        // Move the updated conversation to the top
        const nextList = [
          updatedConv,
          ...prev.slice(0, index),
          ...prev.slice(index + 1),
        ];

        try {
          localStorage.setItem(storageKey, JSON.stringify(nextList));
        } catch (e) {
          console.warn('[useConversations] localStorage write error:', e);
        }

        return nextList;
      });
    },
    [storageKey]
  );

  // Replace a message in a conversation (e.g. updating an error message in-place or replacing it with an assistant response)
  const replaceMessage = useCallback(
    (convId: string, messageId: string, newMessage: AssistantMessage) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === convId);
        if (index === -1) return prev;

        const target = prev[index];
        const sanitized = sanitizeMessageForStorage(newMessage);
        const updatedMessages = target.messages.map((m) =>
          m.id === messageId ? sanitized : m
        );

        const updatedConv: Conversation = {
          ...target,
          updatedAt: Date.now(),
          messages: updatedMessages,
        };

        const nextList = [
          updatedConv,
          ...prev.slice(0, index),
          ...prev.slice(index + 1),
        ];

        try {
          localStorage.setItem(storageKey, JSON.stringify(nextList));
        } catch (e) {
          console.warn('[useConversations] localStorage write error:', e);
        }

        return nextList;
      });
    },
    [storageKey]
  );

  // Remove a message from a conversation
  const removeMessage = useCallback(
    (convId: string, messageId: string) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === convId);
        if (index === -1) return prev;

        const target = prev[index];
        const updatedMessages = target.messages.filter((m) => m.id !== messageId);

        const updatedConv: Conversation = {
          ...target,
          updatedAt: Date.now(),
          messages: updatedMessages,
        };

        const nextList = [
          ...prev.slice(0, index),
          updatedConv,
          ...prev.slice(index + 1),
        ];

        try {
          localStorage.setItem(storageKey, JSON.stringify(nextList));
        } catch (e) {
          console.warn('[useConversations] localStorage write error:', e);
        }

        return nextList;
      });
    },
    [storageKey]
  );

  return {
    conversations,
    activeId,
    activeConversation,
    createNewConversation,
    selectConversation,
    deleteConversation,
    appendMessage,
    replaceMessage,
    removeMessage,
  };
}
