import mongoose from "mongoose";

const qrSchema = new mongoose.Schema(
    {
        url: {type: String, requiered: true},
        qrCode: {type: String, requiered: true},
        scans: {type: Number, default: 0},
        tag: { type: String, required: true}
    }
);

const QR = mongoose.model("QR", qrSchema);

export default QR;