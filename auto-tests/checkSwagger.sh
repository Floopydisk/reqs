#!/bin/bash

# This script checks if the Swagger documentation is accessible
echo "Checking if Swagger documentation is accessible..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api-docs/

# Add a small delay to ensure the response is received
sleep 1

echo -e "\n\nOpening Swagger UI in browser..."
echo "Please navigate to http://localhost:3000/api-docs/ in your browser to view the API documentation."