import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'phoneyard-api', time: new Date().toISOString() })
);

app.get('/api/admin/export', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({ error: 'Use a privileged server-side Supabase export job.' });
  }
  res.json({
    message:
      'Export endpoint placeholder. Production exports must run with a service-role key on the server, never in the browser.',
  });
});

app.listen(process.env.PORT || 3001, () =>
  console.log(`Phoneyard API running on ${process.env.PORT || 3001}`)
);
