const { google } = require("googleapis");

module.exports = async function handler(req, res) {
    try {
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;

        // Tenta diferentes formas de formatar a chave
        const formattedKey = privateKey.includes("\\n")
            ? privateKey.replace(/\\n/g, "\n")
            : privateKey;

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: formattedKey,
            },
            scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        });

        const calendar = google.calendar({ version: "v3", auth });

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
    } catch (err) {
        // Retorna detalhes do erro pra facilitar debug
        res.status(500).json({
            erro: err.message,
            tipo: err.constructor.name,
            temEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
            temChave: !!process.env.GOOGLE_PRIVATE_KEY,
            inicioChave: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50)
        });
    }
};