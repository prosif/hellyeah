const STORAGE_KEY = 'hellyeah_chats';
const BOT_RESPONSE = 'hell yeah brother';
const TYPING_START_MS = { min: 1000, max: 2000 };
const TYPING_DURATION_MS = { min: 1000, max: 7000 };

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { chats: [], currentChatId: null };
    const data = JSON.parse(raw);
    return {
      chats: Array.isArray(data.chats) ? data.chats : [],
      currentChatId: data.currentChatId ?? null,
    };
  } catch {
    return { chats: [], currentChatId: null };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

function createChat() {
  const id = generateId();
  return {
    id,
    title: '',
    messages: [],
    createdAt: Date.now(),
  };
}

function getChatLabel(chat) {
  return (chat.title && chat.title.trim()) ? chat.title.trim() : formatChatDate(chat);
}

function addMessage(chat, role, content) {
  return {
    ...chat,
    messages: [...chat.messages, { role, content }],
    lastMessageAt: Date.now(),
  };
}

function getLastMessageDate(chat) {
  if (chat.messages.length === 0) return chat.createdAt;
  return chat.lastMessageAt ?? chat.createdAt;
}

function formatChatDate(chat) {
  const ts = getLastMessageDate(chat);
  const d = new Date(ts);
  const now = new Date();
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Today ${timeStr}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${timeStr}`;
  const dateStr = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
  return `${dateStr} ${timeStr}`;
}

let state = loadState();

function setState(updater) {
  state = updater(state);
  saveState(state);
  render();
}

function getCurrentChat() {
  if (!state.currentChatId) return null;
  return state.chats.find((c) => c.id === state.currentChatId) ?? null;
}

function ensureCurrentChat() {
  if (getCurrentChat()) return;
  const chat = createChat();
  setState((s) => ({
    ...s,
    chats: [chat, ...s.chats],
    currentChatId: chat.id,
  }));
}

const SUNGLASSES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120">
  <path d="M40,20 L180,20 L180,80 C180,95 160,105 140,105 L60,105 C40,105 25,90 25,75 L25,35 C25,25 30,20 40,20 Z" fill="currentColor"/>
  <path d="M360,20 L220,20 L220,80 C220,95 240,105 260,105 L340,105 C360,105 375,90 375,75 L375,35 C375,25 370,20 360,20 Z" fill="currentColor"/>
  <rect x="180" y="20" width="40" height="15" fill="currentColor"/>
  <path d="M25,30 L5,30 C2,30 0,32 0,35 L0,45" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M375,30 L395,30 C398,30 400,32 400,35 L400,45" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round"/>
</svg>`;

const elements = {
  chatList: document.getElementById('chatList'),
  messages: document.getElementById('messages'),
  input: document.getElementById('input'),
  btnNewChat: document.getElementById('btnNewChat'),
  btnSend: document.getElementById('btnSend'),
  btnAbout: document.getElementById('btnAbout'),
  modalOverlay: document.getElementById('modalOverlay'),
  btnCloseModal: document.getElementById('btnCloseModal'),
};

function renderChatList() {
  const list = elements.chatList;
  list.innerHTML = '';
  const currentId = state.currentChatId;
  for (const chat of state.chats) {
    const item = document.createElement('div');
    item.className = 'chat-item' + (chat.id === currentId ? ' active' : '');
    item.setAttribute('role', 'listitem');
    item.setAttribute('data-chat-id', chat.id);

    const dateSpan = document.createElement('span');
    dateSpan.className = 'chat-item-date';
    dateSpan.textContent = getChatLabel(chat);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'chat-item-edit';
    editBtn.setAttribute('aria-label', 'Rename chat');
    editBtn.textContent = '✎';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'chat-item-delete';
    deleteBtn.setAttribute('aria-label', 'Delete chat');
    deleteBtn.textContent = '×';

    item.appendChild(dateSpan);
    item.appendChild(editBtn);
    item.appendChild(deleteBtn);
    list.appendChild(item);

    item.addEventListener('click', (e) => {
      if (e.target === deleteBtn || e.target === editBtn) return;
      setState((s) => ({ ...s, currentChatId: chat.id }));
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'chat-item-input';
      input.value = chat.title || '';
      input.setAttribute('aria-label', 'Chat name');
      dateSpan.replaceWith(input);
      input.focus();
      input.select();

      function saveTitle() {
        setState((s) => ({
          ...s,
          chats: s.chats.map((c) =>
            c.id === chat.id ? { ...c, title: BOT_RESPONSE } : c
          ),
        }));
      }

      input.addEventListener('blur', saveTitle);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.removeEventListener('blur', saveTitle);
          saveTitle();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          input.removeEventListener('blur', saveTitle);
          setState((s) => s);
        }
      });
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setState((s) => {
        const chats = s.chats.filter((c) => c.id !== chat.id);
        const currentChatId =
          s.currentChatId === chat.id
            ? (chats[0]?.id ?? null)
            : s.currentChatId;
        return { ...s, chats, currentChatId };
      });
    });
  }
}

