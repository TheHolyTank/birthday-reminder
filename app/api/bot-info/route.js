import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getBotUsername } from "@/lib/telegram";

export async function GET(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const username = await getBotUsername();
  return NextResponse.json({ username });
}
