import { beforeEach, describe, expect, it, vi } from "vitest";

const { createCompletion, rateLimit } = vi.hoisted(() => ({
  createCompletion: vi.fn(),

  rateLimit: vi.fn(),
}));

vi.mock("groq-sdk", () => {
  class MockGroq {
    chat = {
      completions: {
        create: createCompletion,
      },
    };
  }

  return {
    default: MockGroq,
  };
});

vi.mock("@/lib/rateLimit", () => ({
  aiGuideRateLimit: {
    limit: rateLimit,
  },
}));

import { POST } from "@/app/api/guide/route";

import {
  LUBECK_HISTORIC_TOUR_ID,
  TOUR_CONTEXT_VERSION,
} from "@/lib/tourContext";

function modelAnswer({
  answer,
  groundingStatus,
  usedChunkIds,
}: {
  answer: string;

  groundingStatus:
    | "grounded"
    | "insufficient_evidence";

  usedChunkIds: readonly string[];
}) {
  return JSON.stringify({
    answer,
    groundingStatus,
    usedChunkIds,
  });
}

describe("POST /api/guide", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.GROQ_API_KEY = "test-key";

    rateLimit.mockResolvedValue({
      success: true,

      limit: 10,

      remaining: 9,

      reset: Date.now() + 60_000,
    });

    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: modelAnswer({
              answer: "I do not have enough verified information.",

              groundingStatus: "insufficient_evidence",

              usedChunkIds: [],
            }),
          },

          finish_reason: "stop",
        },
      ],

      usage: {},
    });
  });

  it("builds trusted multi-stop RAG context", async () => {
    createCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: modelAnswer({
              answer: "A contextual verified answer.",

              groundingStatus: "grounded",

              usedChunkIds: [
                "rathaus-political-role",
                "holstentor-history",
                "fake-chunk",
              ],
            }),
          },

          finish_reason: "stop",
        },
      ],

      usage: {},
    });
    const request = new Request("http://localhost/api/guide", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        "x-forwarded-for": "127.0.0.1",
      },

      body: JSON.stringify({
        question: "How does this connect to the earlier stops?",

        landmark: "rathaus",

        locale: "en",

        history: [],

        tourContext: {
          version: TOUR_CONTEXT_VERSION,

          tourId: LUBECK_HISTORIC_TOUR_ID,

          currentStop: "rathaus",

          visitedStops: ["holstentor", "marienkirche"],
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data.answer).toBe("A contextual verified answer.");

    expect(Array.isArray(data.sources)).toBe(true);

    expect(data.sources.length).toBeGreaterThan(0);

    expect(
      data.sources.some(
        (source: { placeSlug: string }) => source.placeSlug === "rathaus",
      ),
    ).toBe(true);

    expect(
      data.sources.some(
        (source: { placeSlug: string }) =>
          source.placeSlug === "heiligen-geist-hospital",
      ),
    ).toBe(false);

    for (const source of data.sources) {
      expect(Object.keys(source).sort()).toEqual(
        ["chunkIds", "label", "placeSlug", "url", "verifiedAt"].sort(),
      );
    }
    expect(
      data.sources.some(
        (source: Record<string, unknown>) =>
          "question" in source ||
          "score" in source ||
          "prompt" in source ||
          "history" in source ||
          "latitude" in source ||
          "longitude" in source,
      ),
    ).toBe(false);
    expect(data.answer).toBe("A contextual verified answer.");
    expect(
      data.sources.some(
        (source: { placeSlug: string }) => source.placeSlug === "rathaus",
      ),
    ).toBe(true);

    expect(
      data.sources.some(
        (source: { placeSlug: string }) => source.placeSlug === "holstentor",
      ),
    ).toBe(true);

    expect(
      data.sources.some(
        (source: { placeSlug: string }) => source.placeSlug === "marienkirche",
      ),
    ).toBe(false);

    expect(
      data.sources.some(
        (source: { placeSlug: string }) =>
          source.placeSlug === "heiligen-geist-hospital",
      ),
    ).toBe(false);

    expect(JSON.stringify(data)).not.toContain("[[SOURCES:");
    expect(createCompletion).toHaveBeenCalledOnce();

    const groqRequest = createCompletion.mock.calls[0][0];

    expect(groqRequest.reasoning_effort).toBe("low");

    expect(groqRequest.include_reasoning).toBe(false);

    expect(groqRequest.max_completion_tokens).toBe(1024);

    expect(groqRequest.response_format).toMatchObject({
      type: "json_schema",

      json_schema: {
        name: "citywalk_guide_answer",

        strict: true,
      },
    });

    expect(groqRequest).not.toHaveProperty("max_tokens");

    const systemMessage = groqRequest.messages.find(
      (message: {
        role: string;

        content: string;
      }) => message.role === "system",
    );

    expect(systemMessage.content).toContain("3 of 5");

    expect(systemMessage.content).toContain("Holstentor");

    expect(systemMessage.content).toContain("Marienkirche");

    expect(systemMessage.content).toContain(
      "NEXT STOP:\nHeiligen-Geist-Hospital",
    );

    expect(systemMessage.content).toContain("VERIFIED RETRIEVED KNOWLEDGE");

    expect(systemMessage.content).toContain("rathaus-political-role");

    expect(systemMessage.content).toContain("holstentor-history");

    expect(systemMessage.content).toContain("marienkirche-history");

    /*
     * Hospital is the NEXT stop.
     * Its factual chunk must not
     * be injected.
     */
    expect(systemMessage.content).not.toContain("hospital-foundation");

    /*
     * Source URLs stay server-side.
     */
    expect(systemMessage.content).not.toContain("https://");

    expect(systemMessage.content).not.toMatch(
      /latitude|longitude|"lat"|"lng"/i,
    );
  });

  it("returns the official source for a grounded Holstentor answer", async () => {
    createCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: modelAnswer({
              answer: "The Holstentor was built between 1464 and 1478.",

              groundingStatus: "grounded",

              usedChunkIds: ["holstentor-history"],
            }),
          },

          finish_reason: "stop",
        },
      ],

      usage: {},
    });

    const response = await POST(
      new Request("http://localhost/api/guide", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: "When was this gate built?",

          landmark: "holstentor",

          locale: "en",

          history: [],
        }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(200);

    expect(data.answer).toContain("1464");

    expect(data.answer).toContain("1478");

    expect(data.sources).toEqual([
      expect.objectContaining({
        placeSlug: "holstentor",

        url: "https://museum-holstentor.de/about-holstentor",

        chunkIds: ["holstentor-history"],
      }),
    ]);
  });

  it("retries once when a grounded answer has no valid chunk IDs", async () => {
    createCompletion
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: modelAnswer({
                answer: "The gate was built between 1464 and 1478.",

                groundingStatus: "grounded",

                usedChunkIds: ["fake-chunk"],
              }),
            },

            finish_reason: "stop",
          },
        ],

        usage: {},
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: modelAnswer({
                answer: "The Holstentor was built between 1464 and 1478.",

                groundingStatus: "grounded",

                usedChunkIds: ["holstentor-history"],
              }),
            },

            finish_reason: "stop",
          },
        ],

        usage: {},
      });

    const response = await POST(
      new Request("http://localhost/api/guide", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: "When was this gate built?",

          landmark: "holstentor",

          locale: "en",
        }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(200);

    expect(createCompletion).toHaveBeenCalledTimes(2);

    expect(
      createCompletion.mock.calls[1][0].messages[0].content,
    ).toContain("ATTRIBUTION CORRECTION");

    expect(data.answer).toContain("1464");

    expect(data.sources[0].chunkIds).toEqual(["holstentor-history"]);
  });

  it("fails closed after one retry without valid grounded attribution", async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: modelAnswer({
              answer: "The gate was built between 1464 and 1478.",

              groundingStatus: "grounded",

              usedChunkIds: ["fake-chunk"],
            }),
          },

          finish_reason: "stop",
        },
      ],

      usage: {},
    });

    const response = await POST(
      new Request("http://localhost/api/guide", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: "When was this gate built?",

          landmark: "holstentor",

          locale: "en",
        }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(200);

    expect(createCompletion).toHaveBeenCalledTimes(2);

    expect(data.answer).toBe(
      "I don't have enough verified information to answer that.",
    );

    expect(data.answer).not.toContain("1464");

    expect(data.sources).toEqual([]);
  });

  it("accepts insufficient evidence without sources or a retry", async () => {
    const response = await POST(
      new Request("http://localhost/api/guide", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: "What happened here yesterday?",

          landmark: "holstentor",

          locale: "en",
        }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(200);

    expect(createCompletion).toHaveBeenCalledOnce();

    expect(data.answer).toBe("I do not have enough verified information.");

    expect(data.sources).toEqual([]);
  });

  it("keeps requests without tour context working", async () => {
    const request = new Request("http://localhost/api/guide", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        question: "Why is this gate important?",

        landmark: "holstentor",

        locale: "en",

        history: [],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    expect(createCompletion).toHaveBeenCalledOnce();

    const systemMessage = createCompletion.mock.calls[0][0].messages[0];

    expect(systemMessage.content).toContain("No active tour context.");

    expect(systemMessage.content).toContain("VERIFIED RETRIEVED KNOWLEDGE");

    expect(systemMessage.content).toContain("holstentor-history");
  });

  it("rejects forged current-stop context", async () => {
    const request = new Request("http://localhost/api/guide", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        question: "Tell me about this place.",

        landmark: "holstentor",

        locale: "en",

        tourContext: {
          version: TOUR_CONTEXT_VERSION,

          tourId: LUBECK_HISTORIC_TOUR_ID,

          currentStop: "rathaus",

          visitedStops: [],
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("anchors ambiguous follow-up questions to the current stop", async () => {
    const request = new Request("http://localhost/api/guide", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        question: "Why is it famous?",

        landmark: "heiligen-geist-hospital",

        locale: "en",

        history: [
          {
            role: "user",

            text: "Why is Holstentor important?",
          },
          {
            role: "assistant",

            text: "Holstentor was built between 1464 and 1478.",
          },
        ],

        tourContext: {
          version: TOUR_CONTEXT_VERSION,

          tourId: LUBECK_HISTORIC_TOUR_ID,

          currentStop: "heiligen-geist-hospital",

          visitedStops: ["holstentor", "marienkirche", "rathaus"],
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    const groqRequest = createCompletion.mock.calls[0][0];

    const currentTurn = groqRequest.messages[groqRequest.messages.length - 1];

    expect(currentTurn.role).toBe("user");

    expect(currentTurn.content).toContain(
      "CURRENT STOP:\nHeiligen-Geist-Hospital",
    );

    expect(currentTurn.content).toContain(
      "CURRENT QUESTION:\nWhy is it famous?",
    );

    expect(currentTurn.content).toContain("refer to CURRENT STOP");

    /*
     * Current stop RAG evidence
     * must be available despite
     * previous-stop conversation.
     */
    const systemMessage = groqRequest.messages[0];

    expect(systemMessage.content).toContain("hospital-foundation");
  });
});
