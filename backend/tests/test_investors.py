import pytest
from tests.conftest import requires_tables


@requires_tables
@pytest.mark.anyio
async def test_create_investor(client, promotion):
    resp = await client.post("/investors/", json={
        "promotion_id": promotion["id"],
        "name": "VENTU EUROPE S.L.",
        "email": "ventu@example.com",
        "investment_amount": 240000,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "VENTU EUROPE S.L."
    assert data["status"] == "pending"
    assert data["token"] is not None


@requires_tables
@pytest.mark.anyio
async def test_list_investors_by_promotion(client, promotion, investor):
    resp = await client.get("/investors/", params={"promotion_id": promotion["id"]})
    assert resp.status_code == 200
    ids = [i["id"] for i in resp.json()]
    assert investor["id"] in ids


@requires_tables
@pytest.mark.anyio
async def test_get_investor(client, investor):
    resp = await client.get(f"/investors/{investor['id']}")
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


@requires_tables
@pytest.mark.anyio
async def test_get_investor_not_found(client):
    resp = await client.get("/investors/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@requires_tables
@pytest.mark.anyio
async def test_update_investor_status(client, investor):
    resp = await client.patch(f"/investors/{investor['id']}", json={
        "status": "docs_uploaded",
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "docs_uploaded"
