import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { subgroupId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { subgroupId } = params;

    const response = await fetch(`http://localhost:3001/api/subgroups/${subgroupId}/members`, {
      headers: {
        'Authorization': authHeader || '',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'プロキシエラーが発生しました' },
      { status: 500 }
    );
  }
}