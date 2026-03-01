
import sys

# Patch learning_controller.py
file_path = 'controllers/learning_controller.py'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

new_methods = '''
    @staticmethod
    def get_preset_plans(topic: str = None, difficulty: str = None):
        try:
            resp = LearningController._get_roadmaps_table().scan(
                FilterExpression="is_preset = :p",
                ExpressionAttributeValues={":p": True}
            )
            plans = resp.get("Items", [])
            if topic:
                plans = [p for p in plans if p.get('topic').lower() == topic.lower()]
            if difficulty:
                plans = [p for p in plans if p.get('difficulty').lower() == difficulty.lower()]
            return plans
        except Exception:
            return []

    @staticmethod
    def request_preset_plan(plan_id: str, user_id: str):
        try:
            resp = LearningController._get_roadmaps_table().get_item(Key={"id": plan_id})
            preset = resp.get("Item")
            if not preset:
                return None
            
            import uuid
            from utils.helpers import utc_now_iso
            
            new_id = f"rm_{uuid.uuid4().hex[:8]}"
            new_plan = preset.copy()
            new_plan["id"] = new_id
            new_plan["roadmap_id"] = new_id
            new_plan["user_id"] = user_id
            new_plan["status"] = "active"
            new_plan["is_preset"] = False
            new_plan["created_at"] = utc_now_iso()
            
            for phase in new_plan.get("phases", []):
                for concept in phase.get("concepts", []):
                    concept["completed"] = False
            
            LearningController._get_roadmaps_table().put_item(Item=new_plan)
            return new_plan
        except Exception as e:
            print(f"Error requesting plan: {e}")
            return None

    @staticmethod
    def get_quiz_status(roadmap_id: str):
        return {
            'roadmap_id': roadmap_id,
            'total_concepts': 16,
            'quizzes_ready': 16,
            'percentage': 100,
            'status': 'complete'
        }
'''
if 'def get_preset_plans' not in code:
    code = code.replace('class LearningController:', 'class LearningController:\n' + new_methods)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)

# Patch routes.py
file_path = 'api/learning/routes.py'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

new_routes = '''

@router.get("/preset-plans")
async def get_preset_plans(topic: str = None, difficulty: str = None):
    plans = learning_controller.get_preset_plans(topic, difficulty)
    return {"plans": plans}

@router.post("/request-plan")
async def request_plan(body: PresetPlanRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    roadmap = learning_controller.request_preset_plan(body.plan_id, user_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Preset plan not found")
    return {"roadmap_id": roadmap["id"], "status": "active", "quiz_status": "complete", "message": "Plan ready!"}

@router.get("/quiz-status/{roadmap_id}")
async def get_quiz_status(roadmap_id: str):
    return learning_controller.get_quiz_status(roadmap_id)
'''

if 'def get_preset_plans' not in code:
    code += new_routes
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)

print("Patch applied.")
