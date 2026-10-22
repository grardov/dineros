from datetime import date, timedelta


def last_corte(day: int) -> date:
    today = date.today()
    this_month = today.replace(day=day)
    if today > this_month:
        return this_month
    prev = this_month.replace(day=1) - timedelta(days=1)
    return prev.replace(day=day)


def test_users_only_see_and_touch_their_own_data(client, new_user) -> None:
    alice, bob = new_user(), new_user()

    assert client.get("/accounts/").status_code == 401

    debit = client.post(
        "/accounts/", headers=alice, json={"name": "Nómina", "type": "debit"}
    ).json()
    categories = client.get("/categories/", headers=alice).json()
    # Seeded on signup: 22 top-level categories, 36 subcategories under them.
    assert len([c for c in categories if c["parent_id"] is None]) == 22
    assert len([c for c in categories if c["parent_id"]]) == 36
    food = next(c for c in categories if c["name"] == "Restaurantes")
    cafe = next(c for c in categories if c["name"] == "Cafeterías")
    assert (cafe["parent_id"], cafe["kind"]) == (food["id"], "expense")

    # Bob sees nothing of Alice's and can't read, edit or delete it.
    assert client.get("/accounts/", headers=bob).json() == []
    assert client.get(f"/accounts/{debit['id']}", headers=bob).status_code == 404
    put = {"name": "hacked", "type": "debit"}
    assert client.put(f"/accounts/{debit['id']}", headers=bob, json=put).status_code == 404
    assert client.delete(f"/accounts/{debit['id']}", headers=bob).status_code == 404
    assert all(c["id"] != food["id"] for c in client.get("/categories/", headers=bob).json())

    # Nor can he book a transaction on her account or with her category.
    tx = {"kind": "expense", "amount": "10", "occurred_on": str(date.today())}
    r = client.post("/transactions/", headers=bob, json=tx | {"account_id": debit["id"]})
    assert r.status_code == 409
    own = client.post("/accounts/", headers=bob, json={"name": "B", "type": "cash"}).json()
    r = client.post(
        "/transactions/",
        headers=bob,
        json=tx | {"account_id": own["id"], "category_id": food["id"]},
    )
    assert r.status_code == 409


def test_credit_card_statement(client, new_user) -> None:
    h = new_user()
    debit = client.post(
        "/accounts/",
        headers=h,
        json={"name": "Nómina", "type": "debit", "opening_balance": "10000"},
    ).json()
    # Credit cards need corte and due day.
    assert (
        client.post("/accounts/", headers=h, json={"name": "TC", "type": "credit"}).status_code
        == 409
    )
    card = client.post(
        "/accounts/",
        headers=h,
        json={
            "name": "TC",
            "type": "credit",
            "credit_limit": "20000",
            "statement_day": 15,
            "payment_due_day": 5,
        },
    ).json()
    income = next(c for c in client.get("/categories/", headers=h).json() if c["kind"] == "income")

    corte = last_corte(15)
    base = {"amount": "1000", "account_id": card["id"]}
    # Category kind must match the transaction kind.
    bad = base | {"kind": "expense", "occurred_on": str(corte), "category_id": income["id"]}
    assert client.post("/transactions/", headers=h, json=bad).status_code == 409

    expense = base | {"kind": "expense", "occurred_on": str(corte - timedelta(days=2))}
    assert client.post("/transactions/", headers=h, json=expense).status_code == 201
    payment = {
        "kind": "transfer",
        "amount": "400",
        "occurred_on": str(corte + timedelta(days=1)),
        "account_id": debit["id"],
        "to_account_id": card["id"],
    }
    assert client.post("/transactions/", headers=h, json=payment).status_code == 201

    statements = client.get(f"/accounts/{card['id']}/statements/", headers=h).json()
    s = next(s for s in statements if s["statement_date"] == str(corte))
    assert s["is_closed"]
    assert s["due_date"] == str((corte.replace(day=1) + timedelta(days=32)).replace(day=5))
    assert (s["charges"], s["statement_balance"], s["payments"], s["pending"]) == (
        "1000.00",
        "1000.00",
        "400.00",
        "600.00",
    )

    balances = {b["account_id"]: b for b in client.get("/accounts/balances/", headers=h).json()}
    assert balances[debit["id"]]["balance"] == "9600.00"
    assert balances[card["id"]]["balance"] == "-600.00"
    assert balances[card["id"]]["available_credit"] == "19400.00"

    # The payment appears in both accounts' history.
    for account in (debit, card):
        txs = client.get("/transactions/", headers=h, params={"account_id": account["id"]}).json()
        assert any(t["kind"] == "transfer" for t in txs)


def test_category_icons(client, new_user) -> None:
    h = new_user()
    seeded = client.get("/categories/", headers=h).json()
    assert next(c for c in seeded if c["name"] == "Mascotas")["icon"] == "🐶"

    created = client.post(
        "/categories/", headers=h, json={"name": "Café", "kind": "expense", "icon": "☕"}
    ).json()
    assert created["icon"] == "☕"
    put = {"name": "Café", "kind": "expense", "icon": None}
    assert client.put(f"/categories/{created['id']}", headers=h, json=put).json()["icon"] is None
