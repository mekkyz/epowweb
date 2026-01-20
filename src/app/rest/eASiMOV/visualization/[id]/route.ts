import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const target = new URL(`/visualization/meter/${params.id}`, req.url);
  return NextResponse.redirect(target.toString(), { status: 307 });
}
