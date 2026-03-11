# API Usage Examples

All authenticated requests use cookie sessions (`credentials: include`).
For mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) send `X-CSRF-Token` from `GET /api/bootstrap.php`.

Base URL examples assume local dev:
- Frontend dev proxy: `http://127.0.0.1:5173`
- Direct backend: `http://127.0.0.1/api`

## Bootstrap

```bash
curl -X GET "http://127.0.0.1/api/bootstrap.php"
```

## Login / Logout

```bash
curl -X POST "http://127.0.0.1/api/login.php" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

curl -X POST "http://127.0.0.1/api/logout.php" \
  -H "X-CSRF-Token: <csrf-token>"
```

## Orders

```bash
curl -X GET "http://127.0.0.1/api/orders.php"

curl -X POST "http://127.0.0.1/api/orders.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d @examples/orders.create.request.json

curl -X PUT "http://127.0.0.1/api/orders.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d @examples/orders.update.request.json

curl -X PATCH "http://127.0.0.1/api/orders.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{"id":101,"status":"delivered"}'

curl -X DELETE "http://127.0.0.1/api/orders.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{"id":101}'
```

## Catalog / Profile

```bash
curl -X GET "http://127.0.0.1/api/catalog.php"

curl -X POST "http://127.0.0.1/api/catalog.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d @examples/catalog.save.request.json

curl -X GET "http://127.0.0.1/api/profile.php"

curl -X POST "http://127.0.0.1/api/profile.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{"brandName":"Sitra"}'
```

## Users and Permissions

```bash
curl -X GET "http://127.0.0.1/api/users.php"

curl -X POST "http://127.0.0.1/api/users.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{"username":"manager1","password":"secret123","role":"manager"}'

curl -X PUT "http://127.0.0.1/api/users.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{"id":2,"role":"sales"}'

curl -X PATCH "http://127.0.0.1/api/users.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{"id":2,"isActive":false}'

curl -X GET "http://127.0.0.1/api/role_permissions.php"

curl -X POST "http://127.0.0.1/api/role_permissions.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{"rolePermissions":{"sales":["sales.orders.read"]}}'
```

## Owner Controls and Audit

```bash
curl -X GET "http://127.0.0.1/api/module_registry.php"

curl -X PATCH "http://127.0.0.1/api/module_registry.php" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{"moduleId":"master-data","enabled":false}'

curl -X GET "http://127.0.0.1/api/audit_logs.php?page=1&pageSize=20"
```

## Upload Endpoints

```bash
curl -X POST "http://127.0.0.1/api/upload.php" \
  -H "X-CSRF-Token: <csrf-token>" \
  -F "patternFile=@C:/path/to/file.png"

curl -X POST "http://127.0.0.1/api/upload_logo.php" \
  -H "X-CSRF-Token: <csrf-token>" \
  -F "logoFile=@C:/path/to/logo.png"
```

## HTTPie Equivalents

```bash
http GET http://127.0.0.1/api/bootstrap.php
http POST http://127.0.0.1/api/login.php username=admin password=admin123
http POST http://127.0.0.1/api/logout.php X-CSRF-Token:<csrf-token>
http GET http://127.0.0.1/api/orders.php
http POST http://127.0.0.1/api/orders.php X-CSRF-Token:<csrf-token> < examples/orders.create.request.json
http PUT http://127.0.0.1/api/orders.php X-CSRF-Token:<csrf-token> < examples/orders.update.request.json
http PATCH http://127.0.0.1/api/orders.php X-CSRF-Token:<csrf-token> id:=101 status=delivered
http DELETE http://127.0.0.1/api/orders.php X-CSRF-Token:<csrf-token> id:=101
http GET http://127.0.0.1/api/catalog.php
http POST http://127.0.0.1/api/catalog.php X-CSRF-Token:<csrf-token> < examples/catalog.save.request.json
http GET http://127.0.0.1/api/profile.php
http POST http://127.0.0.1/api/profile.php X-CSRF-Token:<csrf-token> brandName=Sitra
http GET http://127.0.0.1/api/users.php
http POST http://127.0.0.1/api/users.php X-CSRF-Token:<csrf-token> username=manager1 password=secret123 role=manager
http PUT http://127.0.0.1/api/users.php X-CSRF-Token:<csrf-token> id:=2 role=sales
http PATCH http://127.0.0.1/api/users.php X-CSRF-Token:<csrf-token> id:=2 isActive:=false
http GET http://127.0.0.1/api/role_permissions.php
http POST http://127.0.0.1/api/role_permissions.php X-CSRF-Token:<csrf-token> rolePermissions:='{\"sales\":[\"sales.orders.read\"]}'
http GET http://127.0.0.1/api/module_registry.php
http PATCH http://127.0.0.1/api/module_registry.php X-CSRF-Token:<csrf-token> moduleId=master-data enabled:=false
http GET 'http://127.0.0.1/api/audit_logs.php?page=1&pageSize=20'
```
