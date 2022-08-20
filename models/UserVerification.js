const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserVerificationSchema  = new Schema({
    userId: String,
    uniqueString: String,
    createdAt: Date,
    expiresAt: Date,
});

const UserVerification = mongoose.model('userVerifications', UserVerificationSchema);
module.exports = UserVerification;
