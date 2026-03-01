FROM golang:1.24 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM alpine:latest
WORKDIR /app

# Copy the server binary
COPY --from=builder /server /app/server

# Copy static files for the Trello Power-Up
COPY powerup /app/powerup

EXPOSE 8080

CMD ["/app/server"]
