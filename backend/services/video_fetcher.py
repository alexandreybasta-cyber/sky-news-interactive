import httpx
import urllib.parse


async def search_video(search_term: str) -> dict:
    """Search for a video and return embed URL and metadata.
    
    Uses YouTube's embed search feature for MVP demo.
    Constructs an embed URL that auto-plays search results.
    """
    encoded_term = urllib.parse.quote_plus(search_term)

    # Construct YouTube embed URL that plays search results
    video_url = f"https://www.youtube.com/embed?listType=search&list={encoded_term}"

    # Try to get a thumbnail and video ID via YouTube oEmbed
    video_id = ""
    thumbnail = ""
    title = search_term

    try:
        # Use YouTube search URL to find a video via oEmbed
        search_url = f"https://www.youtube.com/results?search_query={encoded_term}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try to extract first video ID from search results page
            response = await client.get(
                search_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                },
                follow_redirects=True,
            )

            if response.status_code == 200:
                text = response.text
                # Extract first video ID from the page
                import re
                match = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', text)
                if match:
                    video_id = match.group(1)
                    video_url = f"https://www.youtube.com/embed/{video_id}?autoplay=1"
                    thumbnail = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

                    # Try to get title via oEmbed
                    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
                    oembed_resp = await client.get(oembed_url)
                    if oembed_resp.status_code == 200:
                        oembed_data = oembed_resp.json()
                        title = oembed_data.get("title", search_term)

    except Exception:
        # Fallback: use the search-based embed URL
        video_url = f"https://www.youtube.com/embed?listType=search&list={encoded_term}"
        thumbnail = ""
        video_id = ""
        title = search_term

    return {
        "video_url": video_url,
        "video_id": video_id,
        "thumbnail": thumbnail,
        "title": title,
    }
