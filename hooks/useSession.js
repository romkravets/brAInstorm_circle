"use client";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getNextColor } from "../lib/colors.js";
import { AI_PRESETS } from "../lib/participants.js";
import { loadSession, saveSession } from "../lib/storage.js";

function makeParticipant(preset, participants) {
  return {
    ...preset,
    id: nanoid(),
    color: getNextColor(participants),
    addedAt: Date.now(),
  };
}

function createRunMeta() {
  return {
    status: "idle",
    stage: "idle",
    startedAt: null,
    finishedAt: null,
    total: 0,
    completed: 0,
    errors: [],
  };
}

function createParticipantMeta(participants) {
  return Object.fromEntries(
    participants.map((p) => [
      p.id,
      {
        status: "idle",
        error: "",
        latencyMs: null,
        updatedAt: null,
      },
    ]),
  );
}

function hydrateSessionShape(session) {
  if (!session) return null;

  const participants = session.participants ?? [];
  const rounds = (session.rounds ?? []).map((round) => ({
    ...round,
    crossCheck: {
      agreements: Array.isArray(round?.crossCheck?.agreements)
        ? round.crossCheck.agreements
        : [],
      conflicts: Array.isArray(round?.crossCheck?.conflicts)
        ? round.crossCheck.conflicts
        : [],
      missing: Array.isArray(round?.crossCheck?.missing)
        ? round.crossCheck.missing
        : [],
    },
  }));
  const participantMeta = { ...(session.participantMeta ?? {}) };
  for (const p of participants) {
    if (!participantMeta[p.id]) {
      participantMeta[p.id] = {
        status: "idle",
        error: "",
        latencyMs: null,
        updatedAt: null,
      };
    }
  }

  return {
    ...session,
    rounds,
    runMeta: {
      ...createRunMeta(),
      ...(session.runMeta ?? {}),
    },
    participantMeta,
  };
}

