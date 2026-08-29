"use server";

import { headers } from "next/headers";

import { writeClient } from "@/sanity/client";

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

  let client;
  try {
    client = writeClient();
  } catch {
    // Server Functions are reachable directly, not just through this form, so
    // a missing token must fail closed rather than silently no-op.
    return {
      ok: false,
      error: "Signups are not open yet — please try again later.",
    };
  }

  const existing = await client.fetch<string | null>(
    `*[_type == "newsletterSubscriber" && email == $email][0]._id`,
    { email },
  );

  if (existing) {
    // Already on the list — this is success from the visitor's point of view.
    return { ok: true };
  }

  const referer = (await headers()).get("referer");
  const source = referer ? new URL(referer).pathname : null;

  await client.create({
    _type: "newsletterSubscriber",
    email,
    subscribedAt: new Date().toISOString(),
    source,
  });

  return { ok: true };
}
