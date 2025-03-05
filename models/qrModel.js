import mongoose from "mongoose";

const qrSchema = new mongoose.Schema(
    {
        url: {type: String, requiered: true},
        qrCode: {type: String, requiered: true},
        scans: {type: Number, default: 0},
        tag: { type: String, required: true},
        clicks: [{ timestamp: {type: Date, default: Date.now} }],
        agendados : {type: Number, default: 0},
        fechasAgendamiento: [{type: Date}]
    }
);

const QR = mongoose.model("QR", qrSchema);

export default QR;