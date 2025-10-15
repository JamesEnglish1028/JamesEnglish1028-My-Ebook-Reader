import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import SettingsPanel from '../SettingsPanel';

const baseSettings = {
  fontSize: 100,
  theme: 'light' as const,
  flow: 'paginated' as const,
  fontFamily: 'Original',
  citationFormat: 'apa' as const,
  readAloud: { voiceURI: null, rate: 1, pitch: 1, volume: 1 },
};

describe('SettingsPanel accessibility', () => {
  beforeAll(() => {
    // Mock speechSynthesis and getVoices
    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: {
        getVoices: () => [
          { voiceURI: 'mock-voice', name: 'Mock Voice', lang: 'en-US', localService: true, default: true },
        ],
      },
    });
  });
  it('has correct ARIA roles and supports keyboard navigation', async () => {
    const onClose = vi.fn();
    render(
      <SettingsPanel isOpen={true} onClose={onClose} settings={baseSettings} onSettingsChange={() => { }} />
    );
    // Dialog has role dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Heading is labelled
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
    // Tab navigation: focus first input
    const user = userEvent.setup();
    const firstInput = screen.getByLabelText(/font size/i);
    firstInput.focus();
    expect(document.activeElement).toBe(firstInput);
    await user.keyboard('{Tab}');
    // Should move to next focusable element (theme, etc.)
    // We can't guarantee exact order, but focus should move
    expect(document.activeElement).not.toBe(firstInput);
  });
});
