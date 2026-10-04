const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    type: { type: String, enum: ['follow', 'like', 'comment'], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    readAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1, _id: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
