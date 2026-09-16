const reply = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(body)
});

const safe = (v, n = 200) =>
  String(v ?? "")
    .replace(/[<>&"'`]/g, "")
    .trim()
    .slice(0, n);

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "Method not allowed" });
  }

  if (!process.env.RESEND_API_KEY) {
    return reply(500, { error: "RESEND_API_KEY missing" });
  }

  let d;

  try {
    d = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Invalid request" });
  }

  const name = safe(d.name, 100);
  const email = safe(d.email, 254).toLowerCase();
  const score = Number(d.score);

  if (
    !name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 100 ||
    score % 10
  ) {
    return reply(400, { error: "Invalid data" });
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fffaf0;padding:32px;text-align:center">
      <div style="color:#9b772f;font-weight:bold;letter-spacing:2px">
        UNBREAKABLE YOU
      </div>

      <h1 style="font-family:Georgia,serif">
        BE HONEST TEST™
      </h1>

      <p>Hi ${name},</p>

      <p>Your Cycle 1 challenge has been submitted.</p>

      <div style="margin:20px auto;background:#111;color:#fff;border:7px solid #d5ad58;border-radius:100%;width:140px;height:140px;line-height:140px;font-size:30px;font-weight:bold">
        ${score}/100
      </div>

      <p>
        Your final reflection is kept for tie-breaking only.
        Winner announcements will follow the challenge rules for this cycle.
      </p>

      <p>
        <b>
          Keep becoming.<br>
          Unbreakable You
        </b>
      </p>
    </div>
  `;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "The Unbreakable You <results@updates.theunbreakableyoumovement.com>",
        to: [email],
        subject: `Your BE HONEST TEST™ result — ${score}/100`,
        html
      })
    });

    const x = await r.json().catch(() => ({}));

    if (!r.ok) {
      console.error("Resend", r.status, x);
      return reply(502, { error: "Email failed" });
    }

    return reply(200, {
      ok: true,
      id: x.id
    });

  } catch (e) {
    console.error(e);
    return reply(500, { error: "Email unavailable" });
  }
};
