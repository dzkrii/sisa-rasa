import app from './app.js';
import { jadwalkanPemeliharaan } from './demo.js';

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Sisa Rasa jalan di http://localhost:${port}`));
jadwalkanPemeliharaan();
