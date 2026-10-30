export function createPreviewFetch<Environment, Context>(
  delegate: (request: Request, environment: Environment, context: Context) => Promise<Response>,
): (request: Request, environment: Environment, context: Context) => Promise<Response>;
