const express = require("express")
const port = process.env.PORT || 3000
const app = express()
app.set("view engine", "ejs")
app.use(express.static("public"))
const session = require("express-session")
const {authUser, authRole} = require("./simpleAuth")
// initialize express-session to allow us track the logged-in user across sessions.
app.use(
	session({
		key: "user_sid",
		secret: "somerandonstuffs",
		resave: false,
		saveUninitialized: false,
		cookie: {
			expires: 600000,
		},
	})
)

const MongoClient = require("mongodb").MongoClient
const bodyParser = require("body-parser")
MongoClient.connect("mongodb+srv://ivan:!Joni1852!@cluster0.vb8as.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", { useUnifiedTopology: true }).then(client => {
	console.log("Connected to Database")
	app.use(bodyParser.urlencoded({ extended: true }))

	// GET functions
	app.get("/", (req, res) => {
		res.render("Homepage")
		res.status(200)
	})
	
	app.get("/Login", (req, res) => {
		res.render("Login")
	})
	
	app.get("/contributers", (req, res) => {
		res.render("contributers_page")
	})
	
	app.get("/CompanyWorkerHomepage", authUser, authRole("Company Worker"), (req, res) => {
		res.render("CompanyWorkerHomepage")
	})

	app.get("/recruiters_home_page", authUser, authRole("Recruiter"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		
		db_collection.find().toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				res.render("recruiters_home_page", {details: allDetails})
			}
		})
	})

	
	app.get("/Register", (req, res) => {
		res.render("Register")
	})
	
	app.get("/add_new_contractor_worker", authUser, authRole("Company Worker"), (req, res) => {
		res.render("add_new_contractor_worker")
	})
	
	app.get("/monitor_of_all_hires", authUser, authRole("Company Worker"), (req, res) => {
		res.render("monitor_of_all_hires")
	})
	
	app.get("/statistics", authUser, authRole("Company Worker"), (req, res) => {
		res.render("statistics")
	})
	
	app.get("/shifts_monitor", authUser, authRole("Company Worker"), (req, res) => {
		res.render("shifts_monitor")
	})
	
	app.get("/why_us_page", (req, res) => {
		res.render("why_us_page")
	})
	
	app.get("/contractor_worker_home_page", authUser, authRole("Contractor Worker"), (req, res) => {
		res.render("contractor_worker_home_page")
	})
	
	app.get("/contractor_worker_my_profile/:id", authUser, authRole("Company Worker"), (req, res) => {
		// Connect contractor workers db and collection
		var db =client.db("contractor-workers")
		var	db_collection = db.collection("contractorWorkers")
		db_collection.find({"id": req.params.id}).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else{
				res.render("contractor_worker_my_profile", {details: allDetails})
			}
		})	
	})

	app.get("/contractor_worker_edit_profile", authUser, authRole("Contractor Worker"), (req, res) => {
		res.sendFile("contractor_worker_edit_profile")
	})

	app.get("/careers", (req, res) => {
		res.render("careers_page")
	})
	
	app.get("/contact_us", (req, res) => {
		res.render("contact_us_page")
	})
	app.get("/contractor_pay_rates", authUser, authRole("Recruiter"), (req, res) => {
		res.render("contractor_pay_rates")
	})

	app.get("/search_contractor_worker", authUser, authRole("Company Worker"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		
		db_collection.find().toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				res.render("search_contractor_worker", {details: allDetails})
			}
		})
	})

	app.get("/delete/:id", authUser, authRole("Company Worker"), (req,res)=>{
		// Connect contractor workers db and collection
		var db =client.db("contractor-workers")
		var	db_collection = db.collection("contractorWorkers")
		var myquery = { id: req.params.id }

		if(db_collection){
			// Deleting contractor worker from collection contractorWorkers
			db_collection.deleteOne(myquery, function(err, obj) {
				if (err) throw err
				return obj
			})
			res.redirect("/search_contractor_worker")
		}
		
		db_collection = db.collection("contractorWorkersLogin")
		if(db_collection){
			// Deleting contractor worker from collection contractorWorkersLogin
			db_collection.deleteOne(myquery, function(err, obj) {
				if (err) throw err
				return obj
			})
		}
	})


	app.get("/contractor_worker_profile/:id", authUser, authRole("Company Worker"), (req,res) => {
		// Connect contractor workers db and collection
		var db =client.db("contractor-workers")
		var	db_collection = db.collection("contractorWorkers")
		db_collection.find({"id": req.params.id}).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else{
				res.render("contractor_worker_my_profile", {details: allDetails})
			}
		})		
	})

	app.get("/hire_contractor/:id", (req, res) => {
		res.render("hire_contractor",{"id":req.params.id})
	})


	// POST functions
	app.post("/auth", (req, res) => {
		var user_name = req.body.Email_Address
		var passwordd = req.body.pass
		var userType = req.body.user_type
		var homepage_name=null
		var db_collection = null
		var db = null
		var type = null

		switch(userType)
		{
		case "Company Worker":
			db = client.db("human-resources-workers")
			db_collection = db.collection("humanResourcsesWorkersLogin")
			homepage_name = "CompanyWorkerHomepage"
			type = "Company Worker"
			break
		case "Contractor Worker":
			db =client.db("contractor-workers")
			db_collection = db.collection("contractorWorkersLogin")
			homepage_name = "contractor_worker_home_page"
			type = "Contractor Worker"
			break
		case "Employee":
			db = client.db("employers-workers")
			db_collection = db.collection("employersWorkersLogin")
			homepage_name = "recruiters_home_page"
			type = "Recruiter"
			break
		}

		if(db_collection){
			db_collection.find({"user":user_name , "password":passwordd}).toArray(function (err, users) {
				if (users.length  == 1)
				{
					console.log(users[0])
					req.session.user = {
						"id": users[0].id,
						"type": type
					}
					res.redirect("/" + homepage_name)
				}

				else
				{
					console.log("User Not Exist! \n")
					res.redirect("/Login")
				}
			})
		}
		
		else{res.redirect("/Login")}
	})

	app.post("/add_contractor", (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		var contractor_id = req.body.id
		var first_name = req.body.first_name
		var last_name = req.body.last_name
		var hourly_pay = req.body.hourly_pay
		var city = req.body.city
		var home = req.body.home
		var phone_number = req.body.phone_number
		var email = req.body.email
		var gender = req.body.radio
		var skills = req.body.skills
		var username = first_name + "_" + last_name + "@contractor.sce"
		var password =(Math.floor(1000000 + Math.random() * 9000000)).toString()
		var data = null
		
		if(db_collection){
			// Check if the id belongs to another user
			db_collection.find({"id": contractor_id}).count().then(function(numItems) {
				console.log(numItems)
				if(numItems){
					console.log("There is an existing user with this ID, please try to restore your password if you already have a user")
					
					res.redirect("/add_new_contractor_worker")
				}
				// If there is not a user with that ID
				else {
					// Check if the user name is already taken
					db_collection.find({"first_name": first_name, "last_name": last_name}).count().then(function(numItems) {
						console.log(numItems)
						if(numItems){
							username = first_name + "_" + last_name + numItems + "@contractor.sce"
						}
						data ={
							"id": contractor_id,
							"first_name": first_name,
							"last_name": last_name,
							"hourly_pay": hourly_pay,
							"city": city,
							"home": home,
							"phone_number": phone_number,
							"email": email,
							"gender": gender,
							"skills": skills,
							"user": username,
							"password": password
						}
						// Add a new contractor worker to "contractorWorkers" collection with all of his information
						db_collection.insertOne(data, function (err, collection) {
							if (err) {
								throw err
							}
							console.log("Record inserted Successfully" + collection.insertedCount)
						})

					})
					// Add a new contractor worker to "contractorWorkersLogin" db with his username and password only
					var db_collection_login = db.collection("contractorWorkersLogin")
					data ={
						"id": contractor_id,
						"user": username,
						"password": password
					}
					db_collection_login.insertOne(data, function (err, collection) {
						if (err) {
							throw err
						}
						console.log("Record inserted Successfully" + collection.insertedCount)
					})
					res.redirect("/CompanyWorkerHomepage")
				}
			})
			
		}
		
	})


	app.post("/Register_New_Employee", (req, res) => {

		var db = client.db("employers-workers")
		var db_collection = db.collection("employersWorkers")
		var first_name = req.body.first_name
		var last_name = req.body.last_name
		var gender = req.body.radio
		var email = req.body.email
		var phone_number = req.body.phone
		var company_name = req.body.companyName
		var username = first_name + "_" + last_name + "@" + company_name + ".sce"
		var password = (Math.floor(1000000 + Math.random() * 9000000)).toString()
		var data = null
		// Check if the user name is already taken
		if(db_collection){
			db_collection.find({"first_name": first_name, "last_name": last_name}).count().then(function(numItems) {
				console.log(numItems)
				if(numItems){
					username = first_name + "_" + last_name + numItems + "@" + company_name + ".sce"
				}
				data ={
					"first_name": first_name,
					"last_name": last_name,
					"gender": gender,
					"email": email,
					"phone_number": phone_number,
					"company_name": company_name,
					"user": username,
					"password": password
				}
				// Add a new contractor worker to "contractorWorkers" collection with all of his information
				db_collection.insertOne(data, function (err, collection) {
					if (err) {
						throw err
					}
					console.log("Record inserted Successfully" + collection.insertedCount)
				})
				
			})
		}
		var db_collection_login = db.collection("employersWorkersLogin")
		data ={
			"user": username,
			"password": password
		}
		db_collection_login.insertOne(data, function (err, collection) {
			if (err) {
				throw err
			}
			console.log("Record inserted Successfully" + collection.insertedCount)
		})
		res.redirect("/Login")
	})
	

	// POST function for search in a human resources pages
	app.post("/filter_search", (req, res) => {
		var skill = req.body.skill
		var hourly_pay = req.body.hourly_pay
		var city = req.body.city
		// Connect contractor workers db and collection
		var db =client.db("contractor-workers")
		var	db_collection = db.collection("contractorWorkers")
		
		if(db_collection){
			// If the company worker didn't filled any of the filed then show all of the exsiting contractor workers
			if(skill == "" && hourly_pay == "" && city == ""){
				db_collection.find().toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", {details: allDetails})
					}
				})
			}
			// If the company worker filled all 3 criterions then search all the contractor workers that fits
			else if (skill && hourly_pay && city) {
				db_collection.find({"skills": skill, "hourly_pay": hourly_pay, "city": city}).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", {details: allDetails})
					}
				})
			}
			else {
				res.render("search_contractor_worker", {details: null})
			}
			
		}
	})

	app.post("/filter_search_by_recruiter", (req, res) => {
		var skill = req.body.skill
		var hourly_pay = req.body.hourly_pay
		var city = req.body.city
		// Connect contractor workers db and collection
		var db =client.db("contractor-workers")
		var	db_collection = db.collection("contractorWorkers")
		
		if(db_collection){
			// If the company worker didn't filled any of the filed then show all of the exsiting contractor workers
			if(skill == "" && hourly_pay == "" && city == ""){
				db_collection.find().toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("recruiters_home_page", {details: allDetails})
					}
				})
			}
			// If the company worker filled all 3 criterions then search all the contractor workers that fits
			else if (skill && hourly_pay && city) {
				db_collection.find({"skills": skill, "hourly_pay": hourly_pay, "city": city}).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("recruiters_home_page", {details: allDetails})
					}
				})
			}
			else {
				res.render("recruiters_home_page", {details: null})
			}
			
		}
	})

	app.post("/hire", (req, res) => {
		var id_of_contractor = req.body.contractor_id
		var id_of_recruiter =  req.session.user.id
		var date = req.body.date_of_hire
		var start = req.body.Start_work
		var end = req.body.end_work

		
		var db =client.db("contractor-workers")
		var	db_collection = db.collection("contractorWorkers")
		if(db_collection){
			db_collection.find({"id": id_of_contractor}).toArray(function (err, allDetails) {
				if (err) {
					console.log(err)
				}
				else {
					try {
						var day
						var temp=allDetails[0].not_able_to_work
						for(day of temp)
						{

							if(day[0] == date)
							{
								console.log("cant' hire in this day!")
								res.redirect("back");
								
							}
						
						}
						
						var job
						var contractor_hiring = allDetails[0].hiring
						for(job of contractor_hiring)
						{
							if(job[0] == date && job[3] == id_of_recruiter)
							{
								console.log("cant hire twice by same recruiter!\n")
								res.redirect("back")
								
							}
						}

						db_collection.updateOne({"id":id_of_contractor},{$push:{hiring:[date,start,end,id_of_recruiter]}})

						db =client.db("employers-workers")
						db_collection = db.collection("employersWorkers")
						db_collection.updateOne({"id":id_of_recruiter},{$push:{hiring:[date,start,end,id_of_contractor]}})
						res.redirect("/recruiters_home_page")
					} catch (error) {
						console.log("Ad matay????")
					}
				}
			})
		}
	})


}).catch(console.error)




app.listen(port, () => {
	console.log("Listening to port 3000!!!")
})





//var data = {
//	"user": user_name,
//	"password": passwordd
//}
//console.log(data)
//loginData.insertOne(data, function (err, collection) {
//	if (err) {
//		throw err
//	}
//	console.log("Record inserted Successfully" + collection.insertedCount)
//})





//var dbo = client.db("login-auth")
//dbo.collection("loginData").find({"user":user_name , "password":passwordd}).count().then(function(numItems) {
//	console.log("Number of items:",numItems) // Use this to debug
//	if (numItems  == 1)
//	{
//		res.sendFile(__dirname + "/loggedIn.html")
//	}
//	else
//	{
//		console.log("User Not Exist! \n")
//		res.render("Login")
//	}
//})