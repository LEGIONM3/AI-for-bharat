import dotenv
dotenv.load_dotenv(r'd:\TenaliAI\Backend\.env')
import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('bharat_ai_roadmaps')
resp = table.scan()
items = resp.get('Items', [])
print('Table: bharat_ai_roadmaps')
print('Total roadmaps stored:', len(items))
print()
for item in items:
    rid = item.get('roadmap_id') or item.get('id', '?')
    uid = item.get('user_id', '?')
    goal = str(item.get('goal', '?'))[:60]
    status = item.get('status', '?')
    created = item.get('created_at', '?')
    print('  roadmap_id :', rid)
    print('  user_id    :', uid)
    print('  goal       :', goal)
    print('  status     :', status)
    print('  created_at :', created)
    print()
