import sys
import os
import traceback
import pkg_resources
from dotenv import load_dotenv

from google import genai

# Load environment variables (such as GOOGLE_APPLICATION_CREDENTIALS)
load_dotenv()

def print_environment_details(project, location, model):
    print("--- Environment Details ---")
    try:
        genai_version = pkg_resources.get_distribution("google-genai").version
    except pkg_resources.DistributionNotFound:
        genai_version = "Unknown (not installed)"
        
    print(f"google-genai version: {genai_version}")
    print(f"python version: {sys.version.split(' ')[0]}")
    print(f"project: {project}")
    print(f"region: {location}")
    print(f"model: {model}")
    print("---------------------------\n")

def main():
    project_id = "darshanideathon"
    location = "us-central1"
    model_name = "gemini-2.5-flash"
    
    print_environment_details(project_id, location, model_name)
    
    try:
        # Official Google Gen AI SDK initialization for Vertex AI
        client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location
        )
        
        print(f"Sending 'Hello' to {model_name} on Vertex AI...")
        response = client.models.generate_content(
            model=model_name,
            contents="Hello"
        )
        
        print("\n--- Response ---")
        print(response.text)
        
    except Exception as e:
        print("\n--- Traceback ---")
        traceback.print_exc(file=sys.stdout)

if __name__ == '__main__':
    main()
