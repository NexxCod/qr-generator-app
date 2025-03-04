import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import {engine} from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import qrRoutes from "./routes/qrRoutes.js";
import QR from "./models/qrModel.js"
import session from "express-session";
import authRoutes from "./routes/authRoutes.js";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());

// Configurar sesiones seguras
app.use(session({
    secret: process.env.SESSION_SECRET || "clave_secreta",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false } // Cambiar `secure: true` en producción con HTTPS
}));

// Middleware de autenticación para proteger el frontend
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/auth/login");
    }
    next();
};

//configuración handlebars
//handlebars
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
// app.set("views", path.join(__dirname, "/views"));
app.set("views", "./views")

//conexión mongodb
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error al conectar MongoDB", err));

//Rutas
app.use("/qr", qrRoutes);
app.use("/auth", authRoutes);

//Pagina principal con lista de QR
app.get("/", requireAuth, async (req, res) => {
    try {
        const qrs = await QR.find().lean(); 
        res.render("home", { qrs }); // Enviar los QR a la vista
    } catch (error) {
        console.error("❌ Error al obtener los QR:", error);
        res.status(500).send("Error al cargar la página");
    }
});

// Archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));