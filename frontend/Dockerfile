FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

FROM builder AS ci

# CI-only stage: `npm ci` above already installs devDependencies (eslint, vitest, etc.),
# so this stage just provides the image used to run lint/test commands via `docker run`.
# Not used by the `dev` runtime stage below.

FROM builder AS dev

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]