FROM node:20-bullseye

# Install compilers/runtimes needed by languages.js
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
