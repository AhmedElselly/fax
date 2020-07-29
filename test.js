const fs = require('fs');
// const fileName = new URL('./sample1.pdf')
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('sample1.pdf');

pdf(dataBuffer).then(data => {
	console.log(data.numpages);
})

// new pdfreader.PdfReader().parseFileItems("sample1.pdf", function(err, item) {
//   if (err) console.log(err);
//   else if (!item) console.log('Done');
//   else if (item.text) console.log(item.text);
// });