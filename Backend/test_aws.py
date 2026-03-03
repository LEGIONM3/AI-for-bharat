import dotenv; dotenv.load_dotenv('.env'); import os, boto3, json; client = boto3.client('bedrock-runtime', region_name=os.getenv('BEDROCK_REGION')); 
try:
    print('Calling converse...');
    res = client.converse(modelId=os.getenv('BEDROCK_MODEL_ID'), messages=[{'role': 'user', 'content': [{'text': 'hi'}]}], inferenceConfig={'maxTokens': 1000}, system=[{'text': 'sys'}]);
    print(res);
except Exception as e:
    print('ERROR:', repr(e))

