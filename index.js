require('dotenv').config();  
const express  = require('express');  
const mongoose = require('mongoose');
const app = express();
const exphbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const mongoSession = require('connect-mongodb-session')(session);
const bcrypt = require('bcryptjs');
const { validationResult , query} = require('express-validator');
const methodOverride = require('method-override');
const {  dbinitialize } = require('./config/database');
const customfunction = require('./functions');
const Restaurants = require('./models/restaurants');
const Users = require('./models/users');
const bodyParser = require('body-parser'); 

const port = process.env.PORT || 5000;
const mongoConnectionString = `mongodb+srv://shampreetsingh:${process.env.PASSWORD}@cluster0.ni41vbe.mongodb.net/sample_restaurants`;


app.use(express.static(path.join(__dirname, 'public'))); 
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs.engine({ extname: '.hbs' , runtimeOptions: {
  allowedProtoMethods:true,
  allowProtoPropertiesByDefault:true,
  allowedProtoProperties:true
}})); 
app.set('view engine', 'hbs');


const store = new mongoSession({
  uri:mongoConnectionString,
  collection:'sessions',
});

app.use(session({
  secret:process.env.SECRET_KEY,
  resave:false,
  saveUninitialized:false,
  name:'clientCookie',
  cookie:{httpOnly:true},
  store:store,
}))

app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({'extended':'true'}));           
app.use(bodyParser.json());                                     
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); 



const isAuthenticated= (req,res,next)=>{
  if(req.session.user){
    next()
  }else{
    return res.render('login', { error: 'You are not logged!' });
  }
}

app.get('/register', (req, res) => {
  res.render('register', { title: 'Register' , showNav: false});
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await Users.findOne({ email });

    if (existingUser) {
      return res.render('register', { error: 'Email is already in use' });
    }

    const encryptedPassword = await bcrypt.hash(password,10);

    const newUser = new Users({
      username,
      email,
      password: encryptedPassword,
    });

    await newUser.save();

    res.redirect('/');
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).render('register', { error: 'Internal server error' });
  }
});


app.get('/',(req,res)=>{
  res.render('login', { title: 'Login' , showNav: false , error : req.query.errorMessage});
});

app.post('/login', async (req, res) => {
  try {
      const { email, password } = req.body;
      let user = await Users.findOne({ email });

      if (!user) {
          return res.render('register', { title: 'Error', error: 'User not found' });
      }

      const check = await bcrypt.compare(password, user.password);

      if (!check) {
          return res.render('login', { title: 'Error', error: 'Wrong Credentials' });
      }

      req.session.user = {
        id:user._id,
        email:user.email,
      };

      res.redirect('/restaurants/search');

  } catch (err) {
      res.render('error', { title: 'Error', message: 'Wrong Route' });
  }
});


app.get('/logout',async(req,res)=>{
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).render('error', { title: 'Error', message: 'Internal server error' });
    }
    res.redirect('/');
  });
});


app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    var response = await customfunction.findAllRestaurants();
    if(response){
      res.render('allData', { 
      data: response,
      showNav: true,
    });
    }else{
      res.render('error', { title: 'Error', message:'Wrong Route' });
    } 
  } catch (err) {
    console.error(err);
    return res.status(404);
  } 
});


app.get('/restaurants/add',isAuthenticated,(req,res)=>{
  res.render('addForm', { title: 'Add', showNav: true});
});

