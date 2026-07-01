import httpx
from bs4 import BeautifulSoup
import time
from typing import List, Dict

# Cache articles for 5 minutes to avoid hammering the site
_cache: Dict = {"articles": [], "last_fetched": 0}
CACHE_TTL = 300  # 5 minutes


async def fetch_sky_news() -> List[Dict]:
    """
    Fetch articles from https://news.sky.com/
    Returns list of: {title, category, url, image_url, timestamp, snippet}
    """
    now = time.time()
    if _cache["articles"] and (now - _cache["last_fetched"]) < CACHE_TTL:
        return _cache["articles"]

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get("https://news.sky.com/", headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            })

            if resp.status_code != 200:
                print(f"Sky News scraper: HTTP {resp.status_code}")
                return _cache["articles"]  # Return stale cache on error

            soup = BeautifulSoup(resp.text, "html.parser")
            articles = []

            # Sky News uses various article card patterns. Try multiple selectors:
            # Look for article/story elements with headlines and images

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
                        # Try to find associated image
                        parent = heading.find_parent("article") or heading.find_parent("div")
                        img = parent.find("img") if parent else None
                        image_url = ""
                        if img:
                            image_url = img.get("src") or img.get("data-src") or ""

                        # Try to find category
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

            # Take top 20 articles
            articles = unique[:20]

            if articles:
                _cache["articles"] = articles
                _cache["last_fetched"] = now
                print(f"Sky News scraper: Fetched {len(articles)} articles")

            return articles

    except Exception as e:
        print(f"Sky News scraper error: {e}")
        return _cache["articles"]


def _parse_article(element) -> Dict | None:
    """Parse a single article element."""
    # Try to find headline
    headline_el = element.select_one("h3, h2, .sdc-site-tile__headline, [class*='headline']")
    if not headline_el:
        return None

    title = headline_el.get_text(strip=True)
    if not title or len(title) < 10:
        return None

    # URL
    link = headline_el.find("a") or element.find("a")
    url = link.get("href", "") if link else ""
    if url and not url.startswith("http"):
        url = f"https://news.sky.com{url}"

    # Image
    img = element.find("img")
    image_url = ""
    if img:
        image_url = img.get("src") or img.get("data-src") or img.get("srcset", "").split(",")[0].split(" ")[0] or ""

    # Category/label
    category = ""
    cat_el = element.select_one("[class*='label'], [class*='category'], .sdc-site-tile__kicker")
    if cat_el:
        category = cat_el.get_text(strip=True)

    # Snippet
    snippet = ""
    snippet_el = element.select_one("p, .sdc-site-tile__body, [class*='summary']")
    if snippet_el:
        snippet = snippet_el.get_text(strip=True)

    # Timestamp
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
