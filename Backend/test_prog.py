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

dynamodb = boto3.resource('dynamodb', region_name=settings.AWS_REGION, aws_access_key_id=settings.AWS_ACCESS_KEY_ID, aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
r_me = urllib.request.Request(BASE + '/profile', headers={'Authorization': 'Bearer ' + token})
me_data = json.loads(urllib.request.urlopen(r_me).read())
real_user_id = me_data.get('user_id')
print("USERID", real_user_id)

table = dynamodb.Table(settings.DYNAMODB_ROADMAPS_TABLE)
items = table.scan(Limit=1).get('Items', [])
if not items:
    print("NO ITEMS IN AP-SOUTH-1. Creating dummy roadmap.")
    req = urllib.request.Request(f"{BASE}/learning/roadmap", json.dumps({"goal": "Test", "stack": ["python"], "timeline": "1 week"}).encode(), {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token})
    res = urllib.request.urlopen(req)
    rid = json.loads(res.read()).get('id')
else:
    rid = items[0].get('id')
    # Update user ID in case it's not our
    table.update_item(Key={"roadmap_id": rid}, UpdateExpression="set user_id = :u", ExpressionAttributeValues={":u": real_user_id})

print("RID", rid)

req = urllib.request.Request(f"{BASE}/learning/roadmap/{rid}/progress", json.dumps({"phase_index": 0, "completed": True}).encode(), {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token})
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read())
        print("POST returned 200 OK")
        print("Progress updated to:", data.get("progress"))
except Exception as e:
    print("POST failed:", getattr(e, 'read', lambda: str(e))())

db_item = table.get_item(Key={"roadmap_id": rid}).get("Item")
print("DB Phase 0 completed:", db_item.get("phases")[0].get("completed"))
print("DB Progress:", db_item.get("progress"))
