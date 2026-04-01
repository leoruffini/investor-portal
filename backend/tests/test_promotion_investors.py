import pytest
from tests.conftest import requires_tables


@requires_tables
@pytest.mark.anyio
async def test_create_enrollment(client, promotion):
    resp = await client.post("/promotion-investors/", json={
        "promotion_id": promotion["id"],
        "name": "New Enrolled S.L.",
        "email": "new-enrolled@example.com",
        "cif": "B11111111",
        "investment_amount": 100000,
        "ownership_pct": 5.0,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending"
    assert data["token"] is not None
    assert data["investor_id"] is not None
    assert data["promotion_id"] == promotion["id"]
    assert data["investment_amount"] == 100000

    # Cleanup investor (enrollment cascade-deletes with promotion)
    await client.delete(f"/investors/{data['investor_id']}")


@requires_tables
@pytest.mark.anyio
async def test_create_enrollment_reuses_existing_investor(client, promotion, investor):
    """If an investor with the same CIF already exists, reuse their identity."""
    resp = await client.post("/promotion-investors/", json={
        "promotion_id": promotion["id"],
        "name": investor["name"],
        "email": investor["email"],
        "cif": investor["cif"],
        "investment_amount": 50000,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["investor_id"] == investor["id"]


@requires_tables
@pytest.mark.anyio
async def test_create_enrollment_duplicate_409(client, promotion, enrollment):
    """Same investor (by CIF) + same promotion should return 409."""
    resp = await client.post("/promotion-investors/", json={
        "promotion_id": promotion["id"],
        "name": "Enrolled Investor S.L.",
        "email": "test-enrollment@example.com",
        "cif": "B88888888",
    })
    assert resp.status_code == 409


@requires_tables
@pytest.mark.anyio
async def test_list_enrollments_by_promotion(client, promotion, enrollment):
    resp = await client.get("/promotion-investors/", params={"promotion_id": promotion["id"]})
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) >= 1
    # Should include enriched investor fields
    assert results[0]["investor_name"] == "Enrolled Investor S.L."
    assert results[0]["investor_email"] == "test-enrollment@example.com"
    assert results[0]["investor_cif"] == "B88888888"


@requires_tables
@pytest.mark.anyio
async def test_get_enrollment_by_token(client, enrollment):
    resp = await client.get("/promotion-investors/", params={"token": enrollment["token"]})
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["id"] == enrollment["id"]


@requires_tables
@pytest.mark.anyio
async def test_get_enrollment_by_id(client, enrollment):
    resp = await client.get(f"/promotion-investors/{enrollment['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == enrollment["id"]
    assert data["investor_name"] == "Enrolled Investor S.L."


@requires_tables
@pytest.mark.anyio
async def test_update_enrollment(client, enrollment):
    resp = await client.patch(f"/promotion-investors/{enrollment['id']}", json={
        "investment_amount": 300000,
    })
    assert resp.status_code == 200
    assert resp.json()["investment_amount"] == 300000


@requires_tables
@pytest.mark.anyio
async def test_delete_enrollment(client, promotion):
    # Create then delete
    resp = await client.post("/promotion-investors/", json={
        "promotion_id": promotion["id"],
        "name": "To Delete S.L.",
        "email": "to-delete@example.com",
        "cif": "B77777777",
    })
    enr = resp.json()

    resp = await client.delete(f"/promotion-investors/{enr['id']}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"

    # Verify gone
    resp = await client.get(f"/promotion-investors/{enr['id']}")
    assert resp.status_code == 404

    # Cleanup investor
    await client.delete(f"/investors/{enr['investor_id']}")


@requires_tables
@pytest.mark.anyio
async def test_create_enrollment_same_email_different_cif(client, promotion):
    """Two companies with same contact email but different CIFs are separate investors."""
    resp1 = await client.post("/promotion-investors/", json={
        "promotion_id": promotion["id"],
        "name": "Company A S.L.",
        "email": "shared@example.com",
        "cif": "B11110001",
        "investment_amount": 100000,
    })
    assert resp1.status_code == 201

    resp2 = await client.post("/promotion-investors/", json={
        "promotion_id": promotion["id"],
        "name": "Company B S.L.",
        "email": "shared@example.com",
        "cif": "B11110002",
        "investment_amount": 200000,
    })
    assert resp2.status_code == 201

    # Different investor IDs despite same email
    assert resp1.json()["investor_id"] != resp2.json()["investor_id"]

    # Cleanup
    await client.delete(f"/investors/{resp1.json()['investor_id']}")
    await client.delete(f"/investors/{resp2.json()['investor_id']}")


@requires_tables
@pytest.mark.anyio
async def test_list_enrollments_requires_filter(client):
    """GET /promotion-investors/ without params should return 400."""
    resp = await client.get("/promotion-investors/")
    assert resp.status_code == 400
