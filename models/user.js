const mongoose = require('mongoose');
const UserSchema  = new mongoose.Schema({
  name :{
      type  : String,
      required : false
  } ,
  image :{
    data  : Buffer,
    contentType : String
} ,
  email :{
    type  : String,
    required : true
} ,
password :{
    type  : String,
    required : true
} ,
birthDate :{
    type  : String,
    required : false
} ,
height :{
    type  : Number,
    required : false
} ,
weight :{
    type  : Number,
    required : false
} ,
date :{
    type : Date,
    default : Date.now
}
});
const User= mongoose.model('User',UserSchema);

module.exports = User;