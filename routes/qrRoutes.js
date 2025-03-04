import express from "express";
import QRCode from "qrcode";
import QR from "../models/qrModel.js";

const router = express.Router();

//Crear QR (POST)
router.post("/create", async (req, res) => {
    const url = req.body.url || req.query.url; // Acepta URL desde formulario y Postman
    if (!url) return res.status(400).json({ error: "Falta la URL" });

    try {

        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const newQR = new QR({ url });
        await newQR.save();

        const trackingUrl = `${baseUrl}/qr/scan/${newQR._id}`;

        // Generar QR en formato SVG
        const svgQR = await QRCode.toString(trackingUrl, { type: "svg" });

        newQR.qrCode = svgQR; // Guardar SVG en la base de datos
        await newQR.save();

        // 🔹 Responder con JSON solo si la solicitud vino con query param
        if (req.query.url) {
            return res.status(201).json({
                message: "QR generado exitosamente",
                id: newQR._id,
                url: newQR.url,
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
      await qr.save();
  
      // Redirigir al usuario a la URL final
      res.redirect(qr.url);
    } catch (error) {
      res.status(500).json({ error: "Error al registrar escaneo" });
    }
  });
  





export default router;