export function readCommunityMessage(row) {
  if (
    row.dataset.channel === 'game' ||
    row.dataset.category === 'announcement' ||
    row.hidden ||
    row.style.display === 'none'
  )
    return null;
  const sender = row.querySelector('.chat-sender-name');
  if (!sender) return null;
  const chunks = [];
  // Read the already filtered, rendered message after the sender. Timestamps,
  // badges and world tags are siblings before it, never mirror those.
  for (let next = sender.nextSibling; next; next = next.nextSibling) {
    if (next.nodeType === 3 || (next.nodeType === 1 && next.tagName === 'SPAN' && !next.className))
      chunks.push(next.textContent);
  }
  const message = chunks
    .join('')
    .replace(/^\s*:\s*/, '')
    .trim();
  const name = sender.textContent.trim();
  const badges = Array.from(row.querySelectorAll('.chat-badge-slot img'))
    .filter((img) => !img.closest('.tooltip'))
    .slice(0, 2)
    .map((img) => ({ src: img.currentSrc || img.src, alt: img.alt || '' }))
    .filter((badge) => badge.src);
  return message && name
    ? {
        name: name.slice(0, 80),
        message: message.slice(0, 320),
        color: sender.style.color,
        badges,
      }
    : null;
}
