import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  MessageSquare,
  Minus,
  Paperclip,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useMessagingOptional } from "../../context/MessagingContext.jsx";
import { useSystemSettingsOptional } from "../../context/SystemSettingsContext.jsx";
import { uploadMessageAttachment, validateMessageAttachment } from "../../lib/messaging/attachments.js";
import {
  conversationTitleForUser,
  createGroupConversation,
  getOrCreateDirectConversation,
  isConversationUnread,
} from "../../lib/messaging/conversations.js";
import { formatConversationPreview, formatMessageTime } from "../../lib/messaging/format.js";
import { createMessageRef, sendMessage, subscribeToMessages } from "../../lib/messaging/messages.js";
import { markConversationRead } from "../../lib/messaging/conversations.js";
import { searchMessagingDirectory } from "../../lib/messaging/userDirectory.js";

function Avatar({ name, photoUrl, size = "md" }) {
  const initials = name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  const sizeClass = size === "sm" ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-[11px]";
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={`${sizeClass} rounded-full object-cover`} />;
  }
  return (
    <span className={`${sizeClass} grid place-items-center rounded-full bg-[#1e3a5f] font-bold text-white`}>
      {initials}
    </span>
  );
}

function MessageComposer({ conversationId, disabled, maxAttachmentMb, fileSharingEnabled, onSent }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [files, setFiles] = useState(/** @type {File[]} */ ([]));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user || !conversationId || sending) return;
    setSending(true);
    setError(null);
    try {
      /** @type {import('../../lib/messaging/messages.js').MessageAttachment[]} */
      const attachments = [];
      const messageRef = createMessageRef(conversationId);
      const messageId = messageRef.id;
      for (const file of files) {
        validateMessageAttachment(file, maxAttachmentMb);
        attachments.push(await uploadMessageAttachment(conversationId, messageId, file));
      }
      await sendMessage(conversationId, messageId, { uid: user.uid, displayName: user.displayName }, { text, attachments });
      setText("");
      setFiles([]);
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-3">
      {error ? <p className="mb-2 text-xs text-red-700">{error}</p> : null}
      {files.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file) => (
            <span
              key={`${file.name}-${file.size}`}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-afta-bg)] px-2 py-1 text-[10px] text-[var(--color-afta-text)]"
            >
              <Paperclip className="h-3 w-3" />
              {file.name}
              <button
                type="button"
                className="text-[var(--color-afta-muted)]"
                onClick={() => setFiles((current) => current.filter((item) => item !== file))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        {fileSharingEnabled ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                setFiles((current) => [...current, ...selected]);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={disabled || sending}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-[var(--color-afta-border)] p-2 text-[var(--color-afta-muted)] hover:bg-[var(--color-afta-bg)] disabled:opacity-50"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </>
        ) : null}
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          disabled={disabled || sending}
          placeholder="Write a message"
          className="min-h-[44px] flex-1 resize-none rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)] outline-none focus:ring-2 focus:ring-[#c8102e]/20"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit(event);
            }
          }}
        />
        <button
          type="submit"
          disabled={disabled || sending || (!text.trim() && files.length === 0)}
          className="rounded-[10px] bg-[#c8102e] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </form>
  );
}

function MessageThread({ conversationId }) {
  const { user } = useAuth();
  const messaging = useMessagingOptional();
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);
  const conversation = messaging?.conversations.find((item) => item.id === conversationId);

  useEffect(() => {
    if (!conversationId) return undefined;
    return subscribeToMessages(conversationId, setMessages);
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, conversationId]);

  useEffect(() => {
    if (user?.uid && conversationId) {
      markConversationRead(conversationId, user.uid);
    }
  }, [conversationId, user?.uid]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-afta-subtle)]">
            Start the conversation{conversation ? ` with ${conversationTitleForUser(conversation, user?.uid ?? "")}` : ""}.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const mine = message.senderUid === user?.uid;
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-[12px] px-3 py-2 ${
                      mine ? "bg-[#c8102e] text-white" : "bg-[var(--color-afta-bg)] text-[var(--color-afta-text)]"
                    }`}
                  >
                    {!mine && conversation?.type === "group" ? (
                      <p className="mb-1 text-[10px] font-semibold opacity-80">{message.senderName}</p>
                    ) : null}
                    {message.text ? <p className="whitespace-pre-wrap text-sm">{message.text}</p> : null}
                    {message.attachments?.length ? (
                      <div className={`mt-2 space-y-1 ${message.text ? "" : ""}`}>
                        {message.attachments.map((attachment) => (
                          <a
                            key={attachment.storagePath}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-xs ${
                              mine ? "bg-white/15 hover:bg-white/25" : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            <Paperclip className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{attachment.fileName}</span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-[var(--color-afta-muted)]"}`}>
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <MessageComposer
        conversationId={conversationId}
        disabled={!conversationId}
        maxAttachmentMb={messaging?.notificationPrefs.maxAttachmentMb ?? 25}
        fileSharingEnabled={messaging?.notificationPrefs.fileSharingEnabled !== false}
        onSent={() => messaging?.openConversation(conversationId)}
      />
    </div>
  );
}

