import os
import sys
import pkg_resources
from dotenv import load_dotenv
from google.auth import default
from google.auth.transport.requests import Request
import requests

load_dotenv()

def print_versions():
    print("--- 1. Package Versions ---")
    for pkg in ['google-genai', 'google-cloud-aiplatform']:
        try:
            version = pkg_resources.get_distribution(pkg).version
            print(f"{pkg} version: {version}")
        except pkg_resources.DistributionNotFound:
            print(f"{pkg} is not installed.")
    print()

def get_credentials():
    print("--- Auth Information ---")
    creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    print(f"GOOGLE_APPLICATION_CREDENTIALS = {creds_path}")
    creds, project = default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
    print(f"Credentials type: {type(creds).__name__}")
    print(f"Default project from auth: {project}")
    return creds

def list_models_rest(creds, project_id, location):
    print(f"\n--- Listing Models in {location} via REST API ---")
    try:
        creds.refresh(Request())
        token = creds.token
        url = f"https://{location}-aiplatform.googleapis.com/v1/publishers/google/models"
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            models = response.json().get('models', [])
            print(f"Found {len(models)} models.")
            for m in models:
                if 'gemini' in m.get('name', '').lower():
                    print(m['name'])
        else:
            print(f"Failed to list models. Status Code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Exception listing models: {e}")

if __name__ == '__main__':
    print_versions()
    creds = get_credentials()
    list_models_rest(creds, 'darshanideathon', 'us-central1')
    list_models_rest(creds, 'darshanideathon', 'asia-south1')
