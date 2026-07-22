import { generatePrompt } from "../../../../lib/promptTemplates.js";
import {
  buildCrossCheckPrompt,
  generateWithOllama,
  getParticipantModel,
  jsonError,
  normalizeOllamaError,
  parseJsonObject,
} from "../../../../lib/server/ollama.js";

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Очікувався JSON body.");
  }

  const {
    question,
    mode = "synthesis",
    participants = [],
    round,
    rounds = [],
    settings = {},
  } = payload ?? {};

  if (!question || !round || !Array.isArray(participants)) {
    return jsonError(400, "invalid_payload", "Некоректний payload.");
  }

  const runnableParticipants = participants.filter(
    (participant) => participant.respondMode !== "manual",
  );
  if (!runnableParticipants.length) {
    return jsonError(
      400,
      "no_runnable_participants",
      "Додай хоча б одного auto-учасника (Ollama або API).",
    );
  }

  const results = await Promise.allSettled(
    runnableParticipants.map(async (participant) => {
      const model = getParticipantModel(participant);
      const prompt = generatePrompt({
        type: "initial",
        mode,
        question,
        sourceName: "",
        sourceResponse: "",
        round,
        rounds,
        participants,
      });

      const rolePrompt = participant.role
        ? `${prompt}\n\n[Твоя роль]: ${participant.role}`
        : prompt;

      const result = await generateWithOllama({
        model,
        prompt: rolePrompt,
        timeoutMs: settings.timeoutMs ?? 120000,
      });

      return {
        participantId: participant.id,
        name: participant.name,
        model,
        text: result.text,
        latencyMs: result.latencyMs,
      };
    }),
  );

  const responses = {};
  const participantMeta = {};
  const errors = [];
  const successfulResponses = [];

  results.forEach((result, index) => {
    const participant = runnableParticipants[index];
    const model = getParticipantModel(participant);

    if (result.status === "fulfilled") {
      responses[participant.id] = result.value.text;
      participantMeta[participant.id] = {
        status: "done",
        latencyMs: result.value.latencyMs,
      };
      successfulResponses.push({
        participantId: participant.id,
        name: participant.name,
        text: result.value.text,
      });
      return;
    }

    const { code, message } = normalizeOllamaError(result.reason, model);
    participantMeta[participant.id] = {
      status: "error",
      latencyMs: null,
      error: code,
      message,
    };
    errors.push({
      participantId: participant.id,
      error: code,
      message,
    });
  });

  let crossCheck = { agreements: [], conflicts: [], missing: [] };

  if (settings.crossCheck && successfulResponses.length >= 2) {
    const crossCheckModel =
      settings.crossCheckModel || getParticipantModel(runnableParticipants[0]);

    try {
      const crossCheckResult = await generateWithOllama({
        model: crossCheckModel,
        prompt: buildCrossCheckPrompt({
          question,
          mode,
          responses: successfulResponses,
        }),
        timeoutMs: settings.timeoutMs ?? 120000,
      });
      const parsed = parseJsonObject(crossCheckResult.text);
      if (parsed) {
        crossCheck = {
          agreements: Array.isArray(parsed.agreements) ? parsed.agreements : [],
          conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
          missing: Array.isArray(parsed.missing) ? parsed.missing : [],
        };
      }
    } catch (error) {
      const { code, message } = normalizeOllamaError(error, crossCheckModel);
      errors.push({
        participantId: "cross_check",
        error: code,
        message,
      });
    }
  }

  return Response.json({
    ok: successfulResponses.length > 0,
    stage: "done",
    responses,
    participantMeta,
    crossCheck,
    errors,
  });
}
