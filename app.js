//jshint esversion:6
require("dotenv").config();
var nodemailer = require('nodemailer');
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const validator = require("validator");
const { check, validationResult } = require("express-validator");
const { max } = require("lodash");
const { urlencoded } = require("body-parser");
const app = express();
var cityname;
var statename;
var requirementname;
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://echospace:Ki9W5ltBM9yM3rHL@echospace.530yv.mongodb.net/echospaceDB?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);



const userSchema = new mongoose.Schema({
  username: {
    type: String,
   
  },
  password: String,
  googleId: String,
  firstName:{
    type: String,
   
  },
  lastName:{    
    type:String,
    
  },
  uniqueString:String,
  isValid: Boolean
 
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(function (user, done) {

//   done(null, user.id);
// });

// passport.deserializeUser(function (id, done) {
//   User.findById(id, function (err, user) {
//     done(err, user);
//   });
// });
passport.serializeUser(User.serializeUser());
  
  passport.deserializeUser(User.deserializeUser());

  const randString=()=>{
    const len=8;
    let randStr='';
    for(let i=0;i<len;i++){
        const ch=Math.floor((Math.random()*10)+1);
        randStr+=ch;
    }
    return randStr;
  }
const sendMail=(username,uniqueString)=>{
  var transporter = nodemailer.createTransport({
   
    host: "mail.echospace.in",
    port: 465,
    secure: false,
      auth: {
        user: 'verification@echospace.in',
        pass: 'echospace@123'
      }
    });
    
    var mailOptions = {
      from: 'Echospace Team',
      to: username,
      subject: 'Email verification ',
      html: `Press <a href=http://localhost:3000/verify/${uniqueString}>here</a> to verify your email.`
    };
    
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
}
const sendMailreset=(username,uniqueString)=>{
  var transporter = nodemailer.createTransport({
    
    service:'gmail',
      auth: {
        user: 'thadanataruntej@gmail.com',
        pass: 'TTTARUNtej@2001'
      }
    });
    
    var mailOptions = {
      from: 'Echospace Team',
      to: username,
      subject: 'Sending Email using Node.js',
      html: `Press <a href=http://localhost:3000/reset/${username}>here</a> to verify your email.`
    };
    
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://echospace.in/auth/google/Echospace",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
        User.find({googleId:profile.id},function(err,user){
      if(!err){
        if(!user){
          User.findOrCreate({ googleId: profile.id,firstName:profile.name.givenName,lastName:profile.name.familyName,username:JSON.stringify(profile.emails)}, function (err, user) {
            return cb(err, user);
          });
        }
        else{
          passport.authenticate("local")( function (req, res) {
            res.redirect("/about");
          });
        }
      }
      else{
        console.log(err);
      }
     
    })
        
     
    }
  )
);

app.post("/register", function (req, res) {
  const randoms=randString();
  const username=req.body.username;
  const newUser=new User({
    username:req.body.username,
    uniqueString:randoms,
    isValid:false,
    password:req.body.password,
    firstName:req.body.firstName,
    lastName:req.body.lastName
});
User.register(newUser,req.body.password,async function (err,user) {
  if(err){
      return res.redirect("/register");
  }
  try{
      await sendMail(username,randoms);
      res.write('<h1>Check your email</h1>');
  }
  catch(err){
    console.log(err);
      res.redirect("/register");
  }
  
});


});

app.get('/verify/:uniqueString',async(req,res)=>{
 
  try{
      const user=await User.findOne({uniqueString:(req.params.uniqueString)});
      if(user){
          user.isValid=true;
          await user.save();  
          res.write('<h1>Email Verified , Please log in <a href="/login">here</a></h1>');   
      }
      else{
          console.log("Could not register");
          res.write('<h1>Wrong OTP, try again</h1>');
      }
  }
  catch(error){
      console.log(error);
      res.redirect("/register");
  }
  
  
});
app.get('/reset/:username',async(req,res)=>{
 
  try{
      const user=await User.findOne({username:(req.params.username)});
      if(user){
          res.redirect("/resetpassword");  
      }
      else{
          
          res.write('<h1>Could not find user</h1>');
      }
  }
  catch(error){
      console.log(error);
      res.redirect("/register");
  }
  
  
});
app.get("/resetpassword",function(req,res){
  res.render("resetpassword");
});
app.post("/resetpassword",async function(req,res,next){

  try {
    var username = req.body.username;
    var password = req.body.password;
    var user = await User.findOne({username:req.body.username});
    user.setPassword(password, (error, user) => {
        if (error) {
            return next(error);
        }
        user.save((err, user) => {
            if (error) {
                return next(error);
            }
            passport.authenticate('local', function(error, user, info) {
                console.log("error", error);
                console.log("user", user);
                console.log("info", info);
                if (error) {
                    return next(error);
                }
                if (!user) {
                    return handleError(res, "There was a problem resetting your password.  Please try again.", {error_code: 401, error_message: "There was a problem resetting your password.  Please try again."}, 401);
                }
                req.logIn(user, function(error) {
                    if (error) {
                        return next(error);
                    }
                    return res.redirect('/services');
                });
            })(req, res, next);
        });
    });
} catch(error) {
    console.error(error);
    handleError(res, error.message, "/reset");
}


 
  User.findOne({username:req.body.username},function(err,user){
    if(user){
      user.setPassword(req.body.password,function(err){
        if(!err){
          res.redirect("/login");
        }
      })
    }
  })
  
});

// app.post("/register", function (req, res) {
  
//   User.register(
//     { username: req.body.username,firstName:req.body.firstName,
//       lastName:req.body.lastName,time: new Date() },
//     req.body.password,
//     function (err, user) {
//       if (err) {
//         console.log(err);
//         res.redirect("/register");
//       } else {
//         passport.authenticate("local")(req, res, function () {
//           res.redirect("/feed");
//         });
//       }
//     }
//   );
// });

app.get("/forgot",function(req,res){
  res.render("forgot");
});
app.post("/forgot",function(req,res){
  const randoms=randString();
  const username=req.body.username;
User.findOne({username:req.body.username},async function(err,user){
  if(user){
    await sendMailreset(username,randoms);
    res.write('<h1>Check your email</h1>');
  }
  else{
    res.write('<h1>Account does not exist</h1>');
  }
})
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/about");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["https://www.googleapis.com/auth/userinfo.profile","https://www.googleapis.com/auth/userinfo.email"] })
);

app.get(
  "/auth/google/Echospace",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/about");
  }
);










app.post("/filterposts", function (req, res) {

  global.cityfilter = req.body.cityfilter;
  global.statefilter = req.body.statefilter;
  global.requirementfilter = req.body.requirementfilter;

  requirementname = requirementfilter;
  cityname = cityfilter;
  statename = statefilter;
  res.redirect("/filterposts");



});

const posthelpSchema = {
  name: String,
  age: Number,
  city: String,
  state: String,
  temperature: Number,
  count: Number,
  contact: Number,
  content: String,
  requirement: String,
  result: String,
  time: Date

};

const PostHelp = mongoose.model("PostHelp", posthelpSchema);






app.post("/post", bodyParser.urlencoded({ extended: false }), [

  check('name', 'Looks like an invalid name').isLength({ min: 3 }),
//   check('age', 'Invalid age').optional({nullable: true}).isNumeric().isLength({ max: 3 }),
  
//   check('temperature', 'Please provide a valid body temperature of the Patient').optional({nullable: true}).isNumeric().isLength({ max: 3 }),
  check('contact', 'Invalid Phone Number').isNumeric().isLength({ max: 10,min:10 }),
], function (req, res) {

  const posterrors = validationResult(req)
  if (!posterrors.isEmpty()) {
    const postalert = posterrors.array()
    res.render('post', { postalert })
  }
  else{
  const posthelp = new PostHelp({
    name: req.body.name,
    age: req.body.age,
    city: req.body.city,
    state: req.body.state,
    temperature: req.body.temperature,
    count: req.body.count,
    contact: req.body.contact,
    content: req.body.content,
    requirement: req.body.requirement,
    result: req.body.result,
    time: new Date()
  });


  posthelp.save(function (err) {
    if (!err) {
      res.redirect("feedlogout");
    }
  });
  }
});

const posthelpndcSchema = {
  name: String,
  age: Number,
  city: String,
  state: String,

  contact: Number,
  content: String,
  ndc: String,
 
  time: Date

};

const PostHelpndc = mongoose.model("PostHelpndc", posthelpndcSchema);






app.post("/post-ndc", bodyParser.urlencoded({ extended: false }), [

  check('name', 'Looks like an invalid name').isLength({ min: 3 }),
//   check('age', 'Invalid age').optional({nullable: true}).isNumeric().isLength({ max: 3 }),
  
//   check('temperature', 'Please provide a valid body temperature of the Patient').optional({nullable: true}).isNumeric().isLength({ max: 3 }),
  check('contact', 'Invalid Phone Number').isNumeric().isLength({ max: 10,min:10 }),
], function (req, res) {

  const posterrors = validationResult(req)
  if (!posterrors.isEmpty()) {
    const postalert = posterrors.array()
    res.render('post-ndc', { postalert })
  }
  else{
  const posthelpndc = new PostHelpndc({
    name: req.body.name,
    age: req.body.age,
    city: req.body.city,
    state: req.body.state,
   
    contact: req.body.contact,
    content: req.body.content,
    ndc: req.body.ndc,
  
    time: new Date()
  });


  posthelpndc.save(function (err) {
    if (!err) {
      res.redirect("feedlogout-ndc");
    }
  });
  }
});


const posthelpueSchema = {
  name: String,
  age: Number,
  city: String,
  state: String,
  contact: Number,
  content: String,
  EorS: String,
  Jyl: String,
  sector: String,
  email: String,
  time: Date

};

const PostHelpue = mongoose.model("PostHelpue", posthelpueSchema);






app.post("/post-ue", bodyParser.urlencoded({ extended: false }), [

  check('name', 'Looks like an invalid name').isLength({ min: 3 }),
//   check('age', 'Invalid age').optional({nullable: true}).isNumeric().isLength({ max: 3 }),
  
//   check('temperature', 'Please provide a valid body temperature of the Patient').optional({nullable: true}).isNumeric().isLength({ max: 3 }),
  check('contact', 'Invalid Phone Number').isNumeric().isLength({ max: 10,min:10 }),
], function (req, res) {

  const posterrors = validationResult(req)
  if (!posterrors.isEmpty()) {
    const postalert = posterrors.array()
    res.render('post-ue', { postalert })
  }
  else{
  const posthelpue = new PostHelpue({
    name: req.body.name,
    age: req.body.age,
    city: req.body.city,
    state: req.body.state,
    Jyl: req.body.Jyl,
    EorS: req.body.EorS,
    content: req.body.content,
    contact:req.body.contact,
    sector: req.body.sector,
    email: req.body.email,
    time: new Date()
  });


  posthelpue.save(function (err) {
    if (!err) {
      res.redirect("feedlogout-ue");
    }
  });
  }
});








app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function (req, res) {
  const submittedSecret = req.body.name;

  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

  Post.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.name = submittedSecret;
        foundUser.save(function () {
          res.redirect("/secrets");
        });
      }
    }
  });
});





