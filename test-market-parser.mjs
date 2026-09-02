// Quick offline sanity check for fetch-market-posts.js's regex parser, using a hand-built
// HTML sample that mirrors the real structure of a t.me/s/<channel> public preview page
// (verified against known Telegram widget markup). Run with: node test-market-parser.mjs
import { parseChannel, detectTags } from './fetch-market-posts.js';
import assert from 'node:assert/strict';

const SAMPLE_HTML = `
<html><body>
<div class="tgme_widget_message_wrapper">
  <div class="tgme_widget_message text_not_supported_wrap js-widget_message" data-post="BULLSTAR1/5532" data-view="abc123">
    <div class="tgme_widget_message_bubble">
      <div class="tgme_widget_message_text js-message_text" dir="auto">BTC breaking out of the range 🚀<br><br>Target: $75,000<br>Stop: $68,000 &amp; trail up</div>
      <div class="tgme_widget_message_footer compact_message">
        <div class="tgme_widget_message_info short">
          <span class="tgme_widget_message_views">12.3K</span>
          <a class="tgme_widget_message_date" href="https://t.me/BULLSTAR1/5532">
            <time class="time" datetime="2026-08-30T10:15:00+00:00">10:15</time>
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="tgme_widget_message_wrapper">
  <div class="tgme_widget_message photo_belowtext_wrap js-widget_message" data-post="BULLSTAR1/5531" data-view="def456">
    <div class="tgme_widget_message_bubble">
      <a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn4.telesco.pe/file/sample123.jpg')" href="https://t.me/BULLSTAR1/5531"></a>
      <div class="tgme_widget_message_text js-message_text" dir="auto">ETH looking strong above &#036;3,400 - watching for continuation.</div>
      <div class="tgme_widget_message_footer compact_message">
        <a class="tgme_widget_message_date" href="https://t.me/BULLSTAR1/5531">
          <time class="time" datetime="2026-08-30T09:02:00+00:00">09:02</time>
        </a>
      </div>
    </div>
  </div>
</div>
<div class="tgme_widget_message_wrapper">
  <div class="tgme_widget_message photo_wrap js-widget_message" data-post="BULLSTAR1/5530" data-view="ghi789">
    <div class="tgme_widget_message_bubble">
      <a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn4.telesco.pe/file/sample999.jpg')" href="https://t.me/BULLSTAR1/5530"></a>
      <div class="tgme_widget_message_footer compact_message">
        <a class="tgme_widget_message_date" href="https://t.me/BULLSTAR1/5530">
          <time class="time" datetime="2026-08-30T08:00:00+00:00">08:00</time>
        </a>
      </div>
    </div>
  </div>
</div>
</body></html>
`;

const posts = parseChannel(SAMPLE_HTML, { username: 'BULLSTAR1', name: 'Bullstar Signals', isOwn: true });

// Should find exactly 2 posts (the caption-less photo post is skipped).
assert.equal(posts.length, 2, `expected 2 posts, got ${posts.length}`);

const [first, second] = posts;
assert.equal(first.postId, 'BULLSTAR1/5532');
assert.equal(first.link, 'https://t.me/BULLSTAR1/5532');
assert.ok(first.text.includes('BTC breaking out'), 'text extracted');
assert.ok(first.text.includes('Target: $75,000'), '<br> converted to newline, entity decoded');
assert.deepEqual(first.tags, ['BTC']);
assert.equal(first.image, null, 'text-only post has no image');
assert.equal(first.publishedAt, '2026-08-30T10:15:00.000Z');

assert.equal(second.postId, 'BULLSTAR1/5531');
assert.equal(second.image, 'https://cdn4.telesco.pe/file/sample123.jpg', 'photo url extracted');
assert.ok(second.text.includes('above $3,400'), 'numeric entity &#036; decoded to $ (Telegram encodes some plain chars this way)');
assert.deepEqual(second.tags, ['ETH']);

assert.deepEqual(detectTags('nothing about coins here'), []);

console.log('All market-parser assertions passed:');
console.log(JSON.stringify(posts, null, 2));
