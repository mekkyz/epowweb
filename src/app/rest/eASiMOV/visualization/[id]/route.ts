import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const target = new URL(`/visualization/meter/${id}`, req.url);
  return NextResponse.redirect(target.toString(), { status: 307 });
}
