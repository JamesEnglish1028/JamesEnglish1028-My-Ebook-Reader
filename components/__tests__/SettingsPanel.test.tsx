

import { fireEvent, render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReaderSettings } from '../../domain/reader/types';
import SettingsPanel from '../SettingsPanel';

const baseSettings: ReaderSettings = {
  fontSize: 100,
  theme: 'light',
  flow: 'paginated',
  fontFamily: 'Original',
  citationFormat: 'apa',
  readAloud: { voiceURI: null, rate: 1, pitch: 1, volume: 1 },
};

describe('SettingsPanel', () => {
  beforeAll(() => {
    // @ts-ignore
    window.speechSynthesis = {
      getVoices: () => [],
      speak: () => { },
      cancel: () => { },
      onvoiceschanged: null,
    };
  });
  it('renders nothing when closed', () => {
    const { container } = render(
      <SettingsPanel isOpen={false} onClose={() => { }} settings={baseSettings} onSettingsChange={() => { }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders and displays settings when open', () => {
    const { getByText } = render(
      <SettingsPanel isOpen={true} onClose={() => { }} settings={baseSettings} onSettingsChange={() => { }} />
    );
    expect(getByText('Settings')).toBeInTheDocument();
    expect(getByText('Font Size')).toBeInTheDocument();
    expect(getByText('Theme')).toBeInTheDocument();
    expect(getByText('Font Family')).toBeInTheDocument();
    expect(getByText('Reading Mode')).toBeInTheDocument();
    expect(getByText('Citation Format')).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SettingsPanel isOpen={true} onClose={onClose} settings={baseSettings} onSettingsChange={() => { }} />
    );
    const overlay = container.querySelector('.fixed.inset-0');
    if (overlay) fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSettingsChange when font size is changed', () => {
    const onSettingsChange = vi.fn();
    const { getByLabelText } = render(
      <SettingsPanel isOpen={true} onClose={() => { }} settings={baseSettings} onSettingsChange={onSettingsChange} />
    );
    const slider = getByLabelText('Font Size');
    fireEvent.change(slider, { target: { value: '120' } });
    expect(onSettingsChange).toHaveBeenCalledWith({ fontSize: 120 });
  });

  it('calls onSettingsChange when theme is changed', () => {
    const onSettingsChange = vi.fn();
    const { getByText } = render(
      <SettingsPanel isOpen={true} onClose={() => { }} settings={baseSettings} onSettingsChange={onSettingsChange} />
    );
    fireEvent.click(getByText('Dark'));
    expect(onSettingsChange).toHaveBeenCalledWith({ theme: 'dark' });
  });
});
