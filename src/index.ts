import express, { Request, Response, Express } from 'express';
import bodyParser from 'body-parser';

const PORT = 8081;

const app: Express = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'up' });
});

app.listen(PORT, async () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
