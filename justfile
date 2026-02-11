schema:
	rm -rf ./app/src/api/schema.d.ts
	pnpm dlx openapi-typescript http://0.0.0.0:8000/api/schema/ -o ./frontend/api/schema.d.ts

local-up:
	docker compose up

local-up-build:
	docker compose up --build

local-build:
	docker compose build

local-down:
	docker compose down