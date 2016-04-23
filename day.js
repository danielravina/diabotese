mongoose = require('mongoose');
findOneOrCreate = require('mongoose-find-one-or-create');

DaySchema = mongoose.Schema({
  day: String,
  checks: [],
  injections: [],
  food: []
})

DaySchema.plugin(findOneOrCreate)
var model = mongoose.model('Day', DaySchema);

module.exports = model
