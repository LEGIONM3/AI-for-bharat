import { renderHook, act } from '@testing-library/react';
import { useVoice, sharedAudioPlayer } from '../useVoice';
import { voiceService } from '../../services/voiceService';

// Mock the voice service
jest.mock('../../services/voiceService', () => ({
    voiceService: {
        speak: jest.fn().mockResolvedValue('blob://mock-audio-url')
    }
}));

describe('useVoice hook', () => {
    let mockPlay: jest.Mock;
    let mockPause: jest.Mock;

    beforeAll(() => {
        // Mock global Audio interface
        mockPlay = jest.fn().mockResolvedValue(undefined);
        mockPause = jest.fn();

        global.Audio = jest.fn().mockImplementation((url) => {
            return {
                src: url,
                play: mockPlay,
                pause: mockPause,
                currentTime: 0,
                onended: null,
                onpause: null,
                onerror: null,
            };
        }) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
        sharedAudioPlayer.current = null; // Reset singleton context between tests
    });

    it('transitions correctly: idle -> loading -> playing -> idle', async () => {
        const { result } = renderHook(() => useVoice());
        expect(result.current.state).toBe('idle');

        let playPromise!: Promise<void>;
        act(() => {
            playPromise = result.current.playText('Hello world');
        });

        expect(result.current.state).toBe('loading');

        await act(async () => {
            await playPromise;
        });

        expect(result.current.state).toBe('playing');
        expect(mockPlay).toHaveBeenCalled();

        // Simulate audio ending naturally
        act(() => {
            if (sharedAudioPlayer.current && sharedAudioPlayer.current.onended) {
                sharedAudioPlayer.current.onended({} as any);
            }
        });

        expect(result.current.state).toBe('idle');
    });

    it('verify that calling play a second time stops the first audio instance before starting a new one', () => {
        const { result } = renderHook(() => useVoice());

        act(() => {
            result.current.playBytes('blob://first');
        });
        const firstAudio = sharedAudioPlayer.current;
        expect(firstAudio).toBeTruthy();
        expect(result.current.state).toBe('playing');

        act(() => {
            result.current.playBytes('blob://second');
        });

        const secondAudio = sharedAudioPlayer.current;
        expect(mockPause).toHaveBeenCalledTimes(1); 
        expect(firstAudio).not.toBe(secondAudio);
        expect(result.current.state).toBe('playing');
    });

    it('component unmount triggers audio stop cleanup', () => {
        const { result, unmount } = renderHook(() => useVoice());

        act(() => {
            result.current.playBytes('blob://test');
        });

        expect(sharedAudioPlayer.current).toBeTruthy();

        act(() => {
            unmount();
        });

        expect(mockPause).toHaveBeenCalled();
        expect(sharedAudioPlayer.current).toBeNull();
    });

    it('verify that Ask AI voice stops AI Summary voice if Summary is currently playing', () => {
        const { result: summaryResult } = renderHook(() => useVoice());
        const { result: askAiResult } = renderHook(() => useVoice());

        // Step 1: Play summary
        act(() => {
            summaryResult.current.playBytes('blob://summary');
        });
        expect(summaryResult.current.state).toBe('playing');
        const summaryAudio = sharedAudioPlayer.current;

        // Step 2: Play Ask AI
        act(() => {
            askAiResult.current.playBytes('blob://ask-ai');
        });
        expect(askAiResult.current.state).toBe('playing');
        // Summary audio pause method called
        expect(mockPause).toHaveBeenCalled();
        
        // Native dispatch of onpause handler inside dummy API object
        act(() => {
            if (summaryAudio && summaryAudio.onpause) {
                summaryAudio.onpause({} as any);
            }
        });
        
        // Summary state synced
        expect(summaryResult.current.state).toBe('idle');
        expect(sharedAudioPlayer.current).not.toBe(summaryAudio);
    });
});
