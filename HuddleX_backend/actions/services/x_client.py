import os
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()


class XApiError(Exception):
    pass


class XClient:
    BASE_URL = "https://api.x.com/2"

    def __init__(self, bearer_token: Optional[str] = None):
        self.bearer_token = bearer_token or os.getenv("X_BEARER_TOKEN")
        if not self.bearer_token:
            raise XApiError("Missing X_BEARER_TOKEN in .env")

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.bearer_token}",
            "User-Agent": "HuddleX-Hackathon/1.0",
        }

    async def _get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.BASE_URL}{path}"
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.get(url, headers=self.headers, params=params)

        if res.status_code >= 400:
            raise XApiError(f"X API error {res.status_code}: {res.text}")

        return res.json()

    async def get_user_by_username(self, username: str) -> Dict[str, Any]:
        username = username.strip().lstrip("@")

        params = {
            "user.fields": ",".join(
                [
                    "id",
                    "name",
                    "username",
                    "description",
                    "profile_image_url",
                    "public_metrics",
                    "verified",
                    "created_at",
                    "url",
                    "location",
                ]
            )
        }

        data = await self._get(f"/users/by/username/{username}", params=params)

        if "data" not in data:
            raise XApiError(f"No user data returned for @{username}: {data}")

        return data["data"]

    async def get_user_posts(
        self,
        user_id: str,
        max_results: int = 30,
        pagination_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        # X user timeline endpoint accepts bounded max_results; keep it safe.
        max_results = max(5, min(max_results, 100))

        params = {
            "max_results": str(max_results),
            "tweet.fields": ",".join(
                [
                    "id",
                    "text",
                    "created_at",
                    "public_metrics",
                    "lang",
                    "conversation_id",
                    "referenced_tweets",
                ]
            ),
            "exclude": "retweets,replies",
        }

        if pagination_token:
            params["pagination_token"] = pagination_token

        return await self._get(f"/users/{user_id}/tweets", params=params)

    async def fetch_creator_posts_by_handle(
        self,
        handle: str,
        max_results: int = 30,
    ) -> Dict[str, Any]:
        profile = await self.get_user_by_username(handle)
        posts_response = await self.get_user_posts(
            user_id=profile["id"],
            max_results=max_results,
        )

        return {
            "source": "x_api_v2",
            "profile": profile,
            "posts": posts_response.get("data", []),
            "meta": posts_response.get("meta", {}),
        }
