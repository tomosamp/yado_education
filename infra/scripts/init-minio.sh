#!/bin/sh
set -eu

retries=30
until mc alias set local http://minio:9000 minioadmin minioadmin >/dev/null 2>&1; do
  retries=$((retries - 1))
  if [ "$retries" -le 0 ]; then
    echo "MinIO initialization failed: timeout waiting for service" >&2
    exit 1
  fi
  sleep 2
done

mc mb --ignore-existing local/yado-education
mc anonymous set private local/yado-education