const DEFAULT_SESSION = () => {
  const p0 = makeParticipant(AI_PRESETS[0], []);
  const p1 = makeParticipant(AI_PRESETS[1], [p0]);
  const participants = [p0, p1];
  return {
    id: nanoid(),
    title: "Нова сесія",
    question: "",
    mode: "synthesis",
    participants,
    rounds: [
      {
        id: 1,
        label: "Раунд 1",
        responses: {},
        crossCheck: {
          agreements: [],
          conflicts: [],
          missing: [],
        },
        synthesis: "",
        createdAt: Date.now(),
        completedAt: null,
      },
    ],
    currentRound: 1,
    runMeta: createRunMeta(),
    participantMeta: createParticipantMeta(participants),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

function reducer(state, action) {
  const now = Date.now();
  switch (action.type) {
    case "LOAD":
      return action.session;

    case "SET_QUESTION":
      return { ...state, question: action.question, updatedAt: now };

    case "SET_MODE":
      return { ...state, mode: action.mode, updatedAt: now };

    case "SET_TITLE":
      return { ...state, title: action.title, updatedAt: now };

    case "ADD_PARTICIPANT": {
      const p = makeParticipant(action.preset, state.participants);
      return {
        ...state,
        participants: [...state.participants, p],
        participantMeta: {
          ...state.participantMeta,
          [p.id]: {
            status: "idle",
            error: "",
            latencyMs: null,
            updatedAt: null,
          },
        },
        updatedAt: now,
      };
    }

    case "REMOVE_PARTICIPANT":
      return {
        ...state,
        participants: state.participants.filter((p) => p.id !== action.id),
        participantMeta: Object.fromEntries(
          Object.entries(state.participantMeta).filter(
            ([id]) => id !== action.id,
          ),
        ),
        updatedAt: now,
      };

    case "UPDATE_PARTICIPANT":
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.id ? { ...p, ...action.updates } : p,
        ),
        updatedAt: now,
      };

    case "SET_RESPONSE": {
      const rounds = state.rounds.map((r) =>
        r.id === action.roundId
          ? {
              ...r,
              responses: {
                ...r.responses,
                [action.participantId]: action.text,
              },
            }
          : r,
      );
      return { ...state, rounds, updatedAt: now };
    }

    case "SET_SYNTHESIS": {
      const rounds = state.rounds.map((r) =>
        r.id === action.roundId ? { ...r, synthesis: action.text } : r,
      );
      return { ...state, rounds, updatedAt: now };
    }

    case "SET_CROSS_CHECK": {
      const rounds = state.rounds.map((r) =>
        r.id === action.roundId
          ? {
              ...r,
              crossCheck: {
                agreements: Array.isArray(action.crossCheck?.agreements)
                  ? action.crossCheck.agreements
                  : [],
                conflicts: Array.isArray(action.crossCheck?.conflicts)
                  ? action.crossCheck.conflicts
                  : [],
                missing: Array.isArray(action.crossCheck?.missing)
                  ? action.crossCheck.missing
                  : [],
              },
            }
          : r,
      );
      return { ...state, rounds, updatedAt: now };
    }

    case "RENAME_ROUND": {
      const rounds = state.rounds.map((r) =>
        r.id === action.roundId ? { ...r, label: action.label } : r,
      );
      return { ...state, rounds, updatedAt: now };
    }

    case "NEW_ROUND": {
      if (state.runMeta?.status === "running") return state;
      const nextId = Math.max(...state.rounds.map((r) => r.id)) + 1;
      const rounds = [
        ...state.rounds.map((r) =>
          r.id === state.currentRound ? { ...r, completedAt: now } : r,
        ),
        {
          id: nextId,
          label: `Раунд ${nextId}`,
          responses: {},
          crossCheck: {
            agreements: [],
            conflicts: [],
            missing: [],
          },
          synthesis: "",
          createdAt: now,
          completedAt: null,
        },
      ];
      return {
        ...state,
        rounds,
        currentRound: nextId,
        runMeta: createRunMeta(),
        participantMeta: Object.fromEntries(
          state.participants.map((p) => [
            p.id,
            {
              status: "idle",
              error: "",
              latencyMs: null,
              updatedAt: null,
            },
          ]),
        ),
        updatedAt: now,
      };
    }

    case "START_ROUND_RUN":
      if (state.runMeta?.status === "running") return state;
      return {
        ...state,
        runMeta: {
          status: "running",
          stage: action.stage ?? "generating",
          startedAt: now,
          finishedAt: null,
          total: action.total ?? 0,
          completed: 0,
          errors: [],
        },
        participantMeta: Object.fromEntries(
          state.participants.map((p) => [
            p.id,
            {
              status: "idle",
              error: "",
              latencyMs: null,
              updatedAt: now,
            },
          ]),
        ),
        updatedAt: now,
      };

    case "SET_RUN_STAGE":
      return {
        ...state,
        runMeta: {
          ...state.runMeta,
          stage: action.stage,
        },
        updatedAt: now,
      };

    case "SET_PARTICIPANT_RUNNING":
      return {
        ...state,
        participantMeta: {
          ...state.participantMeta,
          [action.participantId]: {
            ...(state.participantMeta[action.participantId] ?? {}),
            status: "running",
            error: "",
            updatedAt: now,
          },
        },
        updatedAt: now,
      };

    case "SET_PARTICIPANT_DONE": {
      const completed = Math.min(
        state.runMeta?.total ?? 0,
        (state.runMeta?.completed ?? 0) + 1,
      );
      return {
        ...state,
        runMeta: {
          ...state.runMeta,
          completed,
        },
        participantMeta: {
          ...state.participantMeta,
          [action.participantId]: {
            ...(state.participantMeta[action.participantId] ?? {}),
            status: "done",
            error: "",
            latencyMs: action.latencyMs ?? null,
            updatedAt: now,
          },
        },
        updatedAt: now,
      };
    }

    case "SET_PARTICIPANT_ERROR": {
      const completed = Math.min(
        state.runMeta?.total ?? 0,
        (state.runMeta?.completed ?? 0) + 1,
      );
      return {
        ...state,
        runMeta: {
          ...state.runMeta,
          completed,
          errors: [
            ...(state.runMeta?.errors ?? []),
            action.error || "run_error",
          ],
        },
        participantMeta: {
          ...state.participantMeta,
          [action.participantId]: {
            ...(state.participantMeta[action.participantId] ?? {}),
            status: "error",
            error: action.error || "run_error",
            updatedAt: now,
          },
        },
        updatedAt: now,
      };
    }

    case "FINISH_ROUND_RUN":
      return {
        ...state,
        runMeta: {
          ...state.runMeta,
          status: "done",
          stage: action.stage ?? "idle",
          finishedAt: now,
        },
        updatedAt: now,
      };

    case "FAIL_ROUND_RUN":
      return {
        ...state,
        runMeta: {
          ...state.runMeta,
          status: "failed",
          stage: "idle",
          finishedAt: now,
          errors: [
            ...(state.runMeta?.errors ?? []),
            action.error || "run_failed",
          ],
        },
        updatedAt: now,
      };

    case "RESET_RUN_META":
      return {
        ...state,
        runMeta: createRunMeta(),
        participantMeta: Object.fromEntries(
          state.participants.map((p) => [
            p.id,
            {
              status: "idle",
              error: "",
              latencyMs: null,
              updatedAt: now,
            },
          ]),
        ),
        updatedAt: now,
      };

    case "SWITCH_ROUND":
      return { ...state, currentRound: action.roundId };

    case "RESET":
      return DEFAULT_SESSION();

    default:
      return state;
  }
}

export function useSession() {
  const [session, dispatch] = useReducer(reducer, null, () => {
    if (typeof window === "undefined") return DEFAULT_SESSION();
    return hydrateSessionShape(loadSession()) ?? DEFAULT_SESSION();
  });

  const [savedAt, setSavedAt] = useState(null);
  const [isNew, setIsNew] = useState(() => {
    if (typeof window === "undefined") return false;
    return !loadSession();
  });
  const saveTimer = useRef(null);
  const isFirst = useRef(true);

  // autosave debounced 2s
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSession(session);
      setSavedAt(Date.now());
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [session]);

  const currentRound =
    session.rounds.find((r) => r.id === session.currentRound) ??
    session.rounds[0];

  const resetSession = useCallback(() => {
    dispatch({ type: "RESET" });
    setIsNew(false);
  }, []);

  return {
    session,
    dispatch,
    savedAt,
    isNew,
    currentRound,
    resetSession,
    runMeta: session.runMeta,
    participantMeta: session.participantMeta,
  };
}
