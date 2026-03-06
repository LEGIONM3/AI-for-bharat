import dotenv
dotenv.load_dotenv(r'd:\TenaliAI\Backend\.env')

import os
import boto3
from config import settings
from controllers.learning_controller import LearningController

print("Table:", settings.DYNAMODB_ROADMAPS_TABLE)

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table(settings.DYNAMODB_ROADMAPS_TABLE)
items = table.scan(Limit=1).get('Items', [])
rid = items[0].get('id')
uid = items[0].get('user_id')

print("ID is", rid)
try:
    print("Direct GetItem:", table.get_item(Key={"id": rid}))
except Exception as e:
    print("Direct GetItem failed:", e)

try:
    print("LearningController GetItem:", LearningController.get_roadmap(rid))
except Exception as e:
    print("LearningController GetItem failed:", e)
