// fetch-market-posts.js
// Fetches the latest public posts from Telegram channels (via each channel's public
// t.me/s/<username> preview page - no bot token / API key needed since the channel is
// public), tags each post with a coin symbol, and saves the result to market-posts.json.
//
// To add/remove channels, edit CHANNELS below.

const CHANNELS = [
  { username: 'BULLSTAR1', name: 'Bullstar Signals', isOwn: true },
];

// Coin symbol -> keywords matched (case-insensitively) against the post text.
// Keep this in sync with fetch-news.js's COIN_KEYWORDS if you add coins there too.
const COIN_KEYWORDS = {
  BTC: ['bitcoin', 'btc'],
  ETH: ['ethereum', 'eth'],
  SOL: ['solana', 'sol'],
  XRP: ['xrp', 'ripple'],
  ADA: ['cardano', 'ada'],
  DOGE: ['dogecoin', 'doge'],
  BNB: ['bnb', 'binance coin'],
  AVAX: ['avalanche', 'avax'],
  MATIC: ['polygon', 'matic'],
  DOT: ['polkadot'],
  LINK: ['chainlink'],
  LTC: ['litecoin'],
  SHIB: ['shiba inu', 'shib'],
  TRX: ['tron'],
  TON: ['toncoin'],
  SUI: ['sui network'],
  ARB: ['arbitrum'],
  OP: ['optimism'],
};

function decodeEntities(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(html = '') {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

// Word-boundary matching (not a plain substring check) - short freeform Telegram captions
// otherwise false-positive constantly, e.g. "strong" contains "tron", "solution" contains "sol".
function detectTags(text) {
  const tags = [];
  for (const [symbol, words] of Object.entries(COIN_KEYWORDS)) {
    const matches = words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
    if (matches) tags.push(symbol);
    if (tags.length >= 4) break;
  }
  return tags;
}

async function fetchChannel({ username, name, isOwn }) {
  const res = await fetch(`https://t.me/s/${username}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CryptoFlashBot/1.0)' },
  });
  if (!res.ok) throw new Error(`${username}: HTTP ${res.status}`);
  const html = await res.text();
  return parseChannel(html, { username, name, isOwn });
}

function parseChannel(html, { username, name, isOwn }) {
  // Each message container div carries a `data-post="<channel>/<id>"` attribute - use those
  // as split points instead of a wrapper class name, since "message_wrap" is a substring of
  // both the message wrapper AND the unrelated "message_photo_wrap" class and would otherwise
  // fragment a single message into several bogus chunks.
  const postMarkers = [...html.matchAll(/data-post="([^"]+)"/g)];

  return postMarkers
    .map((marker, i) => {
      const postId = marker[1]; // e.g. "BULLSTAR1/5532"
      const start = marker.index;
      const end = i + 1 < postMarkers.length ? postMarkers[i + 1].index : html.length;
      const chunk = html.slice(start, end);

      const textMatch = chunk.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
      const text = textMatch ? stripHtml(textMatch[1]) : '';
      if (!text) return null; // skip photo/poll-only posts with no caption

      const dateMatch = chunk.match(/<time[^>]*datetime="([^"]+)"/);
      const publishedAt = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

      const photoMatch = chunk.match(/tgme_widget_message_photo_wrap"[^>]*background-image:url\('([^']+)'\)/);

      return {
        channel: name,
        channelUsername: username,
        isOwn: !!isOwn,
        postId,
        link: `https://t.me/${postId}`,
        publishedAt,
        text: text.slice(0, 600),
        image: photoMatch ? photoMatch[1] : null,
        tags: detectTags(text),
      };
    })
    .filter(Boolean);
}

function dedupe(posts) {
  const seen = new Set();
  return posts.filter((p) => {
    if (seen.has(p.postId)) return false;
    seen.add(p.postId);
    return true;
  });
}

async function saveItems(posts) {
  const fs = await import('node:fs/promises');
  await fs.writeFile('market-posts.json', JSON.stringify(posts, null, 2));
  console.log(`Saved ${posts.length} market posts to market-posts.json`);
}

async function main() {
  const settled = await Promise.allSettled(CHANNELS.map(fetchChannel));
  const posts = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      posts.push(...result.value);
    } else {
      console.error(`Failed to fetch ${CHANNELS[i].username}:`, result.reason.message || result.reason);
    }
  });
  const deduped = dedupe(posts).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  await saveItems(deduped);
}

export { parseChannel, detectTags };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
