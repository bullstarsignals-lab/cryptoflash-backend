import { parseFeed, detectTags, cleanLink, dedupe } from './fetch-news.js';

// Real sample XML captured from cointelegraph.com/rss, used to test the parser
// without needing live network access in this sandbox.
const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
    <title>Cointelegraph.com News</title>
    <link>https://cointelegraph.com</link>
    <item>
      <title>Here's what happened in crypto today</title>
      <pubDate>Fri, 28 Aug 2026 20:42:54 +0000</pubDate>
      <guid isPermaLink="true">https://cointelegraph.com/news/what-happened-in-crypto-today</guid>
      <link><![CDATA[https://cointelegraph.com/news/what-happened-in-crypto-today?utm_source=rss_feed&utm_medium=rss&utm_campaign=rss_partner_inbound]]></link>
      <description><![CDATA[<p style="float:right; margin:0 0 10px 15px; width:240px;"><img src="https://s3-images.ctmedia.io/x.jpg"></p><p>Need to know what happened in crypto today? Here is the latest news on daily trends and events impacting Bitcoin price, blockchain, DeFi, Web3 and crypto regulation.</p>]]></description>
      <dc:creator>Cointelegraph by Zoltan Vardai</dc:creator>
      <category>Latest News</category>
    </item>
    <item>
      <title>Solana validators approve proposal to accelerate SOL disinflation</title>
      <pubDate>Fri, 28 Aug 2026 19:53:12 +0000</pubDate>
      <guid isPermaLink="true">https://cointelegraph.com/news/solana-validators-approve-proposal-to-accelerate-sol-disinflation</guid>
      <link><![CDATA[https://cointelegraph.com/news/solana-validators-approve-proposal-to-accelerate-sol-disinflation?utm_source=rss_feed&utm_medium=rss&utm_campaign=rss_partner_inbound]]></link>
      <description><![CDATA[<p>The approved proposal doubles Solana's annual disinflation rate from 15% to 30%, reducing future SOL issuance while leaving its long-term inflation target unchanged.</p>]]></description>
      <dc:creator>Cointelegraph by Nate Kostar</dc:creator>
      <category>Latest News</category>
    </item>
    <item>
      <title>Solana validators approve proposal to accelerate SOL disinflation</title>
      <pubDate>Fri, 28 Aug 2026 19:53:12 +0000</pubDate>
      <link><![CDATA[https://cointelegraph.com/news/solana-validators-approve-proposal-to-accelerate-sol-disinflation?utm_source=twitter]]></link>
      <description><![CDATA[<p>Duplicate test - same story, different tracking params, should be deduped.</p>]]></description>
    </item>
</channel>
</rss>`;

const parsed = parseFeed(sampleXml, 'Cointelegraph');
console.log('--- Parsed items ---');
console.log(JSON.stringify(parsed, null, 2));

console.log('\n--- After dedupe ---');
const deduped = dedupe(parsed);
console.log(`Input: ${parsed.length} items -> Output: ${deduped.length} items`);
console.log(JSON.stringify(deduped, null, 2));

console.log('\n--- Assertions ---');
console.assert(parsed.length === 3, 'should parse 3 raw items');
console.assert(deduped.length === 2, 'dedupe should collapse the 2 identical stories into 1 -> total 2');
console.assert(deduped[0].link.indexOf('utm_source') === -1, 'tracking params should be stripped from link');
console.assert(deduped.some(i => i.tags.includes('SOL')), 'Solana story should be tagged SOL');
console.assert(deduped.some(i => i.tags.includes('BTC')), 'first story mentions Bitcoin so should be tagged BTC');
console.log('All assertions passed if no "Assertion failed" lines appeared above.');
