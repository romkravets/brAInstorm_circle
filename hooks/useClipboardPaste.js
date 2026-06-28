'use client';
import { useEffect, useRef } from 'react';

// Fires onPaste({ text, targetParticipant }) when user switches back to this tab
// and clipboard has text > 50 chars and at least one participant card is empty.
export function useClipboardPaste({ participants, currentRound, activeParticipantId, onPaste }) {
  const callbackRef = useRef(onPaste);
  callbackRef.current = onPaste;

  useEffect(() => {
    async function handleFocus() {
      if (!navigator?.clipboard?.readText) return;
      try {
        const text = await navigator.clipboard.readText();
        if (!text || text.length < 50) return;

        const target = activeParticipantId
          ? participants.find(p => p.id === activeParticipantId)
          : participants.find(p => !currentRound.responses[p.id]);

        if (!target) return;

        callbackRef.current({ text, targetParticipant: target });
      } catch {
        // clipboard permission denied or not supported — silent
      }
    }

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [participants, currentRound, activeParticipantId]);
}