function NewConversationPanel() {
  const { user } = useAuth();
  const messaging = useMessagingOptional();
  const [mode, setMode] = useState(/** @type {'direct' | 'group'} */ ("direct"));
  const [search, setSearch] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(/** @type {string[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    searchMessagingDirectory(search, user.uid)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [search, user?.uid]);

  async function handleStart() {
    if (!user || !messaging) return;
    setError(null);
    try {
      const selectedContacts = contacts.filter((entry) => selected.includes(entry.uid));
      if (selectedContacts.length === 0) throw new Error("Select at least one person.");
      if (mode === "direct") {
        const conversation = await getOrCreateDirectConversation(user, selectedContacts[0]);
        await messaging.openConversation(conversation.id);
        return;
      }
      const conversation = await createGroupConversation(user, selectedContacts, groupTitle);
      await messaging.openConversation(conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start conversation.");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("direct")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "direct" ? "bg-[#c8102e] text-white" : "bg-[var(--color-afta-bg)]"}`}
        >
          Direct
        </button>
        <button
          type="button"
          onClick={() => setMode("group")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "group" ? "bg-[#c8102e] text-white" : "bg-[var(--color-afta-bg)]"}`}
        >
          Group
        </button>
      </div>
      {mode === "group" ? (
        <input
          value={groupTitle}
          onChange={(event) => setGroupTitle(event.target.value)}
          placeholder="Group name"
          className="mb-3 rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-sm"
        />
      ) : null}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search people"
          className="w-full rounded-[10px] border border-[var(--color-afta-border)] py-2 pl-9 pr-3 text-sm"
        />
      </div>
      {error ? <p className="mb-2 text-xs text-red-700">{error}</p> : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-6 text-center text-sm text-[var(--color-afta-subtle)]">Loading people…</p>
        ) : (
          contacts.map((contact) => {
            const checked = selected.includes(contact.uid);
            return (
              <label
                key={contact.uid}
                className="flex cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-[var(--color-afta-bg)]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelected((current) => {
                      if (mode === "direct") return [contact.uid];
                      return checked
                        ? current.filter((uid) => uid !== contact.uid)
                        : [...current, contact.uid];
                    });
                  }}
                />
                <Avatar name={contact.displayName} photoUrl={contact.photoUrl} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[var(--color-afta-text)]">
                    {contact.displayName}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-afta-muted)]">{contact.email}</span>
                </span>
              </label>
            );
          })
        )}
      </div>
      <button
        type="button"
        onClick={handleStart}
        className="mt-3 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
      >
        Start conversation
      </button>
    </div>
  );
}

function SettingsPanel() {
  const messaging = useMessagingOptional();
  const settingsContext = useSystemSettingsOptional();
  if (!messaging) return null;
  const { notificationPrefs, updatePrefs } = messaging;

  function togglePref(key) {
    updatePrefs({ [key]: !notificationPrefs[key] });
  }

  return (
    <div className="space-y-4 p-4 text-sm text-[var(--color-afta-text)]">
      <p className="text-xs text-[var(--color-afta-subtle)]">
        Personal notification preferences. Platform defaults can be changed in System Settings → Messaging.
      </p>
      <label className="flex items-center justify-between gap-3">
        <span>Unread badge</span>
        <input
          type="checkbox"
          checked={notificationPrefs.badgeEnabled}
          onChange={() => togglePref("badgeEnabled")}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Subtle toast alerts</span>
        <input
          type="checkbox"
          checked={notificationPrefs.toastEnabled}
          onChange={() => togglePref("toastEnabled")}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Soft sound</span>
        <input
          type="checkbox"
          checked={notificationPrefs.soundEnabled}
          onChange={() => togglePref("soundEnabled")}
        />
      </label>
      <p className="text-[11px] text-[var(--color-afta-muted)]">
        File sharing is {notificationPrefs.fileSharingEnabled ? "enabled" : "disabled"} platform-wide
        {settingsContext?.settings?.messaging?.maxAttachmentMb
          ? ` (max ${settingsContext.settings.messaging.maxAttachmentMb} MB).`
          : "."}
      </p>
    </div>
  );
}

export default function MessagingDock() {
  const { user } = useAuth();
  const messaging = useMessagingOptional();

  const activeConversation = useMemo(
    () => messaging?.conversations.find((item) => item.id === messaging.activeConversationId) ?? null,
    [messaging?.conversations, messaging?.activeConversationId],
  );

  if (!messaging?.enabled || !user) return null;

  const {
    expanded,
    minimize,
    expand,
    panelView,
    setPanelView,
    openList,
    openConversation,
    conversations,
    unreadCount,
    notificationPrefs,
    toast,
    setToast,
    activeConversationId,
  } = messaging;

  const showBadge = notificationPrefs.badgeEnabled && unreadCount > 0;

  return (
    <>
      {!expanded ? (
        <button
          type="button"
          onClick={expand}
          className="no-print fixed bottom-5 right-5 z-[55] flex items-center gap-2 rounded-full border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-4 py-3 shadow-lg transition hover:shadow-xl"
        >
          <MessageSquare className="h-5 w-5 text-[#c8102e]" />
          <span className="text-sm font-semibold text-[var(--color-afta-text)]">Messages</span>
          {showBadge ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#c8102e] px-1.5 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      ) : (
        <div className="no-print fixed bottom-5 right-5 z-[55] flex h-[min(72vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-[16px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-afta-border)] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              {panelView === "thread" ? (
                <button type="button" onClick={openList} className="rounded-lg p-1 hover:bg-[var(--color-afta-bg)]">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-afta-text)]">
                  {panelView === "thread" && activeConversation
                    ? conversationTitleForUser(activeConversation, user.uid)
                    : panelView === "new"
                      ? "New conversation"
                      : panelView === "settings"
                        ? "Message settings"
                        : "Messages"}
                </p>
                <p className="text-[10px] text-[var(--color-afta-muted)]">
                  {showBadge ? `${unreadCount} unread` : "Stay connected while you work"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {panelView === "list" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPanelView("new")}
                    className="rounded-lg p-1.5 hover:bg-[var(--color-afta-bg)]"
                    aria-label="New conversation"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelView("settings")}
                    className="rounded-lg p-1.5 hover:bg-[var(--color-afta-bg)]"
                    aria-label="Message settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </>
              ) : null}
              <button type="button" onClick={minimize} className="rounded-lg p-1.5 hover:bg-[var(--color-afta-bg)]" aria-label="Minimize">
                <Minus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {panelView === "list" ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm text-[var(--color-afta-subtle)]">No conversations yet.</p>
                    <button
                      type="button"
                      onClick={() => setPanelView("new")}
                      className="mt-3 text-xs font-semibold text-[#c8102e] hover:underline"
                    >
                      Start a conversation
                    </button>
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const unread = isConversationUnread(conversation, user.uid);
                    const title = conversationTitleForUser(conversation, user.uid);
                    const otherUid =
                      conversation.type === "direct"
                        ? conversation.participantUids.find((uid) => uid !== user.uid)
                        : null;
                    const avatarUrl = otherUid ? conversation.participants?.[otherUid]?.photoUrl : "";
                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => openConversation(conversation.id)}
                        className={`flex w-full items-start gap-3 border-b border-[var(--color-afta-border)] px-3 py-3 text-left hover:bg-[var(--color-afta-bg)] ${
                          unread ? "bg-red-50/40" : ""
                        }`}
                      >
                        <Avatar name={title} photoUrl={avatarUrl} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-[var(--color-afta-text)]">{title}</span>
                            {unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#c8102e]" /> : null}
                          </span>
                          <span className="mt-1 block truncate text-xs text-[var(--color-afta-subtle)]">
                            {formatConversationPreview(
                              conversation.lastMessagePreview,
                              conversation.lastMessageAttachmentCount,
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
            {panelView === "thread" && activeConversationId ? <MessageThread conversationId={activeConversationId} /> : null}
            {panelView === "new" ? <NewConversationPanel /> : null}
            {panelView === "settings" ? <SettingsPanel /> : null}
          </div>
        </div>
      )}

      {toast ? (
        <button
          type="button"
          onClick={() => {
            openConversation(toast.conversationId);
            setToast(null);
          }}
          className="no-print fixed bottom-24 right-5 z-[56] max-w-[320px] rounded-[12px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-4 py-3 text-left shadow-lg transition hover:shadow-xl"
        >
          <p className="text-sm font-semibold text-[var(--color-afta-text)]">{toast.title}</p>
          <p className="mt-1 truncate text-xs text-[var(--color-afta-subtle)]">{toast.body}</p>
        </button>
      ) : null}
    </>
  );
}
