# Build the React/Vite UI
FROM node:20-alpine AS ui-builder
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./

# Firebase config is baked into the Vite bundle at build time via VITE_* env vars
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

RUN npm run build

# Build the Go Backend
FROM golang:1.25 AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# Final production image
FROM alpine:latest
# Install CA certificates to make outgoing HTTPS requests (e.g. Gemini API)
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy the server binary
COPY --from=backend-builder /server /app/server

# Copy the built UI into the expected path so the Go server can serve it
COPY --from=ui-builder /app/ui/dist /app/ui/dist

# Ensure the prompts folder is copied over for ADK to use
COPY prompts /app/prompts

EXPOSE 8080

CMD ["/app/server"]
