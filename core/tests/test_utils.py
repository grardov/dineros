def test_health_check_requires_auth(client, new_user) -> None:
    assert client.get("/utils/health-check/").status_code == 401
    bad = {"Authorization": "Bearer not-a-jwt"}
    assert client.get("/utils/health-check/", headers=bad).status_code == 401

    r = client.get("/utils/health-check/", headers=new_user())
    assert r.status_code == 200
    assert r.json() is True
