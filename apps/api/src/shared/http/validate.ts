import type { z, ZodTypeAny } from "zod";
import { Errors } from "../domain/errors";

/** Validasi input HTTP dengan zod, lalu kembalikan data yang sudah bertipe (termasuk nilai default). */
export function parseBody<S extends ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw Errors.validation(
      "Data yang dikirim belum sesuai.",
      result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    );
  }
  return result.data;
}
