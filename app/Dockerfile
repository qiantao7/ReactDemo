FROM public.ecr.aws/docker/library/node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN mkdir -p /app/public/uploads

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx next start -H 0.0.0.0 -p 3000"]
