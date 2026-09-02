hello world
line two// fetch-news.js
// Fetches crypto news from a curated list of RSS feeds, extracts + tags + dedups items,
// and saves the result. Zero external dependencies (works with Node 18+ built-in fetch).
//
// To add/remove sources, edit FEEDS below.
// To change how results are stored, edit saveItems() at the bottom.

const FEEDS = [
  { url: 'https://cointelegraph.com/rss', source: 'Cointelegraph' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://decrypt.co/feed', source: 'Decrypt' },
  { url: 'https://cryptoslate.com/feed/', source: 'CryptoSlate' },
  { url: 'https://cryptopotato.com/feed/', source: 'CryptoPotato' },
  { url: 'https://www.newsbtc.com/feed/', source: 'NewsBTC' },
];

// Coin symbol -> keywords matched (case-insensitively) against title + preview text.
// Add more altcoins here any time.
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
  Regulation: ['sec', 'regulator', 'regulation', 'lawsuit', 'genius act'],
};

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function decodeEntities(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  let val = m[1].trim();
  const cdata = val.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  if (cdata) val = cdata[1];
  return decodeEntities(val.trim());
}

// Word-boundary matching (not a plain substring check) - short headlines otherwise
// false-positive constantly, e.g. "strong" contains "tron", "solution" contains "sol".
function detectTags(text) {
  const tags = [];
  for (const [symbol, words] of Object.entries(COIN_KEYWORDS)) {
    const matches = words.some((w) => new RegExp(`\\b${w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
    if (matches) tags.push(symbol);
    if (tags.length >= 4) break;
  }
  return tags;
}

function cleanLink(link) {
  try {
    const u = new URL(link);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((p) =>
      u.searchParams.delete(p)
    );
    return u.toString();
  } catch {
    return link;
  }
}

async function fetchFeed({ url, source }) {
  const res = await fetch(url, { headers: { 'User-Agent': 'CryptoFlashBot/1.0' } });
  if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
  const xml = await res.text();
  return parseFeed(xml, source);
}

function parseFeed(xml, source) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  return items
    .map((block) => {
      const title = extractTag(block, 'title');
      const link = cleanLink(extractTag(block, 'link'));
      const pubDate = extractTag(block, 'pubDate');
      const description = stripHtml(extractTag(block, 'description')).slice(0, 220);
      const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
      return {
        source,
        title,
        link,
        publishedAt,
        preview: description,
        tags: detectTags(`${title} ${description}`),
      };
    })
    .filter((item) => item.title && item.link);
}

function dedupe(items) {
  const seenLinks = new Set();
  const seenTitles = new Set();
  const out = [];
  for (const item of items) {
    const titleKey = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seenLinks.has(item.link) || seenTitles.has(titleKey)) continue;
    seenLinks.add(item.link);
    seenTitles.add(titleKey);
    out.push(item);
  }
  return out;
}

async function saveItems(items) {
  // TODO: swap this for a real database write (e.g. a Supabase upsert) when you're ready.
  // For now it writes a plain JSON file that the app/website can read directly
  // (e.g. served through jsDelivr's GitHub CDN once this repo is pushed).
  const fs = await import('node:fs/promises');
  await fs.writeFile('news.json', JSON.stringify(items, null, 2));
  console.log(`Saved ${items.length} articles to news.json`);
}

async function main() {
  const settled = await Promise.allSettled(FEEDS.map(fetchFeed));
  const items = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      console.error(`Failed to fetch ${FEEDS[i].source}:`, result.reason.message || result.reason);
    }
  });
  const deduped = dedupe(items).sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
  await saveItems(deduped);
}

// Exported for testing without hitting the network.
export { parseFeed, detectTags, cleanLink, dedupe };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
