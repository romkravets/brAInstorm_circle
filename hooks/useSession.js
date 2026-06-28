'use client';
import { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { saveSession, loadSession } from '../lib/storage.js';
import { getNextColor, PARTICIPANT_COLORS } from '../lib/colors.js';
import { AI_PRESETS } from '../lib/participants.js';

function makeParticipant(preset, participants) {
  return { ...preset, id: nanoid(), color: getNextColor(participants), addedAt: Date.now() };
}

const DEFAULT_SESSION = () => {
  const p0 = makeParticipant(AI_PRESETS[0], []);
  const p1 = makeParticipant(AI_PRESETS[1], [p0]);
  return {
    id: nanoid(),
    title: 'Нова сесія',
    question: '',
    mode: 'synthesis',
    participants: [p0, p1],
    rounds: [{ id: 1, label: 'Раунд 1', responses: {}, synthesis: '', createdAt: Date.now(), completedAt: null }],
    currentRound: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

function reducer(state, action) {
  const now = Date.now();
  switch (action.type) {
    case 'LOAD':
      return action.session;

    case 'SET_QUESTION':
      return { ...state, question: action.question, updatedAt: now };

    case 'SET_MODE':
      return { ...state, mode: action.mode, updatedAt: now };

    case 'SET_TITLE':
      return { ...state, title: action.title, updatedAt: now };

    case 'ADD_PARTICIPANT': {
      const p = makeParticipant(action.preset, state.participants);
      return { ...state, participants: [...state.participants, p], updatedAt: now };
    }

    case 'REMOVE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.filter(p => p.id !== action.id),
        updatedAt: now,
      };

    case 'UPDATE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.map(p => p.id === action.id ? { ...p, ...action.updates } : p),
        updatedAt: now,
      };

    case 'SET_RESPONSE': {
      const rounds = state.rounds.map(r =>
        r.id === action.roundId
          ? { ...r, responses: { ...r.responses, [action.participantId]: action.text } }
          : r
      );
      return { ...state, rounds, updatedAt: now };
    }

    case 'SET_SYNTHESIS': {
      const rounds = state.rounds.map(r =>
        r.id === action.roundId ? { ...r, synthesis: action.text } : r
      );
      return { ...state, rounds, updatedAt: now };
    }

    case 'RENAME_ROUND': {
      const rounds = state.rounds.map(r =>
        r.id === action.roundId ? { ...r, label: action.label } : r
      );
      return { ...state, rounds, updatedAt: now };
    }

    case 'NEW_ROUND': {
      const nextId = Math.max(...state.rounds.map(r => r.id)) + 1;
      const rounds = [
        ...state.rounds.map(r => r.id === state.currentRound ? { ...r, completedAt: now } : r),
        { id: nextId, label: `Раунд ${nextId}`, responses: {}, synthesis: '', createdAt: now, completedAt: null },
      ];
      return { ...state, rounds, currentRound: nextId, updatedAt: now };
    }

    case 'SWITCH_ROUND':
      return { ...state, currentRound: action.roundId };

    case 'RESET':
      return DEFAULT_SESSION();

    default:
      return state;
  }
}

export function useSession() {
  const [session, dispatch] = useReducer(reducer, null, () => {
    if (typeof window === 'undefined') return DEFAULT_SESSION();
    return loadSession() ?? DEFAULT_SESSION();
  });

  const [savedAt, setSavedAt]   = useState(null);
  const [isNew,   setIsNew]     = useState(false);
  const saveTimer               = useRef(null);
  const isFirst                 = useRef(true);

  // detect first-time user (no saved session)
  useEffect(() => {
    if (typeof window !== 'undefined' && !loadSession()) setIsNew(true);
  }, []);

  // autosave debounced 2s
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSession(session);
      setSavedAt(Date.now());
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [session]);

  const currentRound = session.rounds.find(r => r.id === session.currentRound) ?? session.rounds[0];

  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET' });
    setIsNew(false);
  }, []);

  return { session, dispatch, savedAt, isNew, currentRound, resetSession };
}
