const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    name: { type: String, trim: true, maxlength: 100 },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }]
}, {
    timestamps: true
});

const UserModel = mongoose.model('user', userSchema);

module.exports = UserModel;

