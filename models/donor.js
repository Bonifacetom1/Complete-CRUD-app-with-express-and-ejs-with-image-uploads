const { mongoose } = require("./../config/mongoose");
const moment = require('moment')

const donorSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reference: {
    type: String,
    required: true
  },
  time : { type : Date, default: Date.now },
  stopTime : {type : Date, default: moment().add(+30, 'days')}
});

const Donor = mongoose.model("Donor", donorSchema);
module.exports = { Donor };