const postServiceSchema = {
  type: String,
  pname: String,
  help: String,
  detail: String,
  city: String,
  state: String,
  phone: Number,
  time: Date
};

const PostSer = mongoose.model("PostSer", postServiceSchema);







app.post("/post-services",bodyParser.urlencoded({ extended: false }), [

  check('pname', 'Looks like an invalid name').isLength({ min: 3 }),
 check('phone', 'Invalid Phone Number').isNumeric().isLength({ max: 10,min:10 }),
], function (req, res) {

  const posterrors = validationResult(req)
  if (!posterrors.isEmpty()) {
    const postservicesalert = posterrors.array()
    res.render('post-services', { postservicesalert })
  }
  else{
  const y = req.body.help;
  const postser = new PostSer({
    type: req.body.type,
    pname: req.body.pname,
    help: req.body.help,
    detail: req.body.detail,
    city: req.body.city,
    state: req.body.state,
    phone: req.body.phone,
    time: new Date()
  });



  postser.save(function (err) {
    if (!err) {
      res.redirect("services");
    }
  });
  }
});


var servicescityname;
var servicesstatename;
var servicesrequirementname;
app.post("/filterpost-services", function (req, res) {

  global.servicescityfilter = req.body.servicescityfilter;
  global.servicesstatefilter = req.body.servicesstatefilter;
  global.servicesrequirementfilter = req.body.servicesrequirementfilter;

  servicesrequirementname = servicesrequirementfilter;
  servicescityname = servicescityfilter;
  servicesstatename = servicesstatefilter;
  res.redirect("/filterpost-services");



});

app.get("/filterpost-services", function (req, res) {
  PostSer.find({}, function (err, foundPostser) {
    res.render("filterpost-services", {
      postsers: foundPostser, servicescitysearch: servicescityname, servicesstatesearch: servicesstatename, servicesrequirementsearch: servicesrequirementname
    });
  });
});
app.get("/filterposts", function (req, res) {
  if (req.isAuthenticated()) {
  PostHelp.find({ "name": { $ne: null } }, function (err, foundPosthelp) {
    if (err) {
      console.log(err);
    } else {
      if (foundPosthelp) {
        res.render("filterpostslogout", { posthelps: foundPosthelp, citysearch: cityname, statesearch: statename, requirementsearch: requirementname });

      }
    }

  });}
  else{
    PostHelp.find({ "name": { $ne: null } }, function (err, foundPosthelp) {
      if (err) {
        console.log(err);
      } else {
        if (foundPosthelp) {
          res.render("filterposts", { posthelps: foundPosthelp, citysearch: cityname, statesearch: statename, requirementsearch: requirementname });
  
        }
      }
  
    });
  }
});

app.get("/filterpostslogout", function(req,res){
  PostHelp.find({ "name": { $ne: null } }, function (err, foundPosthelp) {
    if (err) {
      console.log(err);
    } else {
      if (foundPosthelp) {
        res.render("filterpostslogout", { posthelps: foundPosthelp, citysearch: cityname, statesearch: statename, requirementsearch: requirementname });

      }
    }

  });
})

