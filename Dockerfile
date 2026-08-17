FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# La cartella data/ viene montata come volume per persistere il diario
# tra un riavvio e l'altro del container.
RUN mkdir -p /app/data

ENV PORT=3020
EXPOSE 3020

CMD ["node", "server.js"]
