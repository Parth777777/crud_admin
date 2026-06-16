/**
 * Tiny helpers shared by route handlers.
 */
import type { Response } from "express";
import type { ZodSchema } from "zod";

/**
 * Validate `data` against a zod schema. On success returns the typed value.
 * On failure it writes a 400 response and returns `undefined`, so callers do:
 *
 *     const body = parse(schema, req.body, res);
 *     if (!body) return;   // validation already responded with 400
 *
 * This is the SERVER-side trust boundary — even if the client skipped its own
 * checks (or someone used curl), bad data is rejected here.
 */
export function parse<T>(schema: ZodSchema<T>, data: unknown, res: Response): T | undefined {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({
      error: "Validation failed",
      issues: result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
    return undefined;
  }
  return result.data;
}
