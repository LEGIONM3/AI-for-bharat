import dotenv
dotenv.load_dotenv(r'd:\TenaliAI\Backend\.env')
import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('bharat_ai_roadmaps')

# Check exact ID from browser
rid = 'rm_d87a590bd7024a06b4b859111f21cce5'
resp = table.get_item(Key={'roadmap_id': rid})
item = resp.get('Item')
if item:
    print('FOUND:', rid)
    print('  goal:', item.get('goal'))
    print('  user_id:', item.get('user_id'))
else:
    print('NOT FOUND in DynamoDB:', rid)
    print()
    print('All roadmap IDs stored:')
    r2 = table.scan()
    for i in r2.get('Items', []):
        print(' -', i.get('roadmap_id'))
