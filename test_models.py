import traceback
import sys
from dotenv import load_dotenv

load_dotenv()

from google import genai

def try_model(location, model_name):
    print(f"\n--- Testing {model_name} in {location} ---")
    try:
        client = genai.Client(vertexai=True, project="darshanideathon", location=location)
        response = client.models.generate_content(
            model=model_name,
            contents="Hello"
        )
        print("SUCCESS!")
    except Exception as e:
        print(f"FAILED: {e}")

def main():
    try_model("us-central1", "gemini-1.5-flash")
    try_model("us-central1", "gemini-1.5-flash-001")
    try_model("us-central1", "gemini-2.5-flash")
    try_model("asia-south1", "gemini-1.5-flash")
    try_model("asia-south1", "gemini-1.5-flash-001")
    try_model("asia-south1", "gemini-1.5-flash-002")

if __name__ == '__main__':
    main()
