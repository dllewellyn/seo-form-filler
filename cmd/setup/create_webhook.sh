#!/bin/bash
# script to easily register a trello webhook.

echo "Trello Webhook Setup script"
echo "---------------------------"
echo "You can find your API key and Token at: https://trello.com/app-key"

read -p "Enter your Trello API Key: " API_KEY
read -p "Enter your Trello API Token: " API_TOKEN
read -p "Enter your Trello Board ID (or List ID): " ID_MODEL
read -p "Enter your Ngrok URL (e.g., https://123-abc.ngrok.app): " NGROK_URL

CALLBACK_URL="${NGROK_URL}/api/trello/webhook"

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