function renderMessages() {
  const container = elements.messages;
  container.innerHTML = '';
  const chat = getCurrentChat();

  if (!chat || chat.messages.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'messages-empty';
    empty.textContent = 'hell yeah brother';
    container.appendChild(empty);
    return;
  }

  for (const msg of chat.messages) {
    const row = document.createElement('div');
    row.className = 'message ' + msg.role;
    row.setAttribute('role', 'listitem');

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = msg.content;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = SUNGLASSES_SVG;

    if (msg.role === 'user') {
      row.appendChild(bubble);
      row.appendChild(avatar);
    } else {
      row.appendChild(avatar);
      row.appendChild(bubble);
    }
    container.appendChild(row);
  }

  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = elements.messages;
  const empty = container.querySelector('.messages-empty');
  if (empty) empty.remove();

  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.setAttribute('aria-live', 'polite');
  typing.setAttribute('aria-label', 'Bot is typing');
  typing.innerHTML =
    'hell yeah bot is typing<span class="typing-dots"><span></span><span></span><span></span></span>';
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const el = elements.messages.querySelector('.typing-indicator');
  if (el) el.remove();
}

function render() {
  renderChatList();
  renderMessages();
}

let typingStartTimeoutId = null;
let typingEndTimeoutId = null;

function cancelPendingBotResponse() {
  if (typingStartTimeoutId != null) {
    clearTimeout(typingStartTimeoutId);
    typingStartTimeoutId = null;
  }
  if (typingEndTimeoutId != null) {
    clearTimeout(typingEndTimeoutId);
    typingEndTimeoutId = null;
  }
  removeTypingIndicator();
}

function sendMessage() {
  const input = elements.input;
  const text = input.value.trim();
  if (!text) return;

  ensureCurrentChat();
  const chat = getCurrentChat();
  if (!chat) return;

  input.value = '';

  cancelPendingBotResponse();

  setState((s) => {
    const idx = s.chats.findIndex((c) => c.id === chat.id);
    if (idx < 0) return s;
    const updated = addMessage(s.chats[idx], 'user', text);
    const chats = [...s.chats];
    chats[idx] = updated;
    return { ...s, chats };
  });

  const startDelay = randomBetween(TYPING_START_MS.min, TYPING_START_MS.max);
  typingStartTimeoutId = setTimeout(() => {
    typingStartTimeoutId = null;
    showTypingIndicator();
    const typingDuration = randomBetween(TYPING_DURATION_MS.min, TYPING_DURATION_MS.max);
    typingEndTimeoutId = setTimeout(() => {
      typingEndTimeoutId = null;
      setState((s) => {
        const idx = s.chats.findIndex((c) => c.id === chat.id);
        if (idx < 0) return s;
        const updated = addMessage(s.chats[idx], 'assistant', BOT_RESPONSE);
        const chats = [...s.chats];
        chats[idx] = updated;
        return { ...s, chats };
      });
      removeTypingIndicator();
      render();
      elements.messages.scrollTop = elements.messages.scrollHeight;
    }, typingDuration);
  }, startDelay);
}

function openNewChat() {
  const chat = createChat();
  setState((s) => ({
    ...s,
    chats: [chat, ...s.chats],
    currentChatId: chat.id,
  }));
  elements.input.focus();
}

function openAboutModal() {
  elements.modalOverlay.classList.remove('hidden');
  elements.modalOverlay.setAttribute('aria-hidden', 'false');
}

function closeAboutModal() {
  elements.modalOverlay.classList.add('hidden');
  elements.modalOverlay.setAttribute('aria-hidden', 'true');
}

function init() {
  ensureCurrentChat();
  render();

  elements.btnNewChat.addEventListener('click', openNewChat);
  elements.btnSend.addEventListener('click', sendMessage);
  elements.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  elements.btnAbout.addEventListener('click', openAboutModal);
  elements.btnCloseModal.addEventListener('click', closeAboutModal);
  elements.modalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.modalOverlay) closeAboutModal();
  });

  elements.input.focus();
}

init();
