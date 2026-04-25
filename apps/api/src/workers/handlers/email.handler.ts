import { env } from "../../config/env";
import { appConfig } from "../../config/app.config";

// Lazy load resend to avoid import errors during startup
let resend: any = null;

const getResendClient = async () => {
  if (!resend) {
    try {
      const { Resend } = await import("resend");
      const apiKey = appConfig.isDev
        ? env.RESEND_SANDBOX_API_KEY
        : env.RESEND_PRODUCTION_API_KEY;
      resend = new Resend(apiKey);
    } catch (error) {
      console.error("[EMAIL ERROR] Failed to initialize Resend client:", error);
      throw new Error("Email service unavailable");
    }
  }
  return resend;
};

export type EmailJobPayload = {
  to: string;
  subject: string;
  body: string;
};

export const handleEmailJob = async (input: unknown) => {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid email job payload");
  }

  const payload = input as EmailJobPayload;

  if (
    typeof payload.to !== "string" ||
    payload.to.trim() === "" ||
    typeof payload.subject !== "string" ||
    typeof payload.body !== "string"
  ) {
    throw new Error("Invalid email job payload");
  }

  const sender = appConfig.isDev
    ? "onboarding@resend.dev"
    : "noreply@yourdomain.com"; // must be verified in Resend

  const receiver = appConfig.isDev ? "bethelcollins100@gmail.com" : payload.to;

  const client = await getResendClient();
  const { data, error } = await client.emails.send({
    from: sender,
    to: [receiver],
    subject: payload.subject,
    html: payload.body,
  });

  if (error) {
    console.error("[EMAIL ERROR]", error);
    throw new Error("Failed to send email");
  }

  console.log("[EMAIL SENT]", {
    id: data?.id,
    to: receiver,
    subject: payload.subject,
  });

  return {
    status: "sent",
    to: receiver,
  };
};
