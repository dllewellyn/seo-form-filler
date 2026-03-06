# Build the React/Vite UI
FROM node:18-alpine AS ui-builder
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

# Build the Go Backend
FROM golang:1.24 AS backend-builder
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
