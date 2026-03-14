import express, { Request, Response } from "express";
import { identify } from "./identify";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "Bitespeed Identity Service is running" });
});

// POST /identify
app.post("/identify", (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body as {
      email?: string | null;
      phoneNumber?: string | number | null;
    };

    if (!email && !phoneNumber) {
      res.status(400).json({
        error: "At least one of 'email' or 'phoneNumber' must be provided.",
      });
      return;
    }

    const result = identify({ email, phoneNumber: phoneNumber?.toString() });
    res.status(200).json(result);
  } catch (err: unknown) {
    console.error("Error in /identify:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bitespeed Identity Service running on http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/identify`);
});

export default app;
