import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useSystemSettingsOptional } from "./SystemSettingsContext.jsx";
import {
  countUnreadConversations,
  markConversationRead,
  subscribeToConversations,
} from "../lib/messaging/conversations.js";
import {
  loadMessagingPreferences,
  resolveMessagingNotificationPrefs,
  saveMessagingPreferences,
} from "../lib/messaging/preferences.js";
import { useMessagingEnabled } from "../lib/messaging/useMessagingEnabled.js";
import { syncUserDirectoryEntry } from "../lib/messaging/userDirectory.js";

/** @typedef {import('../lib/messaging/conversations.js').ConversationRecord} ConversationRecord */

const MessagingContext = createContext(null);

export function MessagingProvider({ children }) {
  const { user } = useAuth();
  const settingsContext = useSystemSettingsOptional();
  const settings = settingsContext?.settings;
  const enabled = useMessagingEnabled();

  const [conversations, setConversations] = useState(/** @type {ConversationRecord[]} */ ([]));
  const [prefs, setPrefs] = useState(() => loadMessagingPreferences());
  const [expanded, setExpanded] = useState(() => !loadMessagingPreferences().minimized);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [panelView, setPanelView] = useState(/** @type {'list' | 'thread' | 'new' | 'settings'} */ ("list"));
  const [toast, setToast] = useState(/** @type {{ title: string, body: string, conversationId: string } | null} */ (null));
  const previousUnreadRef = useRef(new Map());

  const notificationPrefs = useMemo(
    () => resolveMessagingNotificationPrefs(settings, prefs),
    [settings, prefs],
  );

  useEffect(() => {
    if (!user?.uid || !enabled) return undefined;
    syncUserDirectoryEntry(user).catch(() => {});
    return subscribeToConversations(user.uid, setConversations);
  }, [user, enabled]);

  useEffect(() => {
    if (!user?.uid || !enabled || !notificationPrefs.toastEnabled) return;

    for (const conversation of conversations) {
      const key = conversation.id;
      const wasUnread = previousUnreadRef.current.get(key) ?? false;
      const isUnread =
        conversation.lastMessageSenderUid &&
        conversation.lastMessageSenderUid !== user.uid &&
        conversation.lastMessageAt &&
        (!conversation.participants?.[user.uid]?.lastReadAt ||
          conversation.lastMessageAt.toMillis?.() >
            (conversation.participants[user.uid].lastReadAt?.toMillis?.() ?? 0));

      if (isUnread && !wasUnread && (prefs.minimized || activeConversationId !== conversation.id)) {
        if (!prefs.mutedConversationIds.includes(conversation.id)) {
          setToast({
            title: conversation.type === "group" ? conversation.title : "New message",
            body: conversation.lastMessagePreview || "Shared a file",
            conversationId: conversation.id,
          });
          if (notificationPrefs.soundEnabled) {
            playSubtleNotificationSound();
          }
        }
      }
      previousUnreadRef.current.set(key, Boolean(isUnread));
    }
  }, [conversations, user?.uid, enabled, notificationPrefs, prefs, activeConversationId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const unreadCount = useMemo(
    () => (user?.uid ? countUnreadConversations(conversations, user.uid) : 0),
    [conversations, user?.uid],
  );

  const updatePrefs = useCallback((patch) => {
    setPrefs(saveMessagingPreferences(patch));
  }, []);

  const minimize = useCallback(() => {
    setExpanded(false);
    updatePrefs({ minimized: true });
  }, [updatePrefs]);

  const expand = useCallback(() => {
    setExpanded(true);
    updatePrefs({ minimized: false });
  }, [updatePrefs]);

  const openConversation = useCallback(
    async (conversationId) => {
      setActiveConversationId(conversationId);
      setPanelView("thread");
      expand();
      if (user?.uid) {
        await markConversationRead(conversationId, user.uid);
      }
    },
    [expand, user?.uid],
  );

  const openList = useCallback(() => {
    setPanelView("list");
    setActiveConversationId("");
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      conversations,
      unreadCount,
      expanded,
      panelView,
      activeConversationId,
      prefs,
      notificationPrefs,
      toast,
      setToast,
      expand,
      minimize,
      openConversation,
      openList,
      setPanelView,
      setActiveConversationId,
      updatePrefs,
    }),
    [
      enabled,
      conversations,
      unreadCount,
      expanded,
      panelView,
      activeConversationId,
      prefs,
      notificationPrefs,
      toast,
      expand,
      minimize,
      openConversation,
      openList,
      updatePrefs,
    ],
  );

  if (!enabled) {
    return children;
  }

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

function playSubtleNotificationSound() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 660;
    gain.gain.value = 0.03;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  } catch {
    // Ignore browsers that block audio without interaction.
  }
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error("useMessaging must be used within MessagingProvider.");
  }
  return context;
}

export function useMessagingOptional() {
  return useContext(MessagingContext);
}
