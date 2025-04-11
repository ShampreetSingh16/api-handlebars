var mongoose = require('mongoose');
var Schema = mongoose.Schema;

UserSchema = new Schema({
    username:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
    },
});

module.exports = mongoose.model('Users', UserSchema);
