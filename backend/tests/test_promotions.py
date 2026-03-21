import pytest
from tests.conftest import requires_tables


@requires_tables
@pytest.mark.anyio
async def test_create_promotion(client):
    resp = await client.post("/promotions/", json={
        "name": "Cala Corb Test",
        "description": "pytest promo",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Cala Corb Test"
    assert "id" in data

    # Cleanup
    await client.delete(f"/promotions/{data['id']}")


@requires_tables
@pytest.mark.anyio
async def test_list_promotions(client, promotion):
    resp = await client.get("/promotions/")
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert promotion["id"] in ids


@requires_tables
@pytest.mark.anyio
async def test_get_promotion(client, promotion):
    resp = await client.get(f"/promotions/{promotion['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Promo"


@requires_tables
@pytest.mark.anyio
async def test_get_promotion_not_found(client):
    resp = await client.get("/promotions/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@requires_tables
@pytest.mark.anyio
async def test_update_promotion(client, promotion):
    resp = await client.patch(f"/promotions/{promotion['id']}", json={
        "name": "Updated Name",
    })
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"


@requires_tables
@pytest.mark.anyio
async def test_delete_promotion(client):
    # Create then delete
    resp = await client.post("/promotions/", json={"name": "To Delete"})
    pid = resp.json()["id"]
    resp = await client.delete(f"/promotions/{pid}")
    assert resp.status_code == 204

    resp = await client.get(f"/promotions/{pid}")
    assert resp.status_code == 404
