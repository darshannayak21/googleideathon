import urllib.request
import json

req = urllib.request.Request("http://127.0.0.1:8000/api/chat")
req.add_header('Content-Type', 'application/json')
req.add_header('Authorization', 'Bearer invalid_token_xyz')
data = json.dumps({"message":"hello", "history":[], "session_id":"test"}).encode('utf-8')

try:
    response = urllib.request.urlopen(req, data=data)
    print(response.read().decode('utf-8'))
except Exception as e:
    print(e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
