import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LearningLessonPage from '../page';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConceptLearning } from '@/hooks/useConceptLearning';
import * as learningNavigation from '@/utils/learningNavigation';

// Mock routing hooks
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    useSearchParams: jest.fn(),
}));

jest.mock('@/hooks/useConceptLearning', () => ({
    useConceptLearning: jest.fn(),
    STEPS: ["concept", "sandbox", "quiz", "skill_gap", "integrity", "complete"],
}));

jest.mock('@/context/LanguageContext', () => ({
    useLanguage: () => ({ t: (k: string) => k })
}));

// Mock API client if it mounts fetching things implicitly
jest.mock('@/services/apiClient', () => ({
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} })
}));

jest.mock('@/utils/learningNavigation', () => ({
    getNextConcept: jest.fn(),
}));

describe('Learning Navigation Flow UI', () => {
    const mockRouterPush = jest.fn();
    const mockSetActiveStep = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Return dummy parameters matching our logic test cases
        (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });
        (useSearchParams as jest.Mock).mockReturnValue({
            get: (key: string) => {
                if (key === 'concept') return 'c1';
                if (key === 'roadmap') return 'target-roadmap-id';
                if (key === 'topic') return 'react';
                return null;
            }
        });
        
        // Tell the component it's on the complete step
        (useConceptLearning as jest.Mock).mockReturnValue({
            currentStep: "complete",
            isConceptFinished: true, // We mapped this internally as true initially
            setActiveStep: mockSetActiveStep,
            conceptModule: { title: "Test Concept" },
            isRoadmapCompleted: false, // Don't trigger RoadmapMastery overlay
            chatMessages: [], // Prevent undefined.length crashes
        });
    });

    it('verify that clicking Continue advances to the next concept', async () => {
        (learningNavigation.getNextConcept as jest.Mock).mockReturnValue({ conceptId: "c2", phaseId: "phase_1" });
        
        render(<LearningLessonPage />);
        // Wait for screen state flip (isConceptFinished boolean is checked async from useEffect naturally)
        await waitFor(() => {
            expect(screen.getByText(/Continue/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Continue/i));
        
        expect(mockSetActiveStep).toHaveBeenCalledWith(1);
        expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('concept=c2'));
    });

    it('verify that clicking Exit routes back to Roadmap', async () => {
        (learningNavigation.getNextConcept as jest.Mock).mockReturnValue({ conceptId: "c2", phaseId: "phase_1" });

        render(<LearningLessonPage />);
        await waitFor(() => {
            expect(screen.getByText(/Exit to Roadmap/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Exit to Roadmap/i));
        
        expect(mockRouterPush).toHaveBeenCalledWith('/learning/roadmap/target-roadmap-id');
    });

    it('verify that on the last concept, Complete Course button appears instead of Continue', async () => {
        (learningNavigation.getNextConcept as jest.Mock).mockReturnValue(null); // Last concept simulation
        
        render(<LearningLessonPage />);
        await waitFor(() => {
            expect(screen.getByText(/Complete Course/i)).toBeInTheDocument();
        });

        expect(screen.queryByText(/Continue/)).not.toBeInTheDocument();

        fireEvent.click(screen.getByText(/Complete Course/i));
        
        // Routes back to roadmap on finish, exactly like Exit currently configured
        expect(mockRouterPush).toHaveBeenCalledWith('/learning/roadmap/target-roadmap-id');
    });
});
