from services.ai_orchestrator import ai_orchestrator
from database.dynamodb import get_dynamodb_resource
from config import settings
from utils.helpers import generate_id, utc_now_iso
from typing import List, Dict, Any, Optional


class LearningController:

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

    @staticmethod
    def _get_roadmaps_table():
        return get_dynamodb_resource().Table(settings.DYNAMODB_ROADMAPS_TABLE)

    @staticmethod
    def generate_roadmap(goal: str, stack: List[str], timeline: str, current_level: str, user_id: str) -> Dict[str, Any]:
        roadmap = ai_orchestrator.generate_learning_plan(goal, stack, timeline)

        if user_id and isinstance(roadmap, dict):
            roadmap_id = generate_id("rm_")
            roadmap["id"] = roadmap_id
            roadmap["roadmap_id"] = roadmap_id
            roadmap["user_id"] = user_id
            roadmap["created_at"] = utc_now_iso()
            roadmap["current_level"] = current_level
            roadmap["difficulty"] = current_level
            roadmap["status"] = "active"
            roadmap["progress"] = 0

            # Ensure each phase has an id and each concept has a completed flag
            for i, phase in enumerate(roadmap.get("phases", [])):
                if not phase.get("id"):
                    phase["id"] = f"phase_{i + 1}"
                for concept in phase.get("concepts", []):
                    if "completed" not in concept:
                        concept["completed"] = False

            try:
                LearningController._get_roadmaps_table().put_item(Item=roadmap)
            except Exception as e:
                pass
        return roadmap

    @staticmethod
    def get_user_roadmaps(user_id: str) -> List[Dict[str, Any]]:
        try:
            resp = LearningController._get_roadmaps_table().scan(
                FilterExpression="user_id = :u",
                ExpressionAttributeValues={":u": user_id}
            )
            return resp.get("Items", [])
        except Exception:
            return []

    @staticmethod
    def get_roadmap(roadmap_id: str) -> Dict[str, Any]:
        try:
            resp = LearningController._get_roadmaps_table().get_item(Key={"roadmap_id": roadmap_id})
            return resp.get("Item")
        except Exception:
            return None

    @staticmethod
    def generate_module(topic: str, difficulty: str, repo_id: str = None) -> Dict[str, Any]:
        return ai_orchestrator.generate_learning_module(topic, difficulty)

    @staticmethod
    def complete_concept(roadmap_id: str, concept_id: str, user_id: str) -> bool:
        roadmap = LearningController.get_roadmap(roadmap_id)
        if not roadmap or roadmap.get("user_id") != user_id:
            return False

        updated = False
        for phase in roadmap.get("phases", []):
            for concept in phase.get("concepts", []):
                if concept.get("id") == concept_id:
                    concept["completed"] = True
                    updated = True

        if updated:
            try:
                LearningController._get_roadmaps_table().put_item(Item=roadmap)
            except Exception:
                return False
        return updated

    @staticmethod
    def get_concept_module(topic: str, roadmap_id: str, concept_id: str, difficulty: str) -> Dict[str, Any]:
        cache_key = f"concept_{roadmap_id}_{concept_id}"
        try:
            resp = LearningController._get_roadmaps_table().get_item(Key={"id": cache_key})
            if "Item" in resp:
                cached = resp["Item"]
                # Validate cached item has required fields 
                if cached.get("sections") and cached.get("quiz_questions"):
                    return cached
        except Exception:
            pass

        module = ai_orchestrator.generate_learning_module(topic, difficulty)
        module["id"] = cache_key
        module["concept_id"] = concept_id
        module["roadmap_id"] = roadmap_id

        # Ensure required fields are present
        if "sections" not in module:
            module["sections"] = []
        if "code_examples" not in module:
            module["code_examples"] = []
        if "quiz_questions" not in module:
            module["quiz_questions"] = []
        if "viva_questions" not in module:
            module["viva_questions"] = []
        if "integrity_test_questions" not in module:
            module["integrity_test_questions"] = []
        if "skill_areas" not in module:
            module["skill_areas"] = [
                {"name": "Conceptual Understanding", "description": "grasp of core concepts"},
                {"name": "Practical Application", "description": "ability to use in code"},
                {"name": "Problem Solving", "description": "applying to real scenarios"}
            ]
        if "sandbox_starter_code" not in module:
            module["sandbox_starter_code"] = f"// Practice {topic} here\n"
        if "sandbox_language" not in module:
            module["sandbox_language"] = "javascript"

        try:
            LearningController._get_roadmaps_table().put_item(Item=module)
        except Exception:
            pass
        return module

    @staticmethod
    def concept_chat(topic: str, concept_content: str, question: str) -> Dict[str, str]:
        return ai_orchestrator.concept_chat(topic, concept_content, question)

    @staticmethod
    def evaluate_skill_gap(
        topic: str,
        skill_areas: List[str],
        quiz_score: float,
        viva_score: float,
        quiz_answers: List[Any],
        viva_answers: List[Any]
    ) -> Dict[str, Any]:
        return ai_orchestrator.evaluate_skill_gap(
            topic=topic,
            skill_areas=skill_areas,
            quiz_score=quiz_score,
            viva_score=viva_score,
            quiz_answers=quiz_answers,
            viva_answers=viva_answers
        )

    @staticmethod
    def save_concept_progress(
        roadmap_id: str,
        concept_id: str,
        phase_id: str,
        step: str,
        score: float,
        completed: bool,
        user_id: str
    ) -> Dict[str, Any]:
        roadmap = LearningController.get_roadmap(roadmap_id)
        if not roadmap:
            return {"success": False, "error": "Roadmap not found"}

        concept_completed = False
        next_concept_id = None
        total_concepts = 0
        completed_count = 0
        phase_complete = False
        found_concept = False

        phases = roadmap.get("phases", [])

        for phase_idx, phase in enumerate(phases):
            concepts = phase.get("concepts", [])
            phase_done_before = all(c.get("completed") for c in concepts) if concepts else False

            for idx, concept in enumerate(concepts):
                total_concepts += 1

                # Match by id or name
                is_target = (
                    concept.get("id") == concept_id or
                    concept.get("name") == concept_id
                )

                if is_target and not found_concept:
                    found_concept = True
                    if completed and step == "complete":
                        concept["completed"] = True
                        concept_completed = True

                        # Find next concept
                        if idx + 1 < len(concepts):
                            next_concept_id = concepts[idx + 1].get("id") or concepts[idx + 1].get("name")
                        elif phase_idx + 1 < len(phases):
                            next_phase_concepts = phases[phase_idx + 1].get("concepts", [])
                            if next_phase_concepts:
                                next_concept_id = next_phase_concepts[0].get("id") or next_phase_concepts[0].get("name")

                if concept.get("completed"):
                    completed_count += 1

            # Check if this phase just completed
            all_done = all(c.get("completed") for c in concepts) if concepts else False
            if all_done and not phase_done_before and found_concept:
                phase["completed"] = True
                phase_complete = True

        progress_pct = int((completed_count / total_concepts) * 100) if total_concepts > 0 else 0
        roadmap["progress"] = progress_pct
        roadmap_complete = progress_pct == 100
        if roadmap_complete:
            roadmap["status"] = "completed"

        try:
            LearningController._get_roadmaps_table().put_item(Item=roadmap)
        except Exception:
            pass

        return {
            "success": True,
            "concept_completed": concept_completed,
            "next_concept_id": next_concept_id,
            "roadmap_progress": progress_pct,
            "phase_complete": phase_complete,
            "roadmap_complete": roadmap_complete
        }

    @staticmethod
    def get_available_levels(topic: str, user_id: str) -> Dict[str, Any]:
        try:
            resp = LearningController._get_roadmaps_table().scan(
                FilterExpression="user_id = :u",
                ExpressionAttributeValues={":u": user_id}
            )
            roadmaps = resp.get("Items", [])
        except Exception:
            roadmaps = []

        topic_normalized = topic.lower().strip()
        completed_levels = []

        for r in roadmaps:
            if r.get("status") != "completed":
                continue
            lvl = r.get("current_level", "beginner").lower()

            # Match by stack or goal
            stack = r.get("stack", [])
            goal = r.get("goal", "").lower()
            stack_match = any(s.lower() == topic_normalized for s in stack)
            goal_match = topic_normalized in goal

            if (stack_match or goal_match) and lvl not in completed_levels:
                completed_levels.append(lvl)

        available_levels = ["beginner"]
        locked_levels = ["intermediate", "master"]
        next_level = None

        if "beginner" in completed_levels:
            available_levels.append("intermediate")
            locked_levels = [l for l in locked_levels if l != "intermediate"]
            next_level = "intermediate"

        if "intermediate" in completed_levels:
            available_levels.append("master")
            locked_levels = [l for l in locked_levels if l != "master"]
            next_level = "master"

        if "master" in completed_levels:
            next_level = None

        return {
            "topic": topic,
            "completed_levels": completed_levels,
            "available_levels": available_levels,
            "next_level": next_level,
            "locked_levels": locked_levels
        }

    @staticmethod
    def calculate_progress(phases: List[Dict[str, Any]]) -> int:
        total = len(phases)
        if total == 0:
            return 0
        completed = sum(1 for p in phases if p.get("completed"))
        return int((completed / total) * 100)

    @staticmethod
    def update_phase_progress(roadmap_id: str, phase_index: int, completed: bool, user_id: str) -> Optional[Dict[str, Any]]:
        roadmap = LearningController.get_roadmap(roadmap_id)
        if not roadmap:
            print(f"DEBUG: roadmap {roadmap_id} not found")
            return None
        if roadmap.get("user_id") != user_id:
            print(f"DEBUG: roadmap user_id={roadmap.get('user_id')} != {user_id}")
            return None

        phases = roadmap.get("phases", [])
        if phase_index < 0 or phase_index >= len(phases):
            return None

        phases[phase_index]["completed"] = completed

        # Only update concepts strictly depending on this flag if needed
        # Or mark all concepts in phase completed if phase completed:
        # User implies just phase completed status is enough
        for concept in phases[phase_index].get("concepts", []):
            concept["completed"] = completed

        roadmap["phases"] = phases
        roadmap["progress"] = LearningController.calculate_progress(phases)

        try:
            LearningController._get_roadmaps_table().put_item(Item=roadmap)
            return roadmap
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to update progress: {e}")
            return None

learning_controller = LearningController()
