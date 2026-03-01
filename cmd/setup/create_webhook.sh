#!/bin/bash
# script to easily register a trello webhook.

# You need your API key and Token from https://trello.com/app-key
API_KEY="your-trello-api-key"
API_TOKEN="your-trello-api-token"

# The ID of the model you want to monitor (e.g., a Board ID or a List ID)
ID_MODEL="your-board-or-list-id"

# The URL of your Go running application (e.g., your ngrok URL)
CALLBACK_URL="https://your-ngrok-url.app/api/trello/webhook"

curl -X POST -H "Content-Type: application/json" \
https://api.trello.com/1/webhooks/ \
-d '{
  "key": "'$API_KEY'",
  "token": "'$API_TOKEN'",
  "callbackURL": "'$CALLBACK_URL'",
  "idModel":"'$ID_MODEL'",
  "description": "SEO Backlink Webhook"
}'

echo ""
echo "Webhook creation request sent."
