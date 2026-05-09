
import { http, HttpResponse } from 'msw';

export const server = require('msw/node').setupServer(
  http.get('*/api/grants', () => {
    return HttpResponse.json({ data: [], total: 0 });
  })
);
