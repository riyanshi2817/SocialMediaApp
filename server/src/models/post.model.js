const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    imageUrl: {
        type: String,
        required: true
    },
    imageFileId: {
        type: String,
        select: false
    },
    caption: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    style: {
        type: String,
        default: 'default'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }
}, {
    timestamps: true
});

postSchema.index({ user: 1, createdAt: -1 });

const postModel = mongoose.model('Post', postSchema);
module.exports = postModel;
