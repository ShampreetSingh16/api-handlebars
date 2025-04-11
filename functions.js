const express  = require('express');
const mongoose = require('mongoose');
const app = express();
const bodyParser = require('body-parser'); 

const Restaurants = require('./models/restaurants');

app.use(bodyParser.json());                                     
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); 


//function to find all data
exports.findAllRestaurants = async (req, res) => {
    try { 
      var restaurant = await Restaurants.find();
      return restaurant;
    } catch (error) {
      console.error('Error getting restaurants:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
}

//function to add a new restaurant
exports.addNewRestaurant = async (req,res)=>{
  try {
    var data = req.body;
    var newRestaurant = await Restaurants.create({
      address: {
        building: data.address.building,
        coord: data.address.coord.split(',').map(Number), 
        street: data.address.street,
        zipcode: data.address.zipcode,
      },
      borough: data.borough,
      cuisine: data.cuisine,
      grades: data.grades, 
      name: data.name,
      restaurant_id: data.restaurant_id,
    });
    return newRestaurant;
    } catch (error) {
        console.error('Error adding new restaurant:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//function to filter restaurants
exports.getAllRestaurants = async (x,y,z)=>{
  try {
    var page = x;
    var perPage = y;
    var borough = z;

    const pipelineArray = [];

    if(borough){
      pipelineArray.push({ $match : {borough: borough}});
    }

    var skip = (parseInt(page) - 1) * parseInt(perPage);
    
    pipelineArray.push({ $sort: { restaurant_id: 1 } }, { $skip: skip }, { $limit: parseInt(perPage) });
    

    const restaurants = await Restaurants.aggregate(pipelineArray);
    
    return restaurants;

   } catch (err) {
    console.error('Error getting restaurants:', err.message);
    throw { status: 404, error: 'Restaurnat not found' };
    
   }
}

//function to find restaurant by id
exports.getAllRestaurantById = async (id) => {
  try {
    var rid = id;
    var restaurant = await Restaurants.findById(rid); 
    return restaurant;
  } catch (error) {
    console.error('Error getting restaurant', error.message);
    throw { status: 404, error: 'Restaurnat not found' };
  }
}

//function to update restaurant by id
exports.updateRestaurantById = async (key,value,id) => {
  try {
    var rid = id;
    var dataToUpdate = { [key] : value };
    const updatedRestaurant = await Restaurants.findByIdAndUpdate(rid, dataToUpdate, { new: true });
    return updatedRestaurant;
  } catch (error) {
    console.error('Error updating restaurant by id:', error.message);
    throw { status: 404, error: 'Restaurant not found' };
  }
}

//function to delete restaurant by id
exports.deleteRestaurantById = async (id) => {
  try {
    var rid = id;
    var deletedRestaurant = await Restaurants.findByIdAndDelete(rid);
    return deletedRestaurant;
  } catch (error) {
    console.error('Error updating restaurant by id:', error.message);
    throw { status: 404, error: 'Restaurant not found' };
  }
}


//function to find restaurant by name
exports.getAllRestaurantByName = async (name) => {
  try {
    var rname = name;
    var restaurant = await Restaurants.findOne({name : rname}); 
    return restaurant;
  } catch (error) {
    console.error('Error getting restaurant', error.message);
    throw { status: 404, error: 'Restaurnat not found' };
  }
}

//function to update restaurant by name
exports.updateRestaurantByName = async (key,value,name) => {
  try {
    var rname = name;
    var dataToUpdate = { [key] : value };
    const updatedRestaurant = await Restaurants.findOneAndUpdate({name:rname}, dataToUpdate , { new: true });
    return updatedRestaurant;
  } catch (error) {
    console.error('Error updating restaurant by id:', error.message);
    throw { status: 404, error: 'Restaurant not found' };
  }
}