# CryptoFlash - backend data fetchers

Two independent, zero-dependency scripts that keep CryptoFlash's data fresh:

- **`fetch-news.js`** - reads 6 crypto news RSS feeds, tags each story by coin, dedups, saves `news.json`.
- **`fetch-market-posts.js`** - reads the latest public posts from the Bullstar Signals Telegram
  channel (via its public `t.me/s/BULLSTAR1` preview page - no bot token needed), tags them by
  coin, saves `market-posts.json`.

## Status

This repo is live at **github.com/bullstarsignals-lab/cryptoflash-backend** (public - required
for the jsDelivr CDN below to serve it) with the GitHub Action already committed. The Action
runs on its own `*/15 * * * *` schedule; if `news.json` / `market-posts.json` haven't appeared
yet, open the **Actions** tab in the repo and click **Run workflow** to trigger the first run
immediately instead of waiting.

## How the website/app reads the data

The website or app can read either file directly, for free, from:

```
https://cdn.jsdelivr.net/gh/bullstarsignals-lab/cryptoflash-backend@main/news.json
https://cdn.jsdelivr.net/gh/bullstarsignals-lab/cryptoflash-backend@main/market-posts.json
```

These update automatically every time the scripts commit a new version (jsDelivr caches for up
to ~12h though - use the `@main` alias during testing since GitHub's raw-content CDN has no
cache, or purge a specific version at https://www.jsdelivr.com/tools/purge). On the website,
paste both URLs into `cryptoflash-website/assets/js/config.js` (`NEWS_JSON_URL` and
`MARKET_POSTS_JSON_URL`).

## When you need something more powerful

As the app grows and you want better search/filtering, the `saveItems()` function at the bottom
of each script can be swapped to write to a real database (e.g. Supabase) instead of a JSON file
- the rest of each script stays the same.

## Adding or removing news sources

Edit the `FEEDS` list at the top of `fetch-news.js`.

## Adding or removing Telegram channels

Edit the `CHANNELS` list at the top of `fetch-market-posts.js` - each entry needs the channel's
public `username` (the part after `t.me/`, e.g. `BULLSTAR1`), a display `name`, and whether it's
your own channel (`isOwn: true` shows an "OFFICIAL" badge on the website). The channel must be
public - private channels can't be read this way.

## Adding new coins to tag

Edit `COIN_KEYWORDS` in `fetch-news.js` (news) and/or `fetch-market-posts.js` (market posts) -
add the symbol and its matching keywords. Keywords are matched as whole words, so "sol" won't
false-positive on "solution".

## Tests

Both scripts have an offline test that runs against a hand-built HTML/XML sample (no network
needed), so you can verify a change before pushing:

```
npm test
```
