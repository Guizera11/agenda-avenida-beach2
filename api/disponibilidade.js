const { google } = require("googleapis");

const HORARIOS_SEMANA = [16, 17, 18, 19, 20, 21, 22, 23];
const HORARIOS_FIMDESEMANA = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

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

        const dataParam = req.query.data;
        const dataStr = dataParam || new Date().toISOString().split("T")[0];
        const data = new Date(dataStr + "T00:00:00-03:00");

        const diaSemana = data.getDay();
        const ehFimDeSemana = diaSemana === 0 || diaSemana === 6;
        const horarios = ehFimDeSemana ? HORARIOS_FIMDESEMANA : HORARIOS_SEMANA;

        const inicioDoDia = new Date(dataStr + "T00:00:00-03:00");
        const fimDoDia = new Date(dataStr + "T23:59:59-03:00");

        const resposta = await calendar.events.list({
            calendarId: "c0616ad1422a8d5043d11f746c51119856b41a91f9ab22d08bef667c7e5e6121@group.calendar.google.com",
            timeMin: inicioDoDia.toISOString(),
            timeMax: fimDoDia.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 50,
        });

        const eventos = resposta.data.items || [];

        // Quadras 1, 2 e 3 — horários cheios, lotado com 3 eventos
        const horariosCheios = horarios.map((hora) => {
            const ocupados = eventos.filter((e) => {
                const inicio = new Date(e.start.dateTime || e.start.date);
                const fim = new Date(e.end.dateTime || e.end.date);
                const inicioMin = (inicio.getUTCHours() - 3 + 24) % 24 * 60 + inicio.getUTCMinutes();
                const fimMin = (fim.getUTCHours() - 3 + 24) % 24 * 60 + fim.getUTCMinutes();
                const slotInicio = hora * 60;
                const slotFim = (hora + 1) * 60;
                return inicioMin < slotFim && fimMin > slotInicio;
            }).length;

            return {
                hora: `${String(hora).padStart(2, "0")}:00`,
                tipo: "cheio",
                quadrasOcupadas: Math.min(ocupados, 3),
                disponivel: ocupados < 3,
                vagasRestantes: Math.max(0, 3 - ocupados),
            };
        });

        // Quadra 4 — horários quebrados (meia hora depois), lotado com 1 evento
        const horariosQuebrados = horarios.map((hora) => {
            const slotInicio = hora * 60 + 30;
            const slotFim = slotInicio + 60;

            const ocupados = eventos.filter((e) => {
                const inicio = new Date(e.start.dateTime || e.start.date);
                const fim = new Date(e.end.dateTime || e.end.date);
                const inicioMin = (inicio.getUTCHours() - 3 + 24) % 24 * 60 + inicio.getUTCMinutes();
                const fimMin = (fim.getUTCHours() - 3 + 24) % 24 * 60 + fim.getUTCMinutes();
                return inicioMin < slotFim && fimMin > slotInicio;
            }).length;

            return {
                hora: `${String(hora).padStart(2, "0")}:30`,
                tipo: "quebrado",
                quadrasOcupadas: Math.min(ocupados, 1),
                disponivel: ocupados < 1,
                vagasRestantes: Math.max(0, 1 - ocupados),
            };
        });

        res.status(200).json({
            data: dataStr,
            diaSemana,
            horariosCheios,
            horariosQuebrados,
        });

    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
};