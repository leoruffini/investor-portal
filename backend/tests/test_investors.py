import pytest
from tests.conftest import requires_tables


@requires_tables
@pytest.mark.anyio
async def test_create_investor(client):
    resp = await client.post("/investors/", json={
        "name": "VENTU EUROPE S.L.",
        "email": "ventu-test@example.com",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "VENTU EUROPE S.L."
    assert data["email"] == "ventu-test@example.com"
    assert "id" in data
    # identity-only: no status, token, or promotion_id
    assert "status" not in data
    assert "token" not in data
    assert "promotion_id" not in data

    # Cleanup
    await client.delete(f"/investors/{data['id']}")


@requires_tables
@pytest.mark.anyio
async def test_list_investors_by_email(client, investor):
    resp = await client.get("/investors/", params={"email": "test-fixture@example.com"})
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) >= 1
    assert results[0]["email"] == "test-fixture@example.com"


@requires_tables
@pytest.mark.anyio
async def test_get_investor(client, investor):
    resp = await client.get(f"/investors/{investor['id']}")
    assert resp.status_code == 200
    assert resp.json()["email"] == "test-fixture@example.com"


@requires_tables
@pytest.mark.anyio
async def test_get_investor_not_found(client):
    resp = await client.get("/investors/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@requires_tables
@pytest.mark.anyio
async def test_update_investor_name(client, investor):
    resp = await client.patch(f"/investors/{investor['id']}", json={
        "name": "Updated Name S.L.",
    })
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name S.L."
