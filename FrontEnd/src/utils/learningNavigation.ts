export function getNextConcept(currentConceptId: string, roadmapData: any): { conceptId: string, phaseId: string } | null {
    if (!roadmapData || !roadmapData.phases) return null;
    
    let foundCurrent = false;

    for (let pIndex = 0; pIndex < roadmapData.phases.length; pIndex++) {
        const phase = roadmapData.phases[pIndex];
        if (!phase.concepts) continue;

        for (let cIndex = 0; cIndex < phase.concepts.length; cIndex++) {
            const c = phase.concepts[cIndex];
            const currentId = c.id || c.name;

            if (foundCurrent) {
                // Return the very next concept found
                return { conceptId: currentId, phaseId: `phase_${pIndex + 1}` };
            }

            if (currentId === currentConceptId) {
                foundCurrent = true;
            }
        }
    }

    return null; // Last concept or not found
}
