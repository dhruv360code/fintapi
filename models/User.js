const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: String,

    email: String,
    password: String,
    dateOfBirth: String,
    verified: Boolean,

    followers: {
        type: Array,
        default: []
    },

    followings: {
        type: Array,
        default: []
    },
    profilePicture: {
        type: String,
        default: ""
    },

    desc: {
        type: String,
        default: "",
        max: 50
    },
    city: {
        type: String,
        default: "",
        max: 50
    },

});

const User = mongoose.model('User', UserSchema);

module.exports = User;

