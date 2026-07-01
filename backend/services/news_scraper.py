import httpx
from bs4 import BeautifulSoup
import time
from typing import List, Dict, Optional

# Cache articles for 5 minutes to avoid hammering the site
_cache: Dict = {"articles": [], "last_fetched": 0}
CACHE_TTL = 300  # 5 minutes

RSS_URL = "https://feeds.skynews.com/feeds/rss/home.xml"
SITE_URL = "https://news.sky.com/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
}


async def fetch_sky_news() -> List[Dict]:
    """
    Fetch articles from Sky News via RSS feed.
    Returns list of: {title, category, url, image_url, timestamp, snippet}
    """
    now = time.time()
    if _cache["articles"] and (now - _cache["last_fetched"]) < CACHE_TTL:
        return _cache["articles"]

    # Try RSS feed first (most reliable)
    articles = await _fetch_rss()

    # Fallback to HTML scraping if RSS fails
    if not articles:
        articles = await _fetch_html()

    if articles:
        _cache["articles"] = articles
        _cache["last_fetched"] = now
        print(f"Sky News scraper: Fetched {len(articles)} articles")

    return articles if articles else _cache["articles"]


async def _fetch_rss() -> List[Dict]:
    """Fetch articles from Sky News RSS feed."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(RSS_URL, headers=HEADERS)

            if resp.status_code != 200:
                print(f"Sky News RSS: HTTP {resp.status_code}")
                return []

            soup = BeautifulSoup(resp.text, "xml")
            articles = []

            for item in soup.find_all("item"):
                title = item.find("title")
                link = item.find("link")
                description = item.find("description")
                pub_date = item.find("pubDate")

                if not title or not title.get_text(strip=True):
                    continue

                # Get image from enclosure or media:content
                image_url = ""
                enclosure = item.find("enclosure")
                if enclosure and enclosure.get("url"):
                    image_url = enclosure["url"]
                else:
                    media_content = item.find("media:content")
                    if media_content and media_content.get("url"):
                        image_url = media_content["url"]
                    else:
                        media_thumb = item.find("media:thumbnail")
                        if media_thumb and media_thumb.get("url"):
                            image_url = media_thumb["url"]

                # Extract category from URL path
                url = link.get_text(strip=True) if link else ""
                category = _extract_category(url)

                articles.append({
                    "title": title.get_text(strip=True),
                    "category": category,
                    "url": url,
                    "image_url": image_url,
                    "snippet": description.get_text(strip=True) if description else "",
                    "timestamp": pub_date.get_text(strip=True) if pub_date else "",
                })

            # Take top 20 articles
            return articles[:20]

    except Exception as e:
        print(f"Sky News RSS error: {e}")
        return []


async def _fetch_html() -> List[Dict]:
    """Fallback: scrape Sky News homepage HTML."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(SITE_URL, headers={
                **HEADERS,
                "Accept-Encoding": "gzip, deflate, br",
                "DNT": "1",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Cache-Control": "max-age=0",
            })

            if resp.status_code != 200:
                print(f"Sky News HTML scraper: HTTP {resp.status_code}")
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            articles = []

            # Pattern 1: article elements or story cards
            for item in soup.select("article, .sdc-site-tile, [data-component-name='sdc-site-tile'], .story-item, .sdc-news-card"):
                article = _parse_article(item)
                if article:
                    articles.append(article)

            # Pattern 2: heading links with parent containers
            if not articles:
                for heading in soup.select("h3 a, h2 a, .sdc-site-tile__headline a"):
                    title = heading.get_text(strip=True)
                    url = heading.get("href", "")
                    if url and not url.startswith("http"):
                        url = f"https://news.sky.com{url}"
                    if title and len(title) > 10:
                        parent = heading.find_parent("article") or heading.find_parent("div")
                        img = parent.find("img") if parent else None
                        image_url = ""
                        if img:
                            image_url = img.get("src") or img.get("data-src") or ""

                        category = ""
                        cat_el = parent.find(class_=lambda x: x and "label" in x.lower()) if parent else None
                        if cat_el:
                            category = cat_el.get_text(strip=True)

                        articles.append({
                            "title": title,
                            "category": category or "News",
                            "url": url,
                            "image_url": image_url,
                            "snippet": "",
                            "timestamp": "",
                        })

            # Deduplicate by title
            seen = set()
            unique = []
            for a in articles:
                if a["title"] not in seen:
                    seen.add(a["title"])
                    unique.append(a)

            return unique[:20]

    except Exception as e:
        print(f"Sky News HTML scraper error: {e}")
        return []


def _extract_category(url: str) -> str:
    """Extract category from a Sky News URL."""
    if not url:
        return "News"
    # URLs look like: https://news.sky.com/story/...
    # or https://news.sky.com/topic/...
    parts = url.replace("https://news.sky.com/", "").split("/")
    if parts and parts[0] in ("story", "topic", "video"):
        return "News"
    if parts and parts[0]:
        return parts[0].replace("-", " ").title()
    return "News"


def _parse_article(element) -> Optional[Dict]:
    """Parse a single article element from HTML."""
    headline_el = element.select_one("h3, h2, .sdc-site-tile__headline, [class*='headline']")
    if not headline_el:
        return None

    title = headline_el.get_text(strip=True)
    if not title or len(title) < 10:
        return None

    link = headline_el.find("a") or element.find("a")
    url = link.get("href", "") if link else ""
    if url and not url.startswith("http"):
        url = f"https://news.sky.com{url}"

    img = element.find("img")
    image_url = ""
    if img:
        image_url = img.get("src") or img.get("data-src") or img.get("srcset", "").split(",")[0].split(" ")[0] or ""

    category = ""
    cat_el = element.select_one("[class*='label'], [class*='category'], .sdc-site-tile__kicker")
    if cat_el:
        category = cat_el.get_text(strip=True)

    snippet = ""
    snippet_el = element.select_one("p, .sdc-site-tile__body, [class*='summary']")
    if snippet_el:
        snippet = snippet_el.get_text(strip=True)

    timestamp = ""
    time_el = element.find("time") or element.select_one("[class*='date'], [class*='time']")
    if time_el:
        timestamp = time_el.get("datetime") or time_el.get_text(strip=True)

    return {
        "title": title,
        "category": category or "News",
        "url": url,
        "image_url": image_url,
        "snippet": snippet,
        "timestamp": timestamp,
    }
