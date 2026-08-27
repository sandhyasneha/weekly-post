import { NextResponse } from "next/server";`n`nexport async function GET(request: Request) {`n  return NextResponse.json({ message: "Hello! The API path is working!" });`n}
