from services.ai_orchestrator import ai_orchestrator
from typing import List, Dict, Any


class AssessmentController:

    @staticmethod
    def generate_quiz(
        topic: str,
        difficulty: str = "intermediate",
        num_questions: int = 5,
        mode: str = "text",
    ) -> List[Dict[str, Any]]:
        return ai_orchestrator.generate_quiz(topic, difficulty, num_questions, mode)

    @staticmethod
    def evaluate_answer(
        question: str,
        answer: str,
        correct_answer: str = "",
        mode: str = "text",
    ) -> Dict[str, Any]:
        """
        Evaluate an answer and guarantee score is 0, 5, or 10.

        Previously the AI returned 0-100 floats (e.g. 85.0) which
        caused percentage = (sum_of_scores / max_score) * 100 to
        blow past 100 % when scores were already percentages.

        Now the AI returns 10 / 5 / 0, so the calculation:
            total_score  = sum(scores)       e.g. 35 for 5 Qs
            max_score    = num_questions * 10 e.g. 50
            percentage   = (35 / 50) * 100  = 70 %   ✓
        always stays within [0, 100].
        """
        evaluation = ai_orchestrator.evaluate_answer(question, answer, correct_answer, mode)

        # Double-check: clamp score to valid set {0, 5, 10}
        raw = evaluation.get("score", 0)
        try:
            raw = float(raw)
        except (TypeError, ValueError):
            raw = 0.0

        if raw >= 8:
            evaluation["score"] = 10
            evaluation["is_correct"] = True
        elif raw >= 3:
            evaluation["score"] = 5
            evaluation["is_correct"] = evaluation.get("is_correct", False)
        else:
            evaluation["score"] = 0
            evaluation["is_correct"] = False

        return evaluation


assessment_controller = AssessmentController()
