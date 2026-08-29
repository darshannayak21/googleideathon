import traceback
import sys
from dotenv import load_dotenv

load_dotenv()

from backend.secrets import fetch_gemini_key
from backend.gemini_client import chat_turn, gemini

def main():
    try:
        api_key = fetch_gemini_key()
        gemini.initialize(api_key)
        
        # Test direct call to gemini-3.6-flash
        response = gemini.client.models.generate_content(
            model="gemini-3.6-flash",
            contents="Hello"
        )
        print("Success:", response.text)
    except Exception as e:
        traceback.print_exc(file=sys.stdout)

if __name__ == '__main__':
    main()
