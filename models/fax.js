const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const faxSchema = new Schema({
	name: String,
	from: Number,
	to: Number,
	file: {
		data: Buffer,
		contenType: String
	},
	pages: Number,
	amount: Number,
	email: String
});

module.exports = mongoose.model('Fax', faxSchema);