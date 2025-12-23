def test_register_success(client):
    response = client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "test@mail.com",
            "password": "123456",
            "role": "employee"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@mail.com"
    assert data["username"] == "testuser"
    assert "id" in data


def test_register_duplicate_email(client):
    client.post(
        "/auth/register",
        json={
            "username": "user1",
            "email": "dup@mail.com",
            "password": "123456",
            "role": "employee"
        }
    )

    response = client.post(
        "/auth/register",
        json={
            "username": "user2",
            "email": "dup@mail.com",
            "password": "123456",
            "role": "employee"
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


def test_register_duplicate_username(client):
    client.post(
        "/auth/register",
        json={
            "username": "sameuser",
            "email": "user1@mail.com",
            "password": "123456",
            "role": "employee"
        }
    )

    response = client.post(
        "/auth/register",
        json={
            "username": "sameuser",
            "email": "user2@mail.com",
            "password": "123456",
            "role": "employee"
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Username already taken"


def test_login_success(client):
    client.post(
        "/auth/register",
        json={
            "username": "loginuser",
            "email": "login@mail.com",
            "password": "123456",
            "role": "employee"
        }
    )

    response = client.post(
        "/auth/login",
        json={
            "email": "login@mail.com",
            "password": "123456"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={
            "username": "wrongpass",
            "email": "wrong@mail.com",
            "password": "123456",
            "role": "employee"
        }
    )

    response = client.post(
        "/auth/login",
        json={
            "email": "wrong@mail.com",
            "password": "wrongpass"
        }
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
