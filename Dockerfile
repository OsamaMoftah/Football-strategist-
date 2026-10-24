FROM node:22-bookworm-slim AS build
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.5 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM python:3.12-slim-bookworm AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=7860 HOSTNAME=0.0.0.0
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libstdc++6 && rm -rf /var/lib/apt/lists/* && useradd --create-home --uid 1000 node
COPY --from=build /usr/local/bin/node /usr/local/bin/node
COPY pipeline/requirements*.txt ./pipeline/
RUN python -m venv /opt/native && /opt/native/bin/pip install --no-cache-dir -r pipeline/requirements-server.txt
ENV PATH="/opt/native/bin:$PATH" NATIVE_API_URL=http://127.0.0.1:8000 PYTHONUNBUFFERED=1
COPY --chown=node:node pipeline/ ./pipeline/
COPY --chown=node:node scripts/start-services.py ./scripts/start-services.py
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:7860').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["python", "scripts/start-services.py"]
