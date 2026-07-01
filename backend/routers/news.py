from fastapi import APIRouter, HTTPException
from models.schemas import NewsRequest, NewsResponse, VideoResult
from services.news_engine import generate_news
from services.video_fetcher import search_video
from services.news_scraper import fetch_sky_news

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "sky-news-interactive"}


@router.post("/news/search", response_model=NewsResponse)
async def search_news(request: NewsRequest):
    """Process a news query and return structured news data."""
    try:
        result = await generate_news(query=request.query, context=request.context or "")
        return NewsResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"News generation failed: {str(e)}")


@router.post("/video/search", response_model=VideoResult)
async def search_video_endpoint(request: dict):
    """Search for a relevant video based on the search term."""
    search_term = request.get("search_term", "")
    if not search_term:
        raise HTTPException(status_code=400, detail="search_term is required")

    try:
        result = await search_video(search_term=search_term)
        return VideoResult(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video search failed: {str(e)}")


@router.get("/news/feed")
async def get_news_feed():
    """Get latest articles from Sky News."""
    articles = await fetch_sky_news()
    return {"articles": articles, "count": len(articles)}
