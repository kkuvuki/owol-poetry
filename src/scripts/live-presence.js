import { supabase } from './supabase.js';

var channel = null;
var presenceEl = null;

export function initPresence(containerEl) {
  if (!containerEl) return;
  presenceEl = containerEl;

  channel = supabase.channel('poem-readers', {
    config: { presence: { key: generateId() } }
  });

  channel.on('presence', { event: 'sync' }, function () {
    var state = channel.presenceState();
    var count = Object.keys(state).length;
    render(count);
  });

  channel.subscribe(async function (status) {
    if (status === 'SUBSCRIBED') {
      await channel.track({ online_at: new Date().toISOString() });
    }
  });
}

function render(count) {
  if (!presenceEl) return;
  if (count <= 1) {
    presenceEl.innerHTML = '';
    return;
  }
  presenceEl.innerHTML = '<span class="presence-dot"></span> ' + count + ' reading now';
  presenceEl.className = 'live-presence';
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function destroyPresence() {
  if (channel) {
    channel.untrack();
    channel.unsubscribe();
    channel = null;
  }
}
