"use server";

import { headers } from "next/headers";

import { addSubscriber } from "@/data";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  // Which backend stores the address (Sanity or the CMS) is decided in the
  // data layer by CONTENT_SOURCE; this action only checks the form.
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const client = forwarded || requestHeaders.get("x-real-ip") || "unknown";

  return addSubscriber(email, {
    client,
    referer: requestHeaders.get("referer"),
  });
}
