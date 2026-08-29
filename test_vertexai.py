import traceback
import sys
from dotenv import load_dotenv

load_dotenv()

from backend.gemini_client import chat_turn, gemini

def main():
    try:
        gemini.initialize()
        history = [{'role': 'user', 'content': 'Hello'}, {'role': 'model', 'content': 'Hi there'}]
        response = chat_turn(history, 'How are you?')
        print("Success:", response)
    except Exception as e:
        traceback.print_exc(file=sys.stdout)

if __name__ == '__main__':
    main()
