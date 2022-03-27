const express = require("express");
var bodyParser = require('body-parser');
const app = express();
const path = require('path');
var fs = require('fs');
const mongoose = require('mongoose');
const moment = require('moment')
const bcrypt = require('bcrypt');
const expressEjsLayout = require('express-ejs-layouts')
const multer = require("multer");
require("dotenv").config();
const request = require("request");
const _ = require('lodash');
const { initializePayment, verifyPayment } = require("./config/paystack")(
    request
  );
  const { Donor } = require("./models/donor");
const {ensureAuthenticated} = require('./config/auth'); 
const User = require('./models/user');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require("passport");
const ejs = require('ejs');
const port = process.env.port;
require('dotenv').config({ path: path.resolve(__dirname, './config/.env') })

// set storage engine
const storage = multer.diskStorage({
    destination: './public/image/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
})

// upload file
const upload = multer({
    storage: storage,
    limits: { fileSize: 8000000 },      
    fileFilter: (req, file, cb) => {
        if ( file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            cb(null, true)
        } else {
            cb(null, true)
            return cb(new Error(' only jpg and jpeg file is valid for upload...'));
        }
    }
}).single('myImage');

app.set('view engine', 'ejs');
app.use(express.static("./public"));

app.get('/', (req, res) => {
    res.render('welcome')
});


//passport config:
require('./config/passport')(passport)
//mongoose
mongoose.connect(process.env.MONGO_URL,{useNewUrlParser: true, useUnifiedTopology : true})
.then(() => console.log('connected'))
.catch((err)=> console.log(err));

