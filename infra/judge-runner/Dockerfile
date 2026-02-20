FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm php-cli \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
