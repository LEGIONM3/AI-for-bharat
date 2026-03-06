import json
from typing import Dict, Any, List, Optional
from services.aws.bedrock_runtime import invoke_model, invoke_model_structured
from prompts.system_prompt import SYSTEM_PROMPT
from services.rag.pipeline import rag_pipeline


class AIOrchestrator:

    @staticmethod
    def generate_repo_intelligence(repo_context: str) -> Dict[str, Any]:
        prompt = f"""Analyze this repository based on the provided code context.
Return a final comprehensive intelligence report in strict JSON format.

CODE CONTEXT:
{repo_context}

Output format:
{{
    "overview": "Brief description of the repository",
    "architecture_summary": "Architecture explanation",
    "complexity_score": <1-100 float>,
    "tech_stack": ["React", "Python", ...],
    "design_patterns": ["Singleton", "Factory", ...],
    "recommendations": ["Improvement 1", "Improvement 2"],
    "contribution_opportunities": ["Opportunity 1", "Opportunity 2"],
    "risks": ["Risk 1"],
    "strengths": ["Strength 1"],
    "folder_structure": [{{"name": "folder_or_file_name", "type": "folder"}}],
    "mermaid_diagram": "mermaid diagram code or empty string"
}}"""
        return invoke_model_structured(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            schema_description="Repository Intelligence Object"
        )

    @staticmethod
    def generate_learning_plan(goal: str, stack: List[str], timeline: str) -> Dict[str, Any]:
        prompt = f"""Generate a detailed developer learning roadmap.
Goal: {goal}
Stack: {', '.join(stack)}
Timeline: {timeline}

Return a valid JSON object matching exactly this schema:
{{
  "title": "Roadmap title",
  "goal": "{goal}",
  "stack": {json.dumps(stack)},
  "timeline": "{timeline}",
  "total_weeks": <number>,
  "phases": [
    {{
      "id": "phase_1",
      "phase": <number>,
      "title": "Phase title",
      "duration_weeks": <number>,
      "objectives": ["obj1", "obj2"],
      "concepts": [
        {{
          "id": "c1",
          "name": "Concept name",
          "description": "...",
          "resources": ["url1"],
          "estimated_hours": <number>,
          "completed": false
        }}
      ],
      "projects": ["proj1"],
      "milestones": ["ms1"]
    }}
  ],
  "tips": ["tip1", "tip2"],
  "success_metrics": ["metric1"]
}}"""
        return invoke_model_structured(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            schema_description="Learning Roadmap Object"
        )

    @staticmethod
    def generate_learning_module(topic: str, difficulty: str = "intermediate") -> Dict[str, Any]:
        prompt = f"""Generate a complete learning module for: {topic}
Difficulty: {difficulty}

Return ONLY valid JSON, no markdown, no code fences:
{{
  "title": "descriptive module title",
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "estimated_time_minutes": 30,
  "sections": [
    {{
      "title": "section heading",
      "content": "explanation in plain text only, no code here",
      "key_points": ["point 1", "point 2", "point 3"]
    }}
  ],
  "code_examples": [
    {{
      "title": "example title",
      "language": "javascript",
      "code": "// complete working code example\nconst example = true;",
      "explanation": "what this code demonstrates"
    }}
  ],
  "sandbox_starter_code": "// starter code for student practice",
  "sandbox_language": "javascript",
  "quiz_questions": [
    {{
      "id": "q1",
      "question": "clear MCQ question",
      "options": ["A) option1","B) option2","C) option3","D) option4"],
      "correct_answer": "A",
      "explanation": "why A is correct"
    }},
    {{
      "id": "q2",
      "question": "another question",
      "options": ["A) opt1","B) opt2","C) opt3","D) opt4"],
      "correct_answer": "B",
      "explanation": "why B is correct"
    }},
    {{
      "id": "q3",
      "question": "third question",
      "options": ["A) opt1","B) opt2","C) opt3","D) opt4"],
      "correct_answer": "C",
      "explanation": "why C is correct"
    }}
  ],
  "viva_questions": [
    {{
      "id": "v1",
      "question": "Explain {topic} in your own words and give a real use case.",
      "ideal_answer": "key concepts the student should mention"
    }}
  ],
  "integrity_test_questions": [
    {{
      "id": "it1",
      "question": "Deep conceptual question about {topic}",
      "ideal_answer": "comprehensive answer expected"
    }},
    {{
      "id": "it2",
      "question": "How would you apply {topic} in a real project?",
      "ideal_answer": "practical application answer"
    }},
    {{
      "id": "it3",
      "question": "What are the common mistakes with {topic} and how to avoid them?",
      "ideal_answer": "pitfalls and best practices"
    }}
  ],
  "skill_areas": [
    {{
      "name": "Conceptual Understanding",
      "description": "grasp of core concepts"
    }},
    {{
      "name": "Practical Application",
      "description": "ability to use in code"
    }},
    {{
      "name": "Problem Solving",
      "description": "applying to real scenarios"
    }}
  ]
}}"""
        return invoke_model_structured(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            schema_description="Learning Module Object"
        )

    @staticmethod
    def concept_chat(topic: str, concept_content: str, question: str, difficulty: str = "beginner") -> Dict[str, str]:
        prompt = f"""You are an expert AI tutor teaching: {topic}

Current lesson context:
{concept_content}

Student asks: {question}

Instructions:
- Answer directly and clearly
- Include a short code snippet if it helps
- Keep response under 200 words
- Focus ONLY on {topic}
- Use simple language suitable for {difficulty} level"""
        return {"response": invoke_model(prompt=prompt, system_prompt=SYSTEM_PROMPT)}

    @staticmethod
    def evaluate_skill_gap(
        topic: str,
        skill_areas: List[str],
        quiz_score: float,
        viva_score: float,
        quiz_answers: List[Any],
        viva_answers: List[Any]
    ) -> Dict[str, Any]:
        prompt = f"""Evaluate skill mastery for topic: {topic}

Performance data:
Quiz score: {quiz_score}%
Viva score: {viva_score}%
Skill areas to evaluate: {json.dumps(skill_areas)}
Quiz answers provided: {json.dumps(quiz_answers)}
Viva answers provided: {json.dumps(viva_answers)}

Based on these scores calculate skill mastery.
Use quiz_score and viva_score to determine each skill area's mastery level.

Return ONLY valid JSON:
{{
  "skill_gaps": [
    {{
      "name": "skill area name",
      "score": <integer 0-100>,
      "status": "MASTERED",
      "recommendation": "brief recommendation"
    }}
  ],
  "overall_score": <integer 0-100>,
  "strategic_directives": [
    "specific action item 1",
    "specific action item 2",
    "specific action item 3"
  ],
  "passed": <true if overall_score >= 60>
}}

Status rules:
score >= 70 -> "MASTERED"
score 40-69 -> "DEVELOPING"
score < 40  -> "CRITICAL"
"""
        return invoke_model_structured(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            schema_description="Skill Gap Evaluation"
        )

    @staticmethod
    def generate_quiz(topic: str, difficulty: str, num_questions: int = 5, mode: str = "text", repo_id: Optional[str] = None) -> List[Dict[str, Any]]:
        context_section = ""
        if repo_id:
            context = rag_pipeline.get_relevant_context(repo_id, topic, top_k=6)
            context_section = f"""
Use the following repository code context to ask specific questions about the codebase matching the topic "{topic}".
For example, ask about the purpose of certain libraries, architectural decisions, and how a component captures or processes data in this project.
REPOSITORY CONTEXT:
{context}
"""

        if mode == "voice":
            prompt = f"""Generate {num_questions} open-ended interview-style
questions about: {topic}
Difficulty: {difficulty}
{context_section}

Rules for voice questions:
- Questions must be open-ended (no multiple choice)
- No "which of the following" phrasing
- No A) B) C) D) options
- Questions should invite a spoken explanation
- Use phrases like:
    "Explain how..."
    "What is... and how does it work?"
    "Describe the difference between..."
    "How would you use... in a real project?"
    "Why would a developer choose... over...?"
    "Walk me through..."
- Each question tests genuine understanding
- Suitable for verbal answer (30-60 seconds of speech)

Return ONLY this JSON — no markdown:
{{
  "questions": [
    {{
      "id": "q1",
      "question": "open ended question text here",
      "correct_answer": "ideal answer covering key points",
      "difficulty": "{difficulty}",
      "topic": "{topic}",
      "options": []
    }}
  ]
}}
"""
        else:
            prompt = f"""Generate a {num_questions}-question multiple choice quiz on: {topic}
Difficulty: {difficulty}
{context_section}

Return JSON array:
[
  {{
    "id": "q1",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A",
    "explanation": "...",
    "difficulty": "{difficulty}",
    "topic": "{topic}"
  }}
]"""

        res = invoke_model_structured(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            schema_description="Array of quiz question objects"
        )

        if isinstance(res, dict):
            if "questions" in res:
                return res["questions"]
            if "quiz" in res:
                return res["quiz"]
            # Fallback for arbitrary root key wrapper
            for val in res.values():
                if isinstance(val, list):
                    return val
            return []

        return res if isinstance(res, list) else []

    @staticmethod
    def evaluate_answer(question: str, answer: str, correct_answer: str = "", mode: str = "text") -> Dict[str, Any]:
        """
        Evaluate a developer's answer.

        Scoring rules (FIXED — never returns percentage):
          10 = fully correct and complete
           5 = partially correct, shows some understanding
           0 = wrong, irrelevant, or no understanding
        """
        prompt = f"""You are evaluating a developer's answer to a technical question.

Question: {question}
Expected answer (key points): {correct_answer if correct_answer else "Determine from the question context"}
Developer's answer: {answer}
Answer mode: {mode}

If mode is "voice":
- The answer is a spoken transcript
- Be lenient with grammar and filler words ("um", "like", "so basically")
- Focus on whether the KEY CONCEPTS are mentioned
- A good spoken answer covers the main idea even if not perfectly worded

If mode is "text":
- The answer is a selected option (A/B/C/D) or typed code
- Evaluate strictly against correct_answer

Scoring:
- 10 points: Correct — covers the key concepts
- 5 points:  Partial — shows some understanding but missing important details
- 0 points:  Wrong — incorrect or no understanding

Return ONLY this JSON:
{{
  "score": <10, 5, or 0>,
  "is_correct": <true if score is 10>,
  "feedback": "<one sentence>",
  "detailed_feedback": "<2-3 sentences>",
  "correct_answer": "{correct_answer}",
  "understanding_level": "beginner|intermediate|advanced",
  "skill_gaps": [],
  "strengths": [],
  "concepts_to_study": [],
  "improvements": []
}}
"""

        result = invoke_model_structured(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            schema_description="Evaluation object"
        )

        # Enforce score is exactly 0, 5, or 10 — clamp any hallucinated values
        raw_score = result.get("score", 0)
        if isinstance(raw_score, (int, float)):
            if raw_score >= 8:
                result["score"] = 10
                result["is_correct"] = True
            elif raw_score >= 3:
                result["score"] = 5
                result["is_correct"] = False
            else:
                result["score"] = 0
                result["is_correct"] = False
        else:
            result["score"] = 0
            result["is_correct"] = False

        return result

    @staticmethod
    def rag_chat(repo_id: str, user_query: str) -> str:
        context = rag_pipeline.get_relevant_context(repo_id, user_query, top_k=3)
        prompt = f"""Answer the user's question about the repository using the provided context.
If the answer is not in the context, state that clearly.

REPOSITORY CONTEXT:
{context}

USER QUESTION:
{user_query}
"""
        return invoke_model(prompt=prompt, system_prompt=SYSTEM_PROMPT)

    @staticmethod
    def explain_code(code: str) -> str:
        prompt = f"""Explain the following code snippet logically and clearly. Identify potential issues if any.

CODE:
{code}
"""
        return invoke_model(prompt=prompt, system_prompt=SYSTEM_PROMPT)

    @staticmethod
    def generate_recommendations(repo_context: str) -> List[str]:
        prompt = f"""Based on the repository context below, suggest actionable recommendations for improvements or next steps. Return ONLY a JSON list of strings.

CONTEXT:
{repo_context}

Schema: ["Rec 1", "Rec 2"]
"""
        res = invoke_model_structured(prompt=prompt, system_prompt=SYSTEM_PROMPT, schema_description="List of strings")
        return res if isinstance(res, list) else []


ai_orchestrator = AIOrchestrator()
