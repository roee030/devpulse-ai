const BASE_URL = 'https://serpapi.com/search.json';

export async function serpApiSearch(params) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error('Missing SERPAPI_API_KEY');

  const url = new URL(BASE_URL);
  for (const [key, value] of Object.entries({ ...params, api_key: apiKey })) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SerpApi ${params.engine} failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(`SerpApi ${params.engine} error: ${data.error}`);
  return data;
}
