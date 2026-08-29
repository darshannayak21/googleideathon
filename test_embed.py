import traceback
import sys
from dotenv import load_dotenv

load_dotenv()

from google import genai

def test_embedding():
    try:
        client = genai.Client(vertexai=True, project="darshanideathon", location="us-central1")
        response = client.models.embed_content(
            model="text-embedding-004",
            contents="Hello"
        )
        print("text-embedding-004 SUCCESS!")
    except Exception as e:
        print(f"text-embedding-004 FAILED: {e}")
        try:
            client = genai.Client(vertexai=True, project="darshanideathon", location="us-central1")
            response = client.models.embed_content(
                model="text-embedding-005",
                contents="Hello"
            )
            print("text-embedding-005 SUCCESS!")
        except Exception as e2:
            print(f"text-embedding-005 FAILED: {e2}")

if __name__ == '__main__':
    test_embedding()
