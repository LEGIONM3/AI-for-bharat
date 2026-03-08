import { getNextConcept } from '../learningNavigation';

describe('learningNavigation - getNextConcept', () => {
    const mockRoadmap = {
        phases: [
            {
                phase: "Phase 01",
                concepts: [
                    { id: "c1", name: "Concept 1" },
                    { id: "c2", name: "Concept 2" },
                    { id: "c3", name: "Concept 3" },
                ]
            },
            {
                phase: "Phase 02",
                concepts: [
                    { id: "c4", name: "Concept 4" },
                    { id: "c5", name: "Concept 5" },
                    { id: "c6", name: "Concept 6" },
                ]
            }
        ]
    };

    it('returns correct next concept IDs in order', () => {
        expect(getNextConcept("c1", mockRoadmap)).toEqual({ conceptId: "c2", phaseId: "phase_1" });
        expect(getNextConcept("c2", mockRoadmap)).toEqual({ conceptId: "c3", phaseId: "phase_1" });
    });

    it('advances to the first concept of the next phase when at the end of current phase', () => {
        expect(getNextConcept("c3", mockRoadmap)).toEqual({ conceptId: "c4", phaseId: "phase_2" });
    });

    it('returns null when on the last concept', () => {
        expect(getNextConcept("c6", mockRoadmap)).toBeNull();
    });

    it('returns null if roadmap is invalid or concept not found', () => {
        expect(getNextConcept("c1", null)).toBeNull();
        expect(getNextConcept("c99", mockRoadmap)).toBeNull();
    });
});