app.post('/restaurants/add', isAuthenticated,async (req, res) => {
  try {
    const newRestaurant = await customfunction.addNewRestaurant(req, res);
    console.log('Successfully Created');
    console.log(newRestaurant); 
    if(newRestaurant){
    return res.status(201).render('addForm', { successMessage: 'Restaurant added successfully!' , showNav: true});
    }else{
      return res.status(400).render('addForm', { error: 'Error adding restaurant',showNav: true });
    }
  } catch (error) {
    console.error('Error adding new restaurant:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
 

app.get('/api/restaurants/search',[ 

  query('page').notEmpty().isInt(),
  query('perPage').notEmpty().isInt(),
  query('borough').optional(),

],async (req, res) => {
  try {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    var page = req.query.page;
    var perPage = req.query.perPage;
    var borough = req.query.borough;
    var response = await customfunction.getAllRestaurants(page, perPage, borough);
    console.log(response);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting restaurants:', error.message);
    res.status(404).json({ error: 'Restaurant not found' ,showNav: true});
  }
});



app.get('/restaurants/search',isAuthenticated,(req,res)=>{
  res.render('filteredData', { title: 'Filter', showNav: true});
});

app.post('/restaurants/search',isAuthenticated,async (req, res) => {
  try {

    var page = req.body.page;
    var perPage = req.body.perPage;
    var borough = req.body.borough;
    var response = await customfunction.getAllRestaurants(page, perPage, borough);
    if(response){
      res.render('filteredData', { 
      data: response,
      showNav: true,
    });
    }else{
      res.render('filteredData', {error:'Unable to found' });
    } 
  } catch (error) {
    console.error('Error getting restaurants:', error.message);
    res.status(404).render('filteredData', {error:'Unable to found',showNav: true});;
  }
});





app.get('/restaurants/search/id',isAuthenticated,(req,res)=>{
  res.render('searchById', { title: 'SearchByIdr', showNav: true});
});


app.post('/restaurants/search/id',isAuthenticated, async (req, res) => {
  try {
    var id = req.body.id;
    var response = await customfunction.getAllRestaurantById(id);  
    if(response){
      res.render('searchById', { 
      data: response,
      showNav: true,
    });
    }else{
      res.render('searchById', {error:'Unable to found restaurant with that ID no' ,showNav: true});
    } 
  } catch (error) {
    console.error('Error getting restaurant by id:', error.message);
    res.status(404).render('searchById', {error:'Unable to found restaurant with that ID no' ,showNav: true});
  }
});



app.get('/restaurants/update',isAuthenticated,(req,res)=>{
  res.render('updateData', { title: 'Update', showNav: true});
});


app.post('/restaurants/update', isAuthenticated,async (req, res) => {
  try {
    var id = req.body.id;
    var response = await customfunction.getAllRestaurantById(id);  
    if(response){
      res.render('updateData', { 
      data: response,
      showNav: true,
    });
    }else{
      res.render('updateData', {error:'Unable to found restaurant with that ID no' ,showNav: true});
    } 
  } catch (error) {
    console.error('Error getting restaurant by id:', error.message);
    res.status(404).render('updateData', {error:'Unable to found restaurant with that ID no',showNav: true});
  }
});


app.put('/restaurants/update/:id', isAuthenticated,async (req, res) => {
  try {
    var id = req.params.id;
    var key = req.body.key;
    var value = req.body.value;
    var response = await customfunction.updateRestaurantById(key,value,id);
    if(response){
      res.render('updateData', { 
      data: response,
      showNav: true,
    });
    }else{
      res.render('updateData', {error:'Unable to update restaurant with that ID no',showNav: true});
    } 
  } catch (error) {
    console.error('Error getting restaurant by id:', error.message);
    res.status(404).render('updateData', {error:'Unable to update restaurant with that ID no' ,showNav: true});
  }
});


app.get('/restaurants/delete',isAuthenticated,(req,res)=>{
  res.render('deleteData', { title: 'Delete', showNav: true});
});

app.delete('/restaurants/delete',isAuthenticated, async (req, res) => {
  try {
    var id = req.body.id;
    var result = await customfunction.deleteRestaurantById(id);
    if(result){
      return res.status(201).render('deleteData', { successMessage: 'Restaurant deleted successfully!',showNav: true});
      }else{
        return res.status(400).render('deleteData', { error: 'Error deleting restaurant' ,showNav: true});
      }
  } catch (error) {
    console.error('Error getting restaurant by id:', error.message);
    res.status(404).render('deleteData', {error:'Unable to found restaurant with that ID no' ,showNav: true});
  }
});


app.get('/restaurants/search/name',isAuthenticated,(req,res)=>{
  res.render('searchByName', { title: 'SearchByName', showNav: true});
});


app.post('/restaurants/search/name',isAuthenticated, async (req, res) => {
  try {
    var name = req.body.rname;
    var response = await customfunction.getAllRestaurantByName(name);  
    if(response){
      res.render('searchByName', { 
      data: response,
      showNav: true,
    });
    }else{
      res.render('searchByName', {error:'Unable to found restaurant with that name',showNav: true });
    } 
  } catch (error) {
    console.error('Error getting restaurant by id:', error.message);
    res.status(404).render('searchByName', {error:'Unable to found restaurant with that name' ,showNav: true});
  }
});


app.get('/restaurants/update/name',isAuthenticated,(req,res)=>{
  res.render('updateByName', { title: 'updateByName', showNav: true});
});


app.post('/restaurants/update/name',isAuthenticated, async (req, res) => {
  try {
    var name = req.body.rname;
    var response = await customfunction.getAllRestaurantByName(name);  
    if(response){
      res.render('updateByName', { 
      data: response,
      showNav: true,
    });
    }else{
      res.render('updateByName', {error:'Unable to found restaurant with that name' ,showNav: true});
    } 
  } catch (error) {
    console.error('Error getting restaurant by id:', error.message);
    res.status(404).render('updateData', {error:'Unable to found restaurant with that name' ,showNav: true});
  }
});

app.put('/restaurants/update/name/:name',isAuthenticated,async (req, res) => {
  try {
    var name = req.params.name;
    var key = req.body.key;
    var value = req.body.value;
    var response = await customfunction.updateRestaurantByName(key,value,name);
    if(response){
      res.render('updateByName', { 
      data: response,
      showNav: true,
    });
    }else{
      res.render('updateByName', {error:'Unable to update restaurant with that name',showNav: true });
    } 
  } catch (error) {
    console.error('Error getting restaurant by id:', error.message);
    res.status(404).render('updateData', {error:'Unable to update restaurant with that name' ,showNav: true});
  }
});

app.get('*',async(req,res)=>{
  res.status(404).render('wrongRoute', {title:'Bad Request'});
});



dbinitialize(mongoConnectionString)
.then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
})
.catch((error) => {
  console.error('Failed to initialize MongoDB:', error);
});
