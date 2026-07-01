import httpx
import re
import urllib.parse


async def search_video(search_term: str) -> dict:
    """Search for a video and return embed URL and metadata.
    
    Searches YouTube for a real video ID and returns a proper embed URL
    in the format https://www.youtube.com/embed/VIDEO_ID (no query params).
    The frontend appends autoplay/mute params separately.
    """
    encoded_term = urllib.parse.quote_plus(search_term)

    video_id = ""
    video_url = ""
    thumbnail = ""
    title = search_term

    try:
        search_url = f"https://www.youtube.com/results?search_query={encoded_term}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Extract first video ID from YouTube search results page
            response = await client.get(
                search_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                follow_redirects=True,
            )

            if response.status_code == 200:
                text = response.text
                # Extract first video ID from the page
                match = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', text)
                if match:
                    video_id = match.group(1)
                    # Return clean embed URL — NO query params (frontend adds them)
                    video_url = f"https://www.youtube.com/embed/{video_id}"
                    thumbnail = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

                    # Try to get title via oEmbed
                    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
                    oembed_resp = await client.get(oembed_url)
                    if oembed_resp.status_code == 200:
                        oembed_data = oembed_resp.json()
                        title = oembed_data.get("title", search_term)

    except Exception:
        pass

    # Fallback: if no video ID found, use search-based embed (less reliable for autoplay)
    if not video_url:
        video_url = f"https://www.youtube.com/embed?listType=search&list={encoded_term}"

    return {
        "video_url": video_url,
        "video_id": video_id,
        "thumbnail": thumbnail,
        "title": title,
    }
