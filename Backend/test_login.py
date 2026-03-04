import requests
import uuid
import json

base_url = 'http://127.0.0.1:8000/api/auth'
unique_str = str(uuid.uuid4())[:8]
username = f'testuser_{unique_str}'
email = f'{username}@example.com'
password = 'Password123!'

print('--- REGISTER ---')
reg = requests.post(f'{base_url}/register', json={
    'username': username,
    'email': email,
    'password': password
})
print("REGISTER:", reg.status_code)

print('\n--- LOGIN USERNAME ---')
l1 = requests.post(f'{base_url}/login', json={'identifier': username, 'password': password})
print("LOGIN USERNAME STATUS:", l1.status_code)
print("BODY:", l1.text[:200])

print('\n--- LOGIN EMAIL ---')
l2 = requests.post(f'{base_url}/login', json={'identifier': email, 'password': password})
print("LOGIN EMAIL STATUS:", l2.status_code)
print("BODY:", l2.text[:200])

print('\n--- LOGIN WRONG PASS ---')
l3 = requests.post(f'{base_url}/login', json={'identifier': email, 'password': 'wrong'})
print("LOGIN WRONG PASS STATUS:", l3.status_code)
print("BODY:", l3.text)
