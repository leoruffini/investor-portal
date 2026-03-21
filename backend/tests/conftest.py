"""
Shared fixtures for backend tests.

Tests run against the real Supabase instance (reads .env).
They create and clean up their own data.
"""

import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv
from httpx import ASGITransport, AsyncClient

# Load .env from project root before importing app
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

# Ensure backend modules are importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app  # noqa: E402


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def promotion(client: AsyncClient):
    """Create a promotion and clean up after test."""
    resp = await client.post("/promotions/", json={
        "name": "Test Promo",
        "description": "Created by pytest",
    })
    data = resp.json()
    yield data
    await client.delete(f"/promotions/{data['id']}")


@pytest.fixture
async def investor(client: AsyncClient, promotion: dict):
    """Create an investor (cascade-deleted with promotion)."""
    resp = await client.post("/investors/", json={
        "promotion_id": promotion["id"],
        "name": "Test Investor S.L.",
        "email": "test@example.com",
        "investment_amount": 240000,
        "ownership_pct": 10.0,
    })
    return resp.json()
