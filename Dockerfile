# Build the workspace application with `pnpm build` before building this image.
FROM ghcr.io/static-web-server/static-web-server:2
ENV SERVER_PORT=3000 \
    SERVER_ROOT=/app/dist \
    SERVER_FALLBACK_PAGE=/app/dist/index.html \
    SERVER_CONFIG_FILE=/app/sws.toml
COPY dist /app/dist
COPY sws.toml /app/sws.toml
USER 1000:1000
EXPOSE 3000
