import express from "express";
import QRCode from "qrcode";
import QR from "../models/qrModel.js";
import { body, validationResult } from "express-validator";
import cookieParser from "cookie-parser";

const router = express.Router();
router.use(cookieParser());

//Crear QR (POST)
router.post("/create", [
    body("url").isURL().withMessage("Debe ser una URL válida"),
    body("tag").isString().notEmpty().withMessage("El tag es obligatorio"),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const url = req.body.url || req.query.url;
    const tag = req.body.tag || req.query.tag;

    if (!url || !tag) return res.status(400).json({ error: "Falta la URL o el nombre del QR" });

    try {

        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const newQR = new QR({ url, tag });
        await newQR.save();

        const trackingUrl = `${baseUrl}/qr/scan/${newQR._id}`;

        // Generar QR en formato SVG
        const svgQR = await QRCode.toString(trackingUrl, { type: "svg" });

        newQR.qrCode = svgQR; // Guardar SVG en la base de datos
        await newQR.save();

        // 🔹 Responder con JSON solo si la solicitud vino con query param
        if (req.query) {
            return res.status(201).json({
                message: "QR generado exitosamente",
                id: newQR._id,
                url: newQR.url,
                tag: newQR.tag,
                qrCode: newQR.qrCode
            });
        }

        // 🔹 Si la solicitud vino del formulario (req.body), responder sin JSON y recargar la página
        res.status(200).send("");

    } catch (error) {
        res.status(500).json({ error: "Error al generar QR" })
    }

});

// Eliminar un QR (DELETE)
router.delete("/delete", async (req, res) => {
    const { id } = req.query;

    try {
        const qr = await QR.findByIdAndDelete(id);
        if (!qr) return res.status(404).json({ error: "QR no encontrado" });

        res.json({ message: "QR eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar QR" });
    }
});

// Listar todos los QRs (GET)
router.get("/list", async (req, res) => {
    try {
        const qrs = await QR.find();
        res.json(qrs);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener QR" });
    }
});

// Ver un QR específico (GET)
router.get("/view", async (req, res) => {
    const { id } = req.query;

    try {
        const qr = await QR.findById(id);
        if (!qr) return res.status(404).json({ error: "QR no encontrado" });

        res.json(qr);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener QR" });
    }
});

//Editar un QR (PUT)
router.put("/edit", async (req, res) => {
    const { id } = req.query;
    const { url } = req.query;

    if (!id || !url) return res.status(400).json({ error: "Falta el ID o la nueva URL" });

    try {
        const qr = await QR.findById(id);
        if (!qr) return res.status(404).json({ error: "QR no encontrado" });

        // Actualizamos la URL de destino
        qr.url = url;
        await qr.save();

        res.json(qr);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar QR" });
    }
});

//Contar Escaneos y Redirigir (GET /scan/:id)

router.get("/scan/:id", async (req, res) => {
    try {
        const ahora = new Date();

        // Buscar el QR y ordenar por último click
        const qr = await QR.findById(req.params.id).sort({ "clicks.timestamp": -1 });

        if (!qr) {
            return res.status(404).json({ error: "QR no encontrado" });
        }

        // Obtener el último escaneo registrado
        const ultimoEscaneo = qr.clicks.length > 0 ? new Date(qr.clicks[qr.clicks.length - 1].timestamp).getTime() : null;
        const ahoraMS = ahora.getTime(); // Convertir a milisegundos

        // Validar que el último escaneo fue hace más de 3 segundos
        if (ultimoEscaneo && (ahoraMS - ultimoEscaneo) <= 3000) {

            return res.redirect(qr.url); // No actualiza, pero redirige
        }

        // ✅ Si pasó más de 3 segundos, registrar el escaneo
        qr.scans += 1;
        qr.clicks.push({ timestamp: ahora });
        await qr.save();

        // Registrar cookie con vigencia de 1 día
        res.cookie("qr_ref", qr._id, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, secure: false });

        // Redirigir al usuario a la URL final
        res.redirect(qr.url);
    } catch (error) {
        console.error("❌ Error en /scan/:id:", error);
        res.status(500).json({ error: "Error al registrar escaneo" });
    }
});

//Vista track de clicks

router.get("/track", async (req, res) => {
    try {
        const qrs = await QR.find().lean(); // Convertir a objeto plano para Handlebars
        res.render("track", { qrs });
    } catch (error) {
        console.error("❌ Error al cargar los datos de tracking:", error);
        res.status(500).send("Error al cargar los datos de tracking");
    }
});

//Clicks por día / mes / tag

router.get("/clicks-data", async (req, res) => {
    try {
        const { tag, month, year } = req.query;

        if (!tag || !month || !year) {
            return res.status(400).json({ error: "Se requiere un QR, mes y año." });
        }

        const qr = await QR.findOne({ tag });
        if (!qr) return res.status(404).json({ error: "QR no encontrado." });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Filtrar clics por fecha
        const clicksData = qr.clicks.filter(click =>
            new Date(click.timestamp) >= startDate && new Date(click.timestamp) < endDate
        );
        // Filtrar agendamientos por fecha
        const agendamientosData = qr.fechasAgendamiento.filter(fecha =>
            new Date(fecha) >= startDate && new Date(fecha) < endDate
        );

        // Agrupar clics por día
        const clicksByDay = {};
        clicksData.forEach(click => {
            const day = new Date(click.timestamp).getDate();
            clicksByDay[day] = (clicksByDay[day] || 0) + 1;
        });

        // Agrupar agendamientos por día
        const agendamientosByDay = {};
        agendamientosData.forEach(fecha => {
            const day = new Date(fecha).getDate();
            agendamientosByDay[day] = (agendamientosByDay[day] || 0) + 1;
        });

        const clicksByDayArray = Object.keys(clicksByDay).map(day => ({
            _id: parseInt(day),
            count: clicksByDay[day]
        }));

        const agendamientosByDayArray = Object.keys(agendamientosByDay).map(day => ({
            _id: parseInt(day),
            count: agendamientosByDay[day]
        }));

        res.json({
            clicksByDay: clicksByDayArray,
            agendamientosByDay: agendamientosByDayArray,
            clicksList: clicksData,
            agendamientosList: agendamientosData
        });

    } catch (error) {
        console.error("❌ Error al obtener datos de clics:", error);
        res.status(500).json({ error: "Error al obtener datos de clics" });
    }
});

//Confirmar recepción cookie
router.post("/confirm", async (req, res) => {
    try {
        const qrId = req.cookies.qr_ref; // Obtener el ID del QR desde la cookie

        // 🔹 Si la cookie no existe, devolver un mensaje adecuado
        if (!qrId) {
            return res.status(400).json({ message: "No hay QR registrado. No se realizó ninguna actualización." });
        }

        const qr = await QR.findById(qrId);
        if (!qr) {
            return res.status(404).json({ message: "El QR asociado no fue encontrado. No se realizó ninguna actualización." });
        }

        // ✅ Incrementar el contador de agendados y agregar la fecha actual
        qr.agendados += 1;
        qr.fechasAgendamiento.push(new Date());
        await qr.save();

        // ✅ Eliminar la cookie después de procesarla
        res.clearCookie("qr_ref");

        res.json({ message: "✅ Agendamiento confirmado y QR actualizado correctamente.", qrId });

    } catch (error) {
        console.error("❌ Error al confirmar agendamiento:", error);
        res.status(500).json({ message: "Error al confirmar agendamiento." });
    }
});




export default router;