//EJS
app.set('view engine','ejs');
app.use(expressEjsLayout);
app.use(express.static(path.join(__dirname, "public")));
//BodyParser
app.use(express.urlencoded({extended : false}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("./public"));
//express session
app.use(session({
    secret : process.env.SECRET,
    resave : true,
    cookie: { maxAge: 604800000 },
    saveUninitialized : true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req,res,next)=> {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error  = req.flash('error');
    next();
    })



//ROUTING

//login page
app.get('/', (req,res)=>{
    res.render('welcome');
})
//register page
app.get('/register', (req,res)=>{
    res.render('register');
})

app.get('/services', (req,res)=>{
    const vip = "A 247 access everyday"
    const massage= "A free massage every friday"
    const always = "A 4hrs access once a day"
    const edu = "Weekly physical health class"
    const therapy = "Weekyly health threapy"

    res.render('services',{always: always, vip, massage, therapy, edu});
})

app.get('/dashboard',(req,res)=>{
// console.log("sess++++"+req.sessData.email)

  Donor.findOne({email  : req.user.email})
  .then(resultD => {
    if(resultD) {
      console.log(`Successfully found document: ${resultD}.`);
      let regType = "";
      if(resultD.amount === 1000){
        regType = "Ultimate Gymnast"
      }else if(resultD.amount === 500){
        regType = "Enthusiast Gymnast"
      }else if(resultD.amount === 100){
        regType = "Amateur Gymnast"
      }
      

      
  User.findOne({email  : req.user.email})
  .then(result => {
    if(result) {
      // console.log(`Successfully found document: ${result}.`);

      let regDate = result.date.toLocaleString()
      
      let expDate = resultD.stopTime.toLocaleString()
      res.render('dashboard',{
        user: req.user, result, resultD, regType, regDate, expDate
    });

    } else {
      console.log("No document matches the provided query.");
      res.render("error")
    }
    // return result;
  })



    } else {
      console.log("No document matches the provided query in DonorCollection.");
    }
    // return result;
  })

    
})

app.get('/paystackUlt', (req,res)=>{
  const time = new Date().toLocaleString();
    res.render('paystackUlt', {time: time});
})

app.get('/paystackPrem', (req,res)=>{
  const time = new Date().toLocaleString();
    res.render('paystackPrem', {time: time});
})

app.get('/paystackMed', (req,res)=>{
  const time = new Date().toLocaleString();
    res.render('paystackMed', {time: time});
})

app.post("/paystack/pay", (req, res) => {
  const form = _.pick(req.body, ["amount", "email", "full_name", "registration_time"]);
  form.metadata = {
    full_name: form.full_name
  };
  form.amount *= 100;
  console.log(form)

  initializePayment(form, (error, body) => {
    if (error) {
      console.log(error);
      return res.redirect("/error");
      return;
    }
    response = JSON.parse(body);
    res.redirect(response.data.authorization_url);
  });
});

app.get("/paystack/callback", (req, res) => {
  const ref = req.query.reference;
  verifyPayment(ref, (error, body) => {
    if (error) {
      console.log(error);
      return res.redirect("/error");
    }
    response = JSON.parse(body);

    const data = _.at(response.data, [
      "reference",
      "amount",
      "customer.email",
      "metadata.full_name"
    ]);

    [reference, amount, email, full_name] = data;

    newDonor = { reference, amount:amount/100, email, full_name};

    const donor = new Donor(newDonor);
    donor.save()
      .then(donor => {
        if (!donor) {
          console,log("donnor problem")
          return res.redirect("/error");
          
        }

        res.redirect("/receipt/" + donor._id);
      })
      .catch(e => {
        res.redirect("/error");
        console.log("donCant save to DBnor")
      });
  });
});

app.get("/receipt/:id", (req, res) => {
  const id = req.params.id;
  Donor.findById(id)
    .then(donor => {
      if (!donor) {
        res.redirect("/error");
      }
      const regTime = donor.time.toLocaleString();
      res.render("success.ejs", { donor, regTime });
    })
    .catch(e => {
      res.redirect("/error");
    });
});

app.get("/error", (req, res) => {
  res.render("error.ejs");
});

  app.get('/about', (req,res)=>{
    res.render('about');
})

// login handle
app.get('/login',(req,res)=>{
    res.render('login');
})

app.get('/register',(req,res)=>{
    res.render('register')
    })

    app.get('/updateUser',(req,res)=>{


        User.findOne({email  : req.user.email})
  .then(result => {
    if(result) {
        // console.log(`Successfully found document: ${result}.`);
    }
      res.render('updateUser', {result});
      console.log(req.user.name)
  })
    
})

// Register handle
app.post('/login',(req,res,next)=>{
passport.authenticate('local',{
    successRedirect : '/dashboard',
    failureRedirect: '/login',
    failureFlash : true
})(req,res,next)
})

// app.post('/login', passport.authenticate('local'), function(req, res, next) {
//     req.session.save(function (err) {
//         if (err) {
//             res.redirect('/users/login');
//         }
//         res.redirect('/dashboard');
//     });
// });

// // login route
// app.post("/login", async (req, res, next) => {
//     const body = req.body;
//     const user = await User.findOne({ email: body.email });
//     if (user) {
//       // check user password with hashed password stored in the database
//       const validPassword = await bcrypt.compare(body.password, user.password);
//       if (validPassword) {
          
//           var sessData = req.session;
//             sessData.email = body.email;
//             sessData.password = body.password;
//             // res.redirect('dashboard');
//             if(!sessData) {
                        
//                             res.redirect('/users/login');
//                         }else{
//                             return next();
                        
//                     };
//                     res.redirect('/dashboard');
//                         console.log('valid pass')
//       } else {
//         res.status(400).json({ error: "Invalid Password" });
//       }
//     } else {
//       res.status(401).json({ error: "User does not exist" });
//     }
//   });

// app.post('/login', function (req, res) {
//     User.findOne({
//         where: {
//                    email: req.body.email              
//                }
// }).then(function (user) {   
//          if (!user) {        
//                       res.redirect('/login');   
//                    } 
//          else {
//                bcrypt.compare(req.body.password, user.password, function (err, result) {  
//              if (result == true) {   
//                                   res.redirect('/dashboard');      
//                                  } else {                                                                          res.send('Incorrect password');         
// res.redirect('/');                      
//   }  
//   });   
// } 
// });
// });
  
  //register post handle
  app.post('/register',(req,res)=>{
    const  name  = req.body.name;
    const  email  = req.body.email; 
    const  password  = req.body.password 
    const  password2 = req.body.password2;
    let errors = [];
    console.log(' Name ' + name+ ' email :' + email+ ' pass:' + password);
    if(!name || !email || !password || !password2) {
        errors.push({msg : "Please fill in all fields"})
    }
    //check if match
    if(password !== password2) {
        errors.push({msg : "passwords dont match"});
    }
    
    //check if password is more than 6 characters
    if(password.length < 6 ) {
        errors.push({msg : 'password atleast 6 characters'})
    }
    if(errors.length > 0 ) {
    res.render('register', {
        errors : errors,
        name : name,
        email : email,
        password : password,
        password2 : password2})
     } else {
        //validation passed
       User.findOne({email : email}).exec((err,user)=>{
        console.log("User: "+user);   
        if(user) {
            errors.push({msg: 'email already registered'});
            res.render('register',{errors,name,email,password,password2})  
           } else {
            const newUser = new User({
                name : name,
                email : email,
                password : password
            });
            //hash password
            bcrypt.genSalt(10,(err,salt)=> 
            bcrypt.hash(newUser.password,salt,
                (err,hash)=> {
                    if(err) throw err;
                        //save pass to hash
                        newUser.password = hash;

                    //save user
                    // newUser.save()
                    // .then((value)=>{
                    //     console.log(value)
                    //     req.flash('success_msg','You have now registered!');
                    //     res.redirect('/users/login');
                    // })
                    // .catch(value=> console.log("value"));
                    newUser.save(function(err,result){
                        if (err){
                            console.log(err);
                        }
                        else{
                            console.log(result)
                            req.flash('success_msg','You have now registered!');
                        res.redirect('/login');
                        }
                    })
                      
                }));
             }
       })
    }
    })

    app.post('/upload', upload, async (req, res) => {
      upload(req, res, (err) => {
          if (err) {
              // res.render('index', {
              //     msg: err
              // });
              res.send("Image not uploaded")
          } else {
              if (req.file == undefined) {
                  // res.render('index', {
                  //     msg: 'Error : No file selected'
                  // });
                  res.send("Image not defined")
              } else {
                  // res.render('updateUser', {
                  //     msg: 'file uploaded',
                  //     file: `image/${req.file.filename}`
                  // })
                  console.log("Image uploaded")

                  var obj = {
                    img: {
                        data: fs.readFileSync(path.join(__dirname + '/public/image/' + req.file.filename)),
                        contentType: 'image/png'
                    }
                }

                console.log(obj)
                //Here send obj to DB
                try {
                  const id = req.user.id;
                  const email = req.user.email;
                  console.log(email)
                  User.findOneAndUpdate({id : id, email : email} 
                      ,  {$set:{ 
                        //Update here
                        image : obj.img
                      }}
                      ,{ new: true}
                      , (err) => {
                      if(!err){
          
                          res.redirect('/updateUser')
                          // console.log("Uploaded to DB"+img)
                          console.log('Image Updated')
          
                      }else{
                          console.log('Image not Updated')
                          
                      }
                      
                  })
                 } catch (err) {
                  console.log("computer did not try the save to db process due to errors ")
                 }
              }
          }
      })
  
  })

app.post('/updateUser', async (req, res) => {
    

    //req.body
        const name = req.body.userName;
        const email = req.body.email;
        const password = req.body.password;
        const birthDate = req.body.birthDate;
        const height = req.body.height;
        const weight = req.body.weight;

        console.log(req.body.email)
        
       try {
        const id = req.user.id;
        const email = req.user.email;
        console.log(email)
        User.findOneAndUpdate({id : id, email : email} 
            ,  {$set:{ name: name,
                email : email,
                password : password,
                birthDate : birthDate,
                height : height,
                weight : weight}}
            ,{ new: true}
            , (err) => {
            if(!err){

                // res.redirect('/updateUser')
                // console.log("Uploaded to DB"+img)
                console.log('User Updated')

            req.session.save(function (err) {
                if (err) {
                    console.log('Session Error')
                    return next(err);
                    
                }
                req.user.name = name;
            req.user.email = email;
            req.password = password;
            req.birthDate = birthDate;
            req.user.height = height;
            req.user.weight = weight;
            console.log(req.user.height)

            res.redirect('/updateUser')
            });

            }else{
                console.log('User not Updated')
                
            }
            
        })
       } catch (err) {
        console.log("computer did not try the save to db process due to errors ")
       }
})

app.get('/delete', (req, res) =>{
  const id = req.user.id;
        const email = req.user.email;
  User.findOneAndDelete({email: email || id , id }, function (err, docs) {
    if (err){
        console.log(err)
    }
    else{
      Donor.findOneAndDelete({email: email || id , id }, function (err, docs) {
        if (err){
            console.log(err)
        }else{
          res.redirect("/")
        console.log("Donor Deleted : ", docs);
        }
        
      })
      console.log("Deleted User : ", docs);
    }
      
});
})



app.get('/logout',(req,res)=>{
  req.logout();
  req.flash('success_msg','Now logged out');
  // res.redirect('/users/login');
  req.session.save(function (err) {
      if (err) {
          return next(err);
      }
      res.redirect('/login');
  }); 
  })

app.listen(port, (req, res) => {
    console.log(`your ${port} is running successfully...`);
});