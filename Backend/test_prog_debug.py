import urllib.request, json
import boto3
import dotenv; dotenv.load_dotenv(r'd:\TenaliAI\Backend\.env')

BASE = 'http://127.0.0.1:8000/api'

user = 'test_prog'
pw = 'pass123!'
token = json.loads(urllib.request.urlopen(urllib.request.Request(BASE + '/auth/login', json.dumps({'identifier': user, 'password': pw}).encode(), {'Content-Type': 'application/json'})).read()).get('access_token')

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
r_me = urllib.request.Request(BASE + '/profile', headers={'Authorization': 'Bearer ' + token})
me_data = json.loads(urllib.request.urlopen(r_me).read())
real_user_id = me_data.get('user_id')

table = dynamodb.Table('bharat_ai_roadmaps')
items = table.scan(Limit=1).get('Items', [])
rid = items[0].get('id')
table.update_item(Key={"id": rid}, UpdateExpression="set user_id = :u", ExpressionAttributeValues={":u": real_user_id})

# let's just get the roadmap from dynmao and print user_id and phase len
print("Dynamo user_id", table.get_item(Key={"id":rid}).get("Item").get("user_id"))
print("Dynamo phases", len(table.get_item(Key={"id":rid}).get("Item").get("phases", [])))