app.get("/feed", function (req, res) {
  if (req.isAuthenticated()) {
    PostHelp.find({}, function (err, foundPosthelp) {
    res.render("feedlogout", {
      posthelps: foundPosthelp
    });
  });} else{
  PostHelp.find({}, function (err, foundPosthelp) {
    res.render("feed", {
      posthelps: foundPosthelp
    });
  });}
});

app.get("/feed-ue", function (req, res) {
  if (req.isAuthenticated()) {
    PostHelpue.find({}, function (err, foundPosthelpue) {
    res.render("feedlogout-ue", {
      posthelpues: foundPosthelpue
    });
  });} else{
  PostHelpue.find({}, function (err, foundPosthelpue) {
    res.render("feed-ue", {
      posthelpues: foundPosthelpue
    });
  });}
});
app.get("/feed-ndc", function (req, res) {
  if (req.isAuthenticated()) {
    PostHelpndc.find({}, function (err, foundPosthelpndc) {
    res.render("feedlogout-ndc", {
      posthelpndcs: foundPosthelpndc
    });
  });} else{
  PostHelpndc.find({}, function (err, foundPosthelpndc) {
    res.render("feed-ndc", {
      posthelpndcs: foundPosthelpndc
    });
  });}
});
app.get("/feedlogout", function (req, res) {
  if (req.isAuthenticated()) {
    PostHelp.find({}, function (err, foundPosthelp) {
      res.render("feed", {
        posthelps: foundPosthelp
      });
    });
  } else {
    res.redirect("/feed");
  }
});
app.get("/feedlogout-ue", function (req, res) {
  if (req.isAuthenticated()) {
    PostHelpue.find({}, function (err, foundPosthelpue) {
      res.render("feed-ue", {
        posthelpues: foundPosthelpue
      });
    });
  } else {
    res.redirect("/feed-ue");
  }
});
app.get("/feedlogout-ndc", function (req, res) {
  if (req.isAuthenticated()) {
    PostHelpndc.find({}, function (err, foundPosthelpndc) {
      res.render("feed-ndc", {
        posthelpndcs: foundPosthelpndc
      });
    });
  } else {
    res.redirect("/feed-ndc");
  }
});
app.get("/feedlogout", function (req, res) {
  PostHelp.find({}, function (err, foundPosthelp) {
    res.render("feedlogout", {
      posthelps: foundPosthelp
    });
  });
});
app.get("/feedlogout-ue", function (req, res) {
  PostHelpue.find({}, function (err, foundPosthelpue) {
    res.render("feedlogout-ue", {
      posthelpues: foundPosthelpue
    });
  });
});

