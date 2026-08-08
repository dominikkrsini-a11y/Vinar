# Cursor Cloud Agent base image for Vinar (Expo app + server/).
# Do not COPY the project — the agent checks out the commit at build time.
FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    sudo \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Non-root user used by many cloud agent workflows
RUN id -u ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu \
    && usermod -aG sudo ubuntu \
    && echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu \
    && chmod 0440 /etc/sudoers.d/ubuntu

WORKDIR /workspace
