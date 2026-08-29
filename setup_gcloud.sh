#!/bin/bash

# ==============================================================================
# Google Cloud Setup Script for DarshanIdeathon
# Run this script in Google Cloud Shell: https://shell.cloud.google.com/
# ==============================================================================
  
PROJECT_ID="darshanideathon"

echo "Setting up Google Cloud infrastructure for project: $PROJECT_ID..."

# Select project
gcloud config set project $PROJECT_ID

# Enable APIs
echo "Enabling necessary Google Cloud APIs..."
gcloud services enable \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Create Firestore database
echo "Creating Firestore Database (asia-south1)..."
gcloud firestore databases create --location=asia-south1

# Create a Secret Manager secret for Gemini API Key
echo "Enter your Gemini API Key (get it from Google AI Studio):"
read -s GEMINI_API_KEY
echo ""
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

echo "=============================================================================="
echo "Setup Complete! Your Cloud environment is ready."
echo "=============================================================================="
