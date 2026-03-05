import dotenv
dotenv.load_dotenv(r'd:\TenaliAI\Backend\.env')
import urllib.request, json

BASE = 'http://127.0.0.1:8000/api'

def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body else None
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return 0, str(e)

# Get a valid token first
import uuid
uid = str(uuid.uuid4())[:8]
uname = 'check_' + uid
email = uname + '@test.com'
pw = 'TestPass123!'

code, r = req('POST', '/auth/register', {'username': uname, 'email': email, 'password': pw})
token = r.get('access_token')
print('Register:', code)

# Test login with identifier (the correct format)
code, r = req('POST', '/auth/login', {'identifier': uname, 'password': pw})
print('Login (username, identifier):', code)

code, r = req('POST', '/auth/login', {'identifier': email, 'password': pw})
print('Login (email, identifier):', code)

# Test with old format (email key) -- should fail 422
code, r = req('POST', '/auth/login', {'email': email, 'password': pw})
print('Login (old email key - should be 422):', code)

# Get all roadmaps and test fetching one
code, roadmaps = req('GET', '/learning/roadmaps', token=token)
print('\nGET /learning/roadmaps:', code, '| count:', len(roadmaps) if isinstance(roadmaps, list) else '?')

# Test fetching a specific existing roadmap
import boto3
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('bharat_ai_roadmaps')
resp = table.scan(Limit=1)
items = resp.get('Items', [])
if items:
    rid = items[0].get('roadmap_id') or items[0].get('id')
    print('\nTesting GET roadmap by ID:', rid)
    code2, r2 = req('GET', '/learning/roadmap/' + rid, token=token)
    print('GET /learning/roadmap/{id}:', code2)
    if code2 == 200:
        print('  goal:', r2.get('goal'))
    else:
        print('  error:', r2)
