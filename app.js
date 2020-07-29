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
const flash = require('connect-flash');
const session = require('express-session');

const stripe = Stripe('sk_test_EycwzlF2EyCNqN9vTSGieIag002Nx5vqpx');

mongoose.connect('mongodb://ahmed:0512922Ahmed1234@ds117362.mlab.com:17362/fax', {
	useNewUrlParser: true,
	useUnifiedTopology: true
}).then(() => {
	console.log('connected to database')
});

const phaxio = new Phaxio(process.env.FAX_APIKEY, process.env.FAX_APISECRET);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
	resave: false,
	secret: 'Meow',
	saveUninitialized: true
}));
app.use(flash());
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'))
app.use(morgan('dev'));

app.use(function(req, res, next){
	res.locals.success = req.session.success || '';
  	delete req.session.success;
	next();
})

app.get('/', (req, res) => {
	res.render('index3');
});

app.post('/fax', upload.single('filePDF'), async (req, res) => {
	console.log(req.file)
	const post = new Fax(req.body.post);
	post.file.data = req.file.buffer;
	post.file.contenType = req.file.mimetype;
	post.file.name = req.file.originalname;
	post.pages = 0;
	await pdfparse(post.file.data).then(data => {
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
	  text: `Fax has been sent successfully! the amount you have paid is ${amount}.00$`
	};

	transporter.sendMail(mailOptions, function(error, info){
	  if (error) {
	    console.log(error);
	  } else {
	    console.log('Email sent: ' + info.response);
	  }
	});

	req.session.success = `File has been sent successfully. The amount you have paid is ${amount}.00$ A message has been sent to your email.`
 	res.redirect('/');
	  
})


app.listen(PORT, function(){
	console.log(`server is on port ${PORT}`);
});