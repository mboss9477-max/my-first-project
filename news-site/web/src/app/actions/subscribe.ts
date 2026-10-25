"use server";

import { headers } from "next/headers";

import { addSubscriber } from "@/data";
import { clientKey } from "@/lib/client-key";

// No whitespace and no control characters (a null byte makes Postgres refuse the row).
const EMAIL_PATTERN = /^[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[^\s@\x00-\x1f\x7f]+$/;
const MAX_EMAIL_LENGTH = 254;

export type SubscribeResult =
  | { ok: true }
  | { ok: false; error: string };

export async function subscribe(
  _prevState: SubscribeResult | null,
  formData: FormData,
): Promise<SubscribeResult> {
  // Honeypot: a field real visitors never see or fill. Any value here means a
  // bot submitted the form — pretend success so it doesn't learn to adapt.
  if (formData.get("website")) {
    return { ok: true };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  // Which backend stores the address (Sanity or the CMS) is decided in the
  // data layer by CONTENT_SOURCE; this action only checks the form.
  const requestHeaders = await headers();

  return addSubscriber(email, {
    client: clientKey(requestHeaders),
    referer: requestHeaders.get("referer"),
  });
}
