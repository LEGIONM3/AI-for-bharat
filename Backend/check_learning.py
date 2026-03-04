import dotenv
dotenv.load_dotenv(r'd:\TenaliAI\Backend\.env')
import boto3, urllib.request, json, sys

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# --- DynamoDB: Count all learning plans in bharat_ai_roadmaps ---
table = dynamodb.Table('bharat_ai_roadmaps')
resp = table.scan()
items = resp.get('Items', [])
print('Total roadmaps in bharat_ai_roadmaps:', len(items))
for item in items:
    print('  id:', item.get('roadmap_id'), 'user:', item.get('user_id'), 'goal:', str(item.get('goal',''))[:60], 'status:', item.get('status'))

# --- Test learning endpoints via live API ---
def _request(method, path, body=None, token=None):
    url = 'http://127.0.0.1:8000/api' + path
    data = json.dumps(body).encode() if body else None
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return 0, str(e)

# Register a temp user and get a token
import uuid
uid   = str(uuid.uuid4())[:8]
uname = 'check_' + uid
email = uname + '@test.com'
pw    = 'TestPass123!'

code, resp = _request('POST', '/auth/register', {'username': uname, 'email': email, 'password': pw})
print('\nRegister:', code)
token = resp.get('access_token') if code == 201 else None

if not token:
    print('Could not get token, skipping API tests')
    sys.exit(0)

# Test 1: Generate learning module
print('\nPOST /learning/module:', end=' ')
code, resp = _request('POST', '/learning/module', {'topic': 'Python basics', 'difficulty': 'beginner'}, token)
print(code)
if code == 200:
    print('  title:', resp.get('title',''), '| has_content:', bool(resp.get('content') or resp.get('sections')))

# Test 2: Create a roadmap
print('\nPOST /learning/roadmap:', end=' ')
code, resp = _request('POST', '/learning/roadmap', {'goal': 'Learn React', 'stack': ['react', 'javascript'], 'timeline': '2 months', 'current_level': 'beginner'}, token)
print(code)
if code in (200, 201):
    roadmap_id = resp.get('roadmap_id')
    print('  roadmap_id:', roadmap_id)

    # Test 3: Fetch roadmap by id
    if roadmap_id:
        print('\nGET /learning/roadmap/' + roadmap_id + ':', end=' ')
        code2, resp2 = _request('GET', '/learning/roadmap/' + roadmap_id, token=token)
        print(code2)
        if code2 == 200:
            print('  goal:', resp2.get('goal'))

# Test 4: List roadmaps
print('\nGET /learning/roadmaps:', end=' ')
code, resp = _request('GET', '/learning/roadmaps', token=token)
print(code, '| count:', len(resp) if isinstance(resp, list) else resp.get('total_roadmaps', '?'))

print('\nAll checks complete.')
