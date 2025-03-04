import express from "express";
import QRCode from "qrcode";
import QR from "../models/qrModel.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

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
      const qr = await QR.findById(req.params.id);
      if (!qr) return res.status(404).json({ error: "QR no encontrado" });
  
      // Incrementar el contador de escaneos
      qr.scans += 1;
      qr.clicks.push({timestamp: new Date()})
      await qr.save();
  
      // Redirigir al usuario a la URL final
      res.redirect(qr.url);
    } catch (error) {
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

        console.log("📊 Clics filtrados:", clicksData);

        // Agrupar clics por día
        const clicksByDay = {};
        clicksData.forEach(click => {
            const day = new Date(click.timestamp).getDate();
            clicksByDay[day] = (clicksByDay[day] || 0) + 1;
        });

        const clicksByDayArray = Object.keys(clicksByDay).map(day => ({
            _id: parseInt(day),
            count: clicksByDay[day]
        }));

        res.json({
            clicksByDay: clicksByDayArray,
            clicksList: clicksData
        });

    } catch (error) {
        console.error("❌ Error al obtener datos de clics:", error);
        res.status(500).json({ error: "Error al obtener datos de clics" });
    }
});




export default router;