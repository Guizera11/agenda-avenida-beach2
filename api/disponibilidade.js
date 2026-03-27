const { google } = require("googleapis");

export default async function handler(req, res) {
    // Credenciais da Service Account (virão das variáveis de ambiente na Vercel)
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    // Pega os eventos de hoje
    const hoje = new Date();
    const inicioDoDia = new Date(hoje.setHours(0, 0, 0, 0)).toISOString();
    const fimDoDia = new Date(hoje.setHours(23, 59, 59, 999)).toISOString();

    const resposta = await calendar.events.list({
        calendarId: "avenidabeach2@gmail.com",
        timeMin: inicioDoDia,
        timeMax: fimDoDia,
        singleEvents: true,
        orderBy: "startTime",
    });

    const eventos = resposta.data.items || [];

    // Regra: 2 ou mais eventos = bloqueado
    const disponivel = eventos.length < 2;

    res.status(200).json({
        disponivel,
        totalEventos: eventos.length,
        eventos: eventos.map((e) => ({
            titulo: e.summary,
            inicio: e.start.dateTime || e.start.date,
            fim: e.end.dateTime || e.end.date,
        })),
    });
}