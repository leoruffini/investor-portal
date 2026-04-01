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

from db import supabase as sb  # noqa: E402
from main import app  # noqa: E402


def _tables_exist() -> bool:
    """Check if the promotions table exists in Supabase."""
    try:
        sb.table("promotions").select("id").limit(1).execute()
        return True
    except Exception:
        return False


tables_ready = _tables_exist()
requires_tables = pytest.mark.skipif(
    not tables_ready,
    reason="Supabase tables not created yet — run backend/db/init.sql first",
)


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
async def investor(client: AsyncClient):
    """Create an identity-only investor and clean up after test."""
    resp = await client.post("/investors/", json={
        "name": "Test Investor S.L.",
        "email": "test-fixture@example.com",
        "cif": "B99999999",
    })
    data = resp.json()
    yield data
    await client.delete(f"/investors/{data['id']}")


@pytest.fixture
async def enrollment(client: AsyncClient, promotion: dict):
    """Create an enrollment (auto-creates investor) and clean up after test."""
    resp = await client.post("/promotion-investors/", json={
        "promotion_id": promotion["id"],
        "name": "Enrolled Investor S.L.",
        "email": "test-enrollment@example.com",
        "cif": "B88888888",
        "investment_amount": 240000,
        "ownership_pct": 10.0,
    })
    data = resp.json()
    yield data
    # Enrollment is cascade-deleted when promotion is deleted.
    # Clean up the auto-created investor separately.
    try:
        await client.delete(f"/investors/{data['investor_id']}")
    except Exception:
        pass
