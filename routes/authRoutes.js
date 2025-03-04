import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";

const router = express.Router();

// Endpoint para registrar usuarios (requiere clave secreta en el body)
router.post("/register", async (req, res) => {
    const { username, password, secretKey } = req.body;

    if (secretKey !== process.env.REGISTER_SECRET) {
        return res.status(403).json({ error: "Clave secreta incorrecta" });
    }

    if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "El usuario ya existe" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "Usuario registrado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar usuario" });
    }
});

// Página de login
router.get("/login", (req, res) => {
    res.render("login");
});

// Endpoint para manejar el login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.render("login", { error: "Usuario o contraseña incorrectos" });
        }

        req.session.user = { username: user.username };
        res.redirect("/");
    } catch (error) {
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
});

// Logout
router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

export default router;
