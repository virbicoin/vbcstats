import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ip = searchParams.get('ip');

  if (!ip) {
    return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
  }

  try {
    // Validate IP address format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
      return NextResponse.json({ error: 'Invalid IP address format' }, { status: 400 });
    }

    // Skip private IP addresses
    const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|0\.0\.0\.0|255\.255\.255\.255)/;
    if (privateIpRegex.test(ip)) {
      return NextResponse.json({ error: 'Private IP address not supported' }, { status: 400 });
    }

    // Dynamic import to avoid build-time issues
    let geo = null;
    try {
      const geoip = await import('geoip-lite');
      geo = geoip.default.lookup(ip);
    } catch (geoError) {
      console.error('GeoIP module load error:', geoError);
      return NextResponse.json({ error: 'GeoIP service unavailable' }, { status: 503 });
    }
    
    if (geo && geo.ll && geo.ll.length === 2) {
      const [latitude, longitude] = geo.ll;
      return NextResponse.json({
        ip,
        latitude,
        longitude,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone
      });
    } else {
      return NextResponse.json({ error: 'Location not found for this IP' }, { status: 404 });
    }
  } catch (error) {
    console.error('GeoIP lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