app.get("/feedlogout-ndc", function (req, res) {
  PostHelpndc.find({}, function (err, foundPosthelpndc) {
    res.render("feedlogout-ndc", {
      posthelpndcs: foundPosthelpndc
    });
  });
});


app.get("/post-services", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("post-services");
  } else {
    res.redirect("/login");
  }
});

app.get("/post", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("post");
  } else {
    res.redirect("/login");
  }
});

app.get("/post-ndc", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("post-ndc");
  } else {
    res.redirect("/login");
  }
});

app.get("/post-ue", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("post-ue");
  } else {
    res.redirect("/login");
  }
});

app.get("/services", function (req, res) {
  if (req.isAuthenticated()) {
    PostSer.find({}, function (err, foundPostser) {
    res.render("services", {
      postsers: foundPostser
    });
  } );}else {
    res.redirect("/login");
  }
});

const profileSchema = new mongoose.Schema({
  user : String,
  fname: String,
  lname: String,
  city: String,
  phone: String,
  description: String
});

const UserProfile = mongoose.model("UserProfile", profileSchema);
app.get('/profile', (req,res)=> {
  if (req.isAuthenticated()) {
    let userdb = req.user;
    UserProfile.find({user : userdb.username}, (err,data) => {
      if (!err) {
        if(data.length === 0) {
          let per = new UserProfile({user: userdb.username, fname: userdb.firstName, lname: userdb.lastName});
          per.save((err)=> {
            if(err) console.error(err);
          });
          res.redirect('/profiledit');
        }
        else {
          res.render("profilepage", {
            data : data
          });
        }
      }
      else {
        console.log(err);
        res.redirect('/profiledit');
      }
    });
  }
  else {
    res.redirect('/login');
  }
});

app.get('/profiledit', (req,res) => {
  if (req.isAuthenticated()) {
    let userdb = req.user;
    UserProfile.find({user: userdb.username}, (err,data)=> {
      if (!err) {
          res.render("edit-profilepage", {
          fname : userdb.firstName,
          lname : userdb.lastName,
          username : userdb.username,
          data: data
        });
      }
      else {
              console.log(err);
              res.redirect("/");
          }
    });
  }
  else {
    res.redirect("/login");
  }
});

app.post('/profiledit/profiledata', (req,res) => {
  if (req.isAuthenticated()) {
    let userdb = req.user;
    UserProfile.update({user: userdb.username},
    {$set:{city: req.body.city, phone: req.body.phone, description: req.body.description}},{multi:false}, (err)=> {
      if (err) {
              console.log(err);
              res.status(500).send('An error occurred', err);
          }
    });
    res.redirect('/profile');
  }
  else {
    res.redirect('/login');
  }
});
app.get('/displayprofile', (req,res)=> {
  if (req.isAuthenticated()) {
    req.query.user
    UserProfile.find({_id: req.query.user}, (err,data)=>{
      if (err) {
              console.log(err);
              res.status(500).send('An error occurred', err);
      }
      else {
        if (data.length === 0) {
          res.status(404).send('NOT FOUND');
        }
        else {
          res.render("display-profile", {
            data: data
          });
        }
      }
    });
  }
  else {
    res.redirect('/login');
  }
});




app.get("/", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("aboutlogout");
  } else {
    res.render("about");
  }
});

app.get("/about", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("aboutlogout");
  } else {
    res.render("about");
  }
});



app.listen(3001);