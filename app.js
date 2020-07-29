require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const morgan = require('morgan');
const PORT = process.env.PORT || 3000;
const Phaxio = require('phaxio-official');
// const Phaxio = require('phaxio');
const pdfparse = require('pdf-parse');
const mongoose = require('mongoose');
// const formidable = require('formidable');
const Fax = require('./models/fax');
const fs = require('fs');
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()});
const nodemailer = require('nodemailer');
const Stripe = require('stripe');

const stripe = Stripe('sk_test_EycwzlF2EyCNqN9vTSGieIag002Nx5vqpx');




// const braintree = require('braintree');

// var gateway = braintree.connect({
//   environment: braintree.Environment.Sandbox,
//   merchantId: process.env.BRAINTREE_MERCHANT_ID,
//   publicKey: process.env.BRAINTREE_PUBLIC_KEY,
//   privateKey: process.env.BRAINTREE_PRIVATE_KEY
// });

// const reader = new PdfReader();


mongoose.connect('mongodb://ahmed:0512922Ahmed1234@ds117362.mlab.com:17362/fax', {
	useNewUrlParser: true,
	useUnifiedTopology: true
}).then(() => {
	console.log('connected to database')
});

const phaxio = new Phaxio(process.env.FAX_APIKEY, process.env.FAX_APISECRET);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use(express.static('public'))
app.use(morgan('dev'));

app.get('/', (req, res) => {
	res.render('index3');
});

// app.post('/fax', async (req, res) => {

// 	// const newPdf = new pdfreader.PdfReader().parseFileItems("sample1.pdf", function(err, item) {
// 	//   if (err) console.log(err);
// 	//   else if (!item) console.log('Done');
// 	//   else if (item.text) return item.text;
// 	// });
// 	// console.log(newPdf)
// 	// Send a single fax containing two documents: one a URL, one from the filesystem.
// 	let form = new formidable.IncomingForm();
//         form.keepExtensions = true;
//         form.parse(req, async (err, fields, files) => {
//             if (err) {
//                 return err;
//             }
//             let post = new Fax(fields);

            
//             if (files.file) {
//                 post.file.data = await fs.readFileSync(files.file.path);
//                 post.file.contenType = await files.file.type;
//             }
//             await post.save();
//             console.log(files)
//             console.log(post.file)
//             // console.log(req.body.from) //+18773346654
// 			// console.log(req.body.to) //+18773346654
// 			// console.log(post.file.data) 

// 			phaxio.faxes.create({
// 			  from: req.body.from,
// 			  to: req.body.to, // Replace this with a number that can receive faxes.
// 			  // content_url: newPdf,
// 			  file: post.file.data,
// 			})
// 			  .then((fax) => {
// 			    // The `create` method returns a fax object with methods attached to it for doing things
// 			    // like cancelling, resending, getting info, etc.
// 			    console.log(fax);
// 			    // Wait 5 seconds to let the fax send, then get the status of the fax by getting its info from the API.
// 			    return setTimeout(() => {
// 			      fax.getInfo()
// 			    }, 5000)
// 			  }).then(status => console.log('Fax status response:\n', JSON.stringify(status, null, 2)))
// 			  .catch((err) => { throw err; });
// 			  res.redirect('/')
//     });
	
// })


app.post('/fax', upload.single('filePDF'), async (req, res) => {
	console.log(req.file)
	const post = new Fax(req.body.post);
	post.file.data = req.file.buffer;
	post.file.contenType = req.file.mimetype;
	post.file.name = req.file.originalname;
	// let dataBuffer = fs.readFileSync(post.file.name);
	post.pages = 0;
	// console.log('DATA BUFFER', dataBuffer);
	await pdfparse(post.file.data).then(data => {
		// console.log(data.numpages);
		post.pages += data.numpages;
	});

	console.log('POST PAGES', post.pages)
	
	var amount = post.pages * 1;
	post.amount = amount;

	post.save();

	const wroteFile = await fs.appendFileSync(`${post.file.name}`, post.file.data);

	console.log(`Amount: ${amount}`)
	stripe.charges.create({
	  amount: amount * 100,
	  currency: "usd",
	  source: "tok_amex", // obtained with Stripe.js
	  description: "My First Test Charge (created for API docs)"
	}, function(err, charge) {
	  // asynchronously called
	  if(err) console.log(err)
	  if(charge) console.log(charge)
	});
  		

	 
	  const toPerson = req.body.post.to;
	  console.log(`To Person, ${toPerson}`);
	phaxio.faxes.create({
	  from: req.body.post.from,
	  to: toPerson, // Replace this with a number that can receive faxes.
	  // content_url: req.file.buffer,
	  // file: fs.readFileSync(post.file.data),
	  // header_page_nums: true,
	  file: post.file.name,
	})
	  .then((faxObject) => {
	    // The `create` method returns a fax object with methods attached to it for doing things
	    // like cancelling, resending, getting info, etc.
	    console.log(faxObject);
	    return faxObject.getInfo();
	    // Wait 5 seconds to let the fax send, then get the status of the fax by getting its info from the API.
	    // return setTimeout(() => {
	    //   fax.getInfo()
	    // }, 5000)

	  })
	  .then(faxObject => console.log('Fax status response:\n', JSON.stringify(faxObject, null, 2)))
	  .catch((err) => { throw err; });

	  setTimeout(function(){
	  	fs.unlink(post.file.name, function(err){
	  		console.log('File has been deleted successfully');
	  	})
	  }, 10000);

		var transporter = nodemailer.createTransport({
		  host: 'smtp.gmail.com',
		  port: 587,
		  secure: false,
		  // requireTls: true,
		  auth: {
		    user: 'ahmedelselly87@gmail.com',
		    pass: process.env.NODEMAILER_PASSWORD
		  },
		  tls: {
		  	rejectUnauthorized: false
		  }
		});

		var mailOptions = {
		  from: 'ahmedelselly87@gmail.com',
		  to: req.body.post.email,
		  subject: 'Fax',
		  text: 'Fax has been sent successfully!'
		};

	transporter.sendMail(mailOptions, function(error, info){
	  if (error) {
	    console.log(error);
	  } else {
	    console.log('Email sent: ' + info.response);
	  }
	});
	  
	  res.redirect('/');
	  
})


app.listen(PORT, function(){
	console.log(`server is on port ${PORT}`);
});