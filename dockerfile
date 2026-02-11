FROM astral/uv:python3.12-bookworm-slim as django-runner

WORKDIR /app

COPY src/ .

RUN uv sync


FROM node:22-slim as frontend-runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY frontend/ ./

ARG NEXT_PUBLIC_BACKEND_API_URL
ENV NEXT_PUBLIC_BACKEND_API_URL=$NEXT_PUBLIC_BACKEND_API_URL

RUN pnpm build