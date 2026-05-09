
import { http, HttpResponse } from 'msw';

export const server = // eslint-disable-next-line @typescript-eslint/no-require-imports
require('msw/node').setupServer(
  http.get('*/api/grants', () => {
    return HttpResponse.json({ data: [], total: 0 });
  })
);
