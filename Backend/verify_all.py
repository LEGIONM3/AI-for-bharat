import dotenv
dotenv.load_dotenv(r'd:\TenaliAI\Backend\.env')
import sys, os
sys.path.insert(0, r'd:\TenaliAI\Backend')
import urllib.request, json, uuid, boto3

BASE = 'http://127.0.0.1:8000/api'

def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body else None
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return 0, str(e)

uid   = str(uuid.uuid4())[:8]
uname = 'verify_' + uid
email = uname + '@test.com'
pw    = 'TestPass123!'

print("=" * 55)
print("VERIFICATION REPORT")
print("=" * 55)

# ─── 1. LOGIN SYSTEM ─────────────────────────────────────
print("\n[1] LOGIN SYSTEM")
code, _ = req('POST', '/auth/register', {'username': uname, 'email': email, 'password': pw})
print(f"  Register:              {'OK' if code == 201 else 'FAIL'} ({code})")

code1, r1 = req('POST', '/auth/login', {'identifier': uname, 'password': pw})
token = r1.get('access_token')
print(f"  Login via username:    {'OK' if code1 == 200 else 'FAIL'} ({code1})")

code2, _ = req('POST', '/auth/login', {'identifier': email, 'password': pw})
print(f"  Login via email:       {'OK' if code2 == 200 else 'FAIL'} ({code2})")

code3, _ = req('POST', '/auth/login', {'identifier': email, 'password': 'wrong'})
print(f"  Wrong password -> 401: {'OK' if code3 == 401 else 'FAIL'} ({code3})")

# ─── 2. NOVA PRO MODEL ───────────────────────────────────
print("\n[2] AMAZON NOVA PRO MODEL")
model_id = os.getenv('BEDROCK_MODEL_ID', 'amazon.nova-pro-v1:0')
print(f"  Model ID in .env: {model_id}")
from services.aws.bedrock_runtime import invoke_model
try:
    result = invoke_model("Say: Nova Pro OK")
    print(f"  Bedrock call:          OK")
    print(f"  Response snippet:      {str(result)[:60]}")
except Exception as e:
    print(f"  Bedrock call:          FAIL - {e}")

# ─── 3. LEARNING PLANS IN CLOUD ──────────────────────────
print("\n[3] LEARNING PLANS (DynamoDB)")
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('bharat_ai_roadmaps')
resp = table.scan()
items = resp.get('Items', [])
print(f"  Roadmaps in DynamoDB:  {len(items)} records")

if token:
    code4, r4 = req('POST', '/learning/module',
                    {'topic': 'Python Loops', 'difficulty': 'beginner'}, token)
    print(f"  /learning/module:      {'OK' if code4 == 200 else 'FAIL'} ({code4})")
    if code4 == 200:
        print(f"  Module title:          {r4.get('title', '')[:50]}")

    code5, r5 = req('POST', '/learning/roadmap',
                    {'goal': 'Learn FastAPI', 'stack': ['python', 'fastapi'],
                     'timeline': '1 month', 'current_level': 'beginner'}, token)
    print(f"  Create roadmap:        {'OK' if code5 in (200, 201) else 'FAIL'} ({code5})")
    if code5 in (200, 201):
        rid = r5.get('roadmap_id', '')
        print(f"  Saved roadmap_id:      {rid}")
        code6, _ = req('GET', f'/learning/roadmap/{rid}', token=token)
        print(f"  Fetch roadmap by ID:   {'OK' if code6 == 200 else 'FAIL'} ({code6})")

    code7, r7 = req('GET', '/learning/roadmaps', token=token)
    count = len(r7) if isinstance(r7, list) else r7.get('total_roadmaps', '?')
    print(f"  List roadmaps:         {'OK' if code7 == 200 else 'FAIL'} ({code7}) | count={count}")

# ─── DynamoDB INDEXES ────────────────────────────────────
print("\n[4] DYNAMODB INDEXES (bharat_ai_users)")
client = boto3.client('dynamodb', region_name='us-east-1')
res = client.describe_table(TableName='bharat_ai_users')
indexes = res['Table'].get('GlobalSecondaryIndexes', [])
for idx in indexes:
    print(f"  {idx['IndexName']}: {idx['IndexStatus']}")

print("\n" + "=" * 55)
print("ALL CHECKS DONE")
