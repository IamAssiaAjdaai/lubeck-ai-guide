import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  createCompletion,
  rateLimit,
} = vi.hoisted(
  () => ({
    createCompletion:
      vi.fn(),

    rateLimit:
      vi.fn(),
  }),
);

vi.mock(
  "groq-sdk",
  () => {
    class MockGroq {
      chat = {
        completions: {
          create:
            createCompletion,
        },
      };
    }

    return {
      default:
        MockGroq,
    };
  },
);

vi.mock(
  "@/lib/rateLimit",
  () => ({
    aiGuideRateLimit: {
      limit:
        rateLimit,
    },
  }),
);

import {
  POST,
} from "@/app/api/guide/route";

import {
  LUBECK_HISTORIC_TOUR_ID,
  TOUR_CONTEXT_VERSION,
} from "@/lib/tourContext";

describe(
  "POST /api/guide",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        process.env.GROQ_API_KEY =
          "test-key";

        rateLimit.mockResolvedValue({
          success:
            true,

          limit:
            10,

          remaining:
            9,

          reset:
            Date.now() +
            60_000,
        });

        createCompletion.mockResolvedValue({
          choices: [
            {
              message: {
                content:
                  "A contextual verified answer.",
              },

              finish_reason:
                "stop",
            },
          ],

          usage: {},
        });
      },
    );

    it(
      "builds trusted multi-stop RAG context",
      async () => {
        const request =
          new Request(
            "http://localhost/api/guide",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "x-forwarded-for":
                  "127.0.0.1",
              },

              body:
                JSON.stringify({
                  question:
                    "How does this connect to the earlier stops?",

                  landmark:
                    "rathaus",

                  locale:
                    "en",

                  history:
                    [],

                  tourContext: {
                    version:
                      TOUR_CONTEXT_VERSION,

                    tourId:
                      LUBECK_HISTORIC_TOUR_ID,

                    currentStop:
                      "rathaus",

                    visitedStops: [
                      "holstentor",
                      "marienkirche",
                    ],
                  },
                }),
            },
          );

        const response =
          await POST(
            request,
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        const data =
          await response.json();

        expect(
          data.answer,
        ).toBe(
          "A contextual verified answer.",
        );

        expect(
          Array.isArray(
            data.sources,
          ),
        ).toBe(true);

        expect(
          data.sources.length,
        ).toBeGreaterThan(0);

        expect(
          data.sources.some(
            (
              source: {
                placeSlug: string;
              },
            ) =>
              source.placeSlug ===
              "rathaus",
          ),
        ).toBe(true);

        expect(
          data.sources.some(
            (
              source: {
                placeSlug: string;
              },
            ) =>
              source.placeSlug ===
              "heiligen-geist-hospital",
          ),
        ).toBe(false);

        expect(
          JSON.stringify(
            data.sources,
          ),
        ).not.toMatch(
          /question|score|prompt|history|latitude|longitude/i,
        );
        
        expect(
          createCompletion,
        ).toHaveBeenCalledOnce();

        const groqRequest =
          createCompletion
            .mock
            .calls[0][0];

        expect(
          groqRequest.reasoning_effort,
        ).toBe(
          "low",
        );

        expect(
          groqRequest.include_reasoning,
        ).toBe(
          false,
        );

        expect(
          groqRequest.max_completion_tokens,
        ).toBe(
          1024,
        );

        expect(
          groqRequest,
        ).not.toHaveProperty(
          "max_tokens",
        );

        const systemMessage =
          groqRequest.messages.find(
            (
              message: {
                role:
                  string;

                content:
                  string;
              },
            ) =>
              message.role ===
              "system",
          );

        expect(
          systemMessage.content,
        ).toContain(
          "3 of 5",
        );

        expect(
          systemMessage.content,
        ).toContain(
          "Holstentor",
        );

        expect(
          systemMessage.content,
        ).toContain(
          "Marienkirche",
        );

        expect(
          systemMessage.content,
        ).toContain(
          "NEXT STOP:\nHeiligen-Geist-Hospital",
        );

        expect(
          systemMessage.content,
        ).toContain(
          "VERIFIED RETRIEVED KNOWLEDGE",
        );

        expect(
          systemMessage.content,
        ).toContain(
          "rathaus-political-role",
        );

        expect(
          systemMessage.content,
        ).toContain(
          "holstentor-history",
        );

        expect(
          systemMessage.content,
        ).toContain(
          "marienkirche-history",
        );

        /*
         * Hospital is the NEXT stop.
         * Its factual chunk must not
         * be injected.
         */
        expect(
          systemMessage.content,
        ).not.toContain(
          "hospital-foundation",
        );

        /*
         * Source URLs stay server-side.
         */
        expect(
          systemMessage.content,
        ).not.toContain(
          "https://",
        );

        expect(
          systemMessage.content,
        ).not.toMatch(
          /latitude|longitude|"lat"|"lng"/i,
        );
      },
    );

    it(
      "keeps requests without tour context working",
      async () => {
        const request =
          new Request(
            "http://localhost/api/guide",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  question:
                    "Why is this gate important?",

                  landmark:
                    "holstentor",

                  locale:
                    "en",

                  history:
                    [],
                }),
            },
          );

        const response =
          await POST(
            request,
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        expect(
          createCompletion,
        ).toHaveBeenCalledOnce();

        const systemMessage =
          createCompletion
            .mock
            .calls[0][0]
            .messages[0];

        expect(
          systemMessage.content,
        ).toContain(
          "No active tour context.",
        );

        expect(
          systemMessage.content,
        ).toContain(
          "VERIFIED RETRIEVED KNOWLEDGE",
        );

        expect(
          systemMessage.content,
        ).toContain(
          "holstentor-history",
        );
      },
    );

    it(
      "rejects forged current-stop context",
      async () => {
        const request =
          new Request(
            "http://localhost/api/guide",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  question:
                    "Tell me about this place.",

                  landmark:
                    "holstentor",

                  locale:
                    "en",

                  tourContext: {
                    version:
                      TOUR_CONTEXT_VERSION,

                    tourId:
                      LUBECK_HISTORIC_TOUR_ID,

                    currentStop:
                      "rathaus",

                    visitedStops:
                      [],
                  },
                }),
            },
          );

        const response =
          await POST(
            request,
          );

        expect(
          response.status,
        ).toBe(
          400,
        );

        expect(
          createCompletion,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "anchors ambiguous follow-up questions to the current stop",
      async () => {
        const request =
          new Request(
            "http://localhost/api/guide",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  question:
                    "Why is it famous?",

                  landmark:
                    "heiligen-geist-hospital",

                  locale:
                    "en",

                  history: [
                    {
                      role:
                        "user",

                      text:
                        "Why is Holstentor important?",
                    },
                    {
                      role:
                        "assistant",

                      text:
                        "Holstentor was built between 1464 and 1478.",
                    },
                  ],

                  tourContext: {
                    version:
                      TOUR_CONTEXT_VERSION,

                    tourId:
                      LUBECK_HISTORIC_TOUR_ID,

                    currentStop:
                      "heiligen-geist-hospital",

                    visitedStops: [
                      "holstentor",
                      "marienkirche",
                      "rathaus",
                    ],
                  },
                }),
            },
          );

        const response =
          await POST(
            request,
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        const groqRequest =
          createCompletion
            .mock
            .calls[0][0];

        const currentTurn =
          groqRequest.messages[
            groqRequest.messages.length -
              1
          ];

        expect(
          currentTurn.role,
        ).toBe(
          "user",
        );

        expect(
          currentTurn.content,
        ).toContain(
          "CURRENT STOP:\nHeiligen-Geist-Hospital",
        );

        expect(
          currentTurn.content,
        ).toContain(
          "CURRENT QUESTION:\nWhy is it famous?",
        );

        expect(
          currentTurn.content,
        ).toContain(
          "refer to CURRENT STOP",
        );

        /*
         * Current stop RAG evidence
         * must be available despite
         * previous-stop conversation.
         */
        const systemMessage =
          groqRequest.messages[0];

        expect(
          systemMessage.content,
        ).toContain(
          "hospital-foundation",
        );
      },
    );
  },
);