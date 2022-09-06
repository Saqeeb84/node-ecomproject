var express=require('express')
var ejs=require('ejs');
var app=express();
var mysql = require('mysql');
//call by using terminal bodyparser
var bodyParser=require('body-parser');
var session=require('express-session')


app.use(express.static('public'));
app.set('view engine','ejs');
 

app.use(bodyParser.urlencoded({extended:true}));
app.use(session({secret:"secret"}))
//creating function for add_to_cart 
function isProductInCart(cart,id){
    for(let i=0; i<cart.length;i++){
        if(cart[i].id == id)
        { return true; }
    }
    return false;
}



// creating funtion for calculating
function calculateTotal(cart,req){
total=0;
for(let i=0; i<cart.length; i++){

// if thier is an offer or sale price then these if condition apply otherswise it moc=ve to else condition
    if(cart[i].sale_price){
    total=total+(cart[i].sale_price*cart[i].quantity);

}else{total=total+(cart[i].price*cart[i].quantity)}
}
 // storing in session key variable
 req.session.total=total;
 return total;
}


//calling locahost 
app.listen(8080);
app.get('/',function(req,res){

    //install npm mysql and then make connection creating tables in xampp
    var con=mysql.createConnection({
        host:"localhost",
        user:"root",
        password:"",
        database:"node_projects"
     })

     con.query("SELECT * FROM products",(err,result)=>
     {res.render('pages/index',{result:result});
    })
     
  
});
//creating url for add-to-cart
app.post('/add_to_cart',function(req,res){
var id= req.body.id;
var name=req.body.name;
var price=req.body.price;
var sale_price=req.body.sale_price;
var quantity=req.body.quantity;
var image=req.body.image;

// specific products it will in object form 
var product={id:id,name:name,price:price,sale_price:sale_price,quantity:quantity,image:image};

if(req.session.cart){
    var cart=req.session.cart;
    
    if(!isProductInCart(cart,id)){
        cart.push(product);
    }
 } else{
        req.session.cart=[product]
        var cart=req.session.cart;
    }

// calcuating  total  amount and products
calculateTotal(cart,req);

//returing to cart
res.redirect('/cart');
});

//calling funtion for calculating

app.get('/cart',function(req,res){
// we are using session because it is stored in session variable
var cart=req.session.cart;
var total=req.session.total;

res.render('pages/cart',{cart:cart,total:total});
});

// creating url for remove_product
app.post('/remove_product',function(req,res){

    var id = req.body.id;
    var cart = req.session.cart;
 
    for(let i=0; i<cart.length; i++){
       if(cart[i].id == id){
          cart.splice(cart.indexOf(i),1);
       }
    }
 
    //re-calculate
    calculateTotal(cart,req);
    res.redirect('/cart');
 
 });

 app.post('/edit_product_quantity',function(req,res){
    // get information from cart 
var id=req.body.id;
var quantity=req.body.quantity;
var increase_btn=req.body.increase_product_quantity;
var decrease_btn=req.body.decrease_product_quantity;

var cart=req.session.cart; 
// increase 
if(increase_btn){
    for(let i=0; i<cart.length; i++) {
        if(cart[i].id ==id){
            if(cart[i].quantity >0){
                cart[i].quantity = parseInt(cart[i].quantity)+1;
            }
        }
    }
}
// decrease
if(decrease_btn){
    for(let i=0; i<cart.length; i++) {
        if(cart[i].id ==id){
            if(cart[i].quantity >1){
                cart[i].quantity = parseInt(cart[i].quantity)-1;
            }
        }
    }
}


calculateTotal(cart,req);
res.redirect('/cart')
 });



 // creating checkout url for users

 app.get('/checkout',function(req,res){

    var total=req.session.total
res.render('pages/checkout', {total:total})

 })

 // creating url for handling of placing order
 app.post('/place_order',function(req,res){

var name=req.body.name;
var email=req.body.email;
var phone=req.body.phone;
var city=req.body.city;
var address=req.body.address;
var cost=req.session.total;
var status="Not Paid";
var date= new Date();
var products_ids="";
var id=Date.now();
// storing the var id=date.now session

req.session.order_id = id;
  

// making coonection with database for data storing
var con=mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"node_projects"
 })

//  session for getting  product id form cart
var cart=req.session.cart;
for (let i=0; i<cart.length; i++){
    products_ids = products_ids +","+ cart[i].id;
}

 con.connect( (err)=>{
    if(err){
        console.log(err)
    } else{
        var query="INSERT INTO orders( id,cost,name,email,status,city,address,phone,date,products_id) VALUES ?";
        var values= [
            //we are passing 2 array here 
        [id,cost,name,email,status,city,address,phone,date,products_ids] ];

        con.query(query,[values],(err,result)=>{

        for(let i=0; i<cart.length; i++){
            var query="INSERT INTO order_item(id,order_id,product_id,product_name,product_price,product_image,product_quantity,order_date) VALUES ?";
            var values= [
                //we are passing 2 array here 
            [id,cart[i].id,cart[i].name,cart[i].price,cart[i].image,cart[i].quantity,new Date()] ];

            con.query(query,[values],(err,result)=>{})
        }


            res.redirect('/payment');
        })
    }

 })

 })

 app.get('/payment',function(req,res){
    var total=req.session.total
        res.render('pages/payment',{total:total})
 })


 app.get("/verify_payment",function(req,res){
    var transaction_id = req.query.transaction_id;
    var order_id = req.session.order_id;


    //install npm mysql and then make connection creating tables in xampp

    var con=mysql.createConnection({
        host:"localhost",
        user:"root",
        password:"",
        database:"node_projects"
     })
    
 con.connect( (err)=>{
    if(err){
        console.log(err)
    } else{
        var query="INSERT INTO payments( order_id,transaction_id,date) VALUES ?";
        var values= [
            [order_id,transaction_id,new Date()]
        ]

        con.query(query,[values],(err,result)=>{
            con.query("UPDATE orders SET status='PAID' WHERE id='"+order_id+"'",(err,result)=>{})

            res.redirect('/thank_you')
        })
    }
})
 
 })


 //creating thank_you page

 app.get('/thank_you', function(req,res){
      
    var order_id = req.session.order_id
    res.render("/pages/thank_you",{order_id:order_id})
 })


 app.get('/single_product',function(req,res){

    var id =req.query.id;

    
    var con=mysql.createConnection({
        host:"localhost",
        user:"root",
        password:"",
        database:"node_projects"
     })

     con.query("SELECT * FROM products WHERE id='"+id+"'",(err,result)=>
     {res.render('pages/single_product',{result:result});
    })



 });


 app.get('/product',function(req,res){

    var con=mysql.createConnection({
        host:"localhost",
        user:"root",
        password:"",
        database:"node_projects"
     })

     con.query("SELECT * FROM products",(err,result)=>
     {res.render('pages/product',{result:result});
    })


 });


 app.get('/about',function(req,res){

    res.render('pages/about');
 });