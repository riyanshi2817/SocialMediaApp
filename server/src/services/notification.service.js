const Notification = require('../models/notification.model');

async function notify({ recipient, actor, type, post }) {
    if (!recipient || String(recipient) === String(actor)) return;
    try {
        await Notification.create({ recipient, actor, type, ...(post ? { post } : {}) });
    } catch (error) {
        console.error('Notification creation error:', error.message);
    }
}

module.exports = { notify };
