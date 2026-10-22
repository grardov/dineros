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


def test_card_added_after_its_corte(client, new_user) -> None:
    """A card added mid-period: its debt is part last corte, part charges since (the AMEX case)."""
    h = new_user()
    corte = date.today() - timedelta(days=3)
    debit = client.post(
        "/accounts/",
        headers=h,
        json={"name": "Nómina", "type": "debit", "opening_balance": "50000"},
    ).json()
    card = {
        "name": "AMEX",
        "type": "credit",
        "opening_balance": "-9978.87",
        "last_statement_pending": "8403.06",
        "statement_day": corte.day,
        "payment_due_day": corte.day,  # same day → due next month, after today
    }
    # The pending part of the last corte can't exceed the whole debt.
    too_much = card | {"last_statement_pending": "10000"}
    assert client.post("/accounts/", headers=h, json=too_much).status_code == 409
    card = client.post("/accounts/", headers=h, json=card).json()

    def statements():
        rows = client.get(f"/accounts/{card['id']}/statements/", headers=h).json()
        return {s["statement_date"]: s for s in rows}

    last, current = (
        statements()[str(corte)],
        next(s for s in statements().values() if not s["is_closed"]),
    )
    assert (last["statement_balance"], last["pending"]) == ("8403.06", "8403.06")
    assert current["charges"] == "1575.81"

    # Paying what AMEX asks for settles that corte.
    payment = {
        "kind": "transfer",
        "amount": "8403.06",
        "occurred_on": str(date.today()),
        "account_id": debit["id"],
        "to_account_id": card["id"],
    }
    assert client.post("/transactions/", headers=h, json=payment).status_code == 201
    assert statements()[str(corte)]["pending"] == "0.00"


def test_recurring(client, new_user) -> None:
    """Fijos project this month and next; a linked transaction marks a month as paid."""
    h, other = new_user(), new_user()
    this_month = date.today().replace(day=1)
    next_month = (this_month + timedelta(days=32)).replace(day=1)
    two_ago = (this_month - timedelta(days=32)).replace(day=1)
    last_month = (this_month - timedelta(days=1)).replace(day=1)
    debit = client.post(
        "/accounts/",
        headers=h,
        json={"name": "Nómina", "type": "debit", "opening_balance": "90000"},
    ).json()
    corte = date.today() - timedelta(days=3)
    card = client.post(
        "/accounts/",
        headers=h,
        json={
            "name": "AMEX",
            "type": "credit",
            "opening_balance": "-9978.87",
            "last_statement_pending": "8403.06",
            "statement_day": corte.day,
            "payment_due_day": corte.day,
        },
    ).json()

    def fijo(**body):
        base = {"account_id": debit["id"], "day_of_month": 1, "starts_on": str(two_ago)}
        r = client.post("/recurring/", headers=h, json=base | body)
        assert r.status_code == 201, r.text
        return r.json()

    rent = fijo(name="Renta", kind="expense", amount="9500")
    luz = fijo(name="Luz", kind="expense", amount="600", is_variable=True)
    amex = fijo(name="Pago AMEX", kind="transfer", to_account_id=card["id"], day_of_month=corte.day)
    # Only a card payment can leave the amount out.
    no_amount = {"name": "?", "kind": "expense", "account_id": debit["id"], "day_of_month": 1}
    assert (
        client.post(
            "/recurring/", headers=h, json=no_amount | {"starts_on": str(this_month)}
        ).status_code
        == 409
    )

    def pay(r, amount, month):
        tx = {
            "kind": r["kind"],
            "amount": amount,
            "occurred_on": str(month),
            "account_id": debit["id"],
            "recurring_id": r["id"],
            "recurring_period": str(month),
        }
        assert client.post("/transactions/", headers=h, json=tx).status_code == 201

    pay(rent, "9500", this_month)
    pay(luz, "800", two_ago)
    pay(luz, "1000", last_month)

    occurrences = client.get("/recurring/occurrences/", headers=h).json()
    by = {(o["recurring_id"], o["month"]): o for o in occurrences}
    assert by[(rent["id"], str(this_month))]["status"] == "paid"
    assert by[(rent["id"], str(next_month))]["status"] == "pending"
    # Variable: the average of its last paid months.
    assert by[(luz["id"], str(next_month))]["expected_amount"] == "900.00"
    assert by[(luz["id"], str(next_month))]["is_estimate"]
    # Card payment: the statement due next month, i.e. what's left of the last corte.
    assert by[(amex["id"], str(next_month))]["expected_amount"] == "8403.06"

    assert client.get("/recurring/", headers=other).json() == []
    assert client.get("/recurring/occurrences/", headers=other).json() == []
