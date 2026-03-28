const { google } = require("googleapis");

const HORARIOS_SEMANA = [16, 17, 18, 19, 20, 21, 22, 23]; // seg-sex 16h às 23h (última começa 23h, termina meia-noite)
const HORARIOS_FIMDESEMANA = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]; // sáb-dom 9h às 21h

module.exports = async function handler(req, res) {
    try {
        const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");

        const auth = new google.auth.GoogleAuth({
            credentials: {
                type: "service_account",
                project_id: "feisty-vector-491600-q1",
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: privateKey,
            },
            scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        });

        const calendar = google.calendar({ version: "v3", auth });

        // Pega a data do query param ?data=2024-03-27 ou usa hoje
        const dataParam = req.query.data;
        const data = dataParam ? new Date(dataParam + "T00:00:00-03:00") : new Date();

        const diaSemana = data.getDay(); // 0=dom, 6=sáb
        const ehFimDeSemana = diaSemana === 0 || diaSemana === 6;
        const horarios = ehFimDeSemana ? HORARIOS_FIMDESEMANA : HORARIOS_SEMANA;

        const inicioDoDia = new Date(data);
        inicioDoDia.setHours(0, 0, 0, 0);
        const fimDoDia = new Date(data);
        fimDoDia.setHours(23, 59, 59, 999);

        const resposta = await calendar.events.list({
            calendarId: "avenidabeach2@gmail.com",
            timeMin: inicioDoDia.toISOString(),
            timeMax: fimDoDia.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        const eventos = resposta.data.items || [];

        // Para cada horário, conta quantas quadras estão ocupadas
        const resultado = horarios.map((hora) => {
            const ocupados = eventos.filter((e) => {
                const inicio = new Date(e.start.dateTime || e.start.date);
                const fim = new Date(e.end.dateTime || e.end.date);
                const horaInicio = hora;
                const horaFim = hora + 1;
                // Evento ocupa o horário se há sobreposição
                return inicio.getHours() < horaFim && fim.getHours() > horaInicio ||
                    (fim.getHours() === horaInicio && fim.getMinutes() > 0);
            }).length;

            return {
                hora: `${String(hora).padStart(2, "0")}:00`,
                quadrasOcupadas: ocupados,
                disponivel: ocupados < 4,
                vagasRestantes: Math.max(0, 4 - ocupados),
            };
        });

        res.status(200).json({
            data: data.toISOString().split("T")[0],
            diaSemana,
            horarios: resultado,
        });

    } catch (err) {
        res.status(500).json({
            erro: err.message,
            temEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
            temChave: !!process.env.GOOGLE_PRIVATE_KEY,
        });
    }
};