import urllib.request, json
import boto3
import dotenv; dotenv.load_dotenv(r'd:\TenaliAI\Backend\.env')
from config import settings

BASE = 'http://127.0.0.1:8000/api'

user = 'test_prog'
pw = 'pass123!'
try:
    token = json.loads(urllib.request.urlopen(urllib.request.Request(BASE + '/auth/login', json.dumps({'identifier': user, 'password': pw}).encode(), {'Content-Type': 'application/json'})).read()).get('access_token')
except Exception as e:
    token = json.loads(urllib.request.urlopen(urllib.request.Request(BASE + '/auth/register', json.dumps({'username': user, 'email': user+'@mail.com', 'password': pw}).encode(), {'Content-Type': 'application/json'})).read()).get('access_token')

req = urllib.request.Request(f"{BASE}/repos/upload", json.dumps({"repo_url": "https://github.com/LEGIONM3/AI-for-bharat"}).encode(), {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token})
res = urllib.request.urlopen(req)
repo_id = json.loads(res.read()).get('repo_id')
print("Uploaded repo, id:", repo_id)
