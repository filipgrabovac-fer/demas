schema:
	rm -rf ./app/src/api/schema.d.ts
	pnpm dlx openapi-typescript http://0.0.0.0:8000/api/schema/ -o ./frontend/api/schema.d.ts